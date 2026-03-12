// WebRTC service — manages peer connections for voice/video calls.
// Uses dynamic import for react-native-webrtc so the app works even when the package
// is not installed (all methods become graceful no-ops with __DEV__ logging).
//
// When react-native-webrtc IS available: full RTCPeerConnection setup, ICE candidate
// handling, offer/answer exchange, and local/remote media stream management.
// When it is NOT available: all methods are safe no-ops that simulate the call flow.

import {
  socketService,
  type CallType,
} from './socketService';
import { WS_EVENTS } from '@luma/shared/src/constants/api';

// Re-export types from the module declaration for internal use.
// These are resolved via apps/mobile/src/types/declarations.d.ts.
import type {
  RTCPeerConnection as RTCPeerConnectionClass,
  RTCSessionDescription as RTCSessionDescriptionClass,
  RTCIceCandidate as RTCIceCandidateClass,
  RTCIceCandidateInit,
  MediaStream as WebRTCMediaStream,
} from 'react-native-webrtc';

// ─── Types ──────────────────────────────────────────────────────

/** Possible states of a call */
export type CallState =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended';

/** Event handlers that consuming UI components register */
export interface CallEventHandlers {
  onIncomingCall?: (callerId: string, callType: CallType) => void;
  onCallAccepted?: () => void;
  onCallRejected?: (reason?: string) => void;
  onCallEnded?: () => void;
  onConnectionStateChange?: (state: CallState) => void;
  onRemoteStream?: (stream: unknown) => void; // MediaStream when WebRTC library is available
  onLocalStream?: (stream: unknown) => void; // MediaStream for local preview
}

// ─── Dynamic WebRTC Module ──────────────────────────────────────

/** Shape of the dynamically imported react-native-webrtc module */
interface WebRTCModule {
  RTCPeerConnection: typeof RTCPeerConnectionClass;
  RTCSessionDescription: typeof RTCSessionDescriptionClass;
  RTCIceCandidate: typeof RTCIceCandidateClass;
  mediaDevices: {
    getUserMedia: (constraints: { audio: boolean; video: boolean }) => Promise<WebRTCMediaStream>;
  };
}

// ─── STUN/TURN Configuration ────────────────────────────────────

/** Default ICE servers for NAT traversal. Replace with your own TURN server in production. */
const ICE_SERVERS: ReadonlyArray<{ urls: string }> = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/** Auto-dismiss timeout for unanswered incoming calls (30 seconds) */
const INCOMING_CALL_TIMEOUT_MS = 30_000;

/** Connection establishment timeout (15 seconds) */
const CONNECTION_TIMEOUT_MS = 15_000;

// ─── Service ────────────────────────────────────────────────────

class WebRTCService {
  private callState: CallState = 'idle';
  private currentSessionId: string | null = null;
  private currentCallType: CallType | null = null;
  private currentCallerId: string | null = null;
  private handlers: CallEventHandlers = {};
  private listenerCleanups: Array<() => void> = [];
  private incomingCallTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private callStartTime: number | null = null;

  // WebRTC module (loaded dynamically)
  private webrtcModule: WebRTCModule | null = null;
  private webrtcModuleLoaded = false;

  // Peer connection and media streams
  private peerConnection: RTCPeerConnectionClass | null = null;
  private localStream: WebRTCMediaStream | null = null;
  private remoteStream: WebRTCMediaStream | null = null;
  private isMuted = false;
  private isSpeakerOn = false;
  private isVideoEnabled = true;

  // ICE candidate queue: candidates received before remote description is set
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;

  // ─── Module Loading ─────────────────────────────────────────

  /**
   * Attempt to load react-native-webrtc dynamically.
   * Safe to call multiple times — caches the result after first attempt.
   * Returns true if the module is available.
   */
  async loadModule(): Promise<boolean> {
    if (this.webrtcModuleLoaded) {
      return this.webrtcModule !== null;
    }

    try {
      // Dynamic import — will throw if react-native-webrtc is not installed
      const mod = await import('react-native-webrtc');
      this.webrtcModule = {
        RTCPeerConnection: mod.RTCPeerConnection,
        RTCSessionDescription: mod.RTCSessionDescription,
        RTCIceCandidate: mod.RTCIceCandidate,
        mediaDevices: mod.mediaDevices,
      };
      this.webrtcModuleLoaded = true;

      if (__DEV__) {
        console.log('[WebRTCService] react-native-webrtc loaded successfully');
      }
      return true;
    } catch {
      this.webrtcModule = null;
      this.webrtcModuleLoaded = true;

      if (__DEV__) {
        console.log(
          '[WebRTCService] react-native-webrtc not installed — voice/video calls disabled',
        );
      }
      return false;
    }
  }

  /**
   * Check if the WebRTC module is available.
   */
  isAvailable(): boolean {
    return this.webrtcModule !== null;
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Register event handlers for call state changes and incoming calls.
   * Call this before setupListeners() to receive events.
   */
  setHandlers(handlers: CallEventHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Setup socket listeners for WebRTC signaling events.
   * Returns a cleanup function to remove all listeners.
   *
   * Must be called after socketService.connect() and before any call operations.
   */
  setupListeners(): () => void {
    // Clean up any existing listeners first
    this.teardownListeners();

    const cleanups: Array<() => void> = [];

    // Incoming call
    cleanups.push(
      socketService.on(
        WS_EVENTS.CALL_INITIATE,
        (data) => {
          if (this.callState !== 'idle') {
            // Already in a call — auto-reject the incoming call
            if (this.currentSessionId) {
              socketService.rejectCall(this.currentSessionId, 'busy');
            }
            return;
          }

          this.callState = 'incoming';
          this.currentCallerId = data.callerId;
          this.currentCallType = data.callType;
          this.handlers.onIncomingCall?.(data.callerId, data.callType);
          this.handlers.onConnectionStateChange?.('incoming');

          // Auto-dismiss after timeout
          this.incomingCallTimer = setTimeout(() => {
            if (this.callState === 'incoming' && this.currentSessionId) {
              this.rejectCall(this.currentSessionId, 'timeout');
            }
          }, INCOMING_CALL_TIMEOUT_MS);
        },
      ),
    );

    // Call accepted — caller side: create peer connection and send offer
    cleanups.push(
      socketService.on(
        WS_EVENTS.CALL_ACCEPT,
        (_data) => {
          if (this.callState !== 'outgoing') return;

          this.clearIncomingCallTimer();
          this.callState = 'connecting';
          this.handlers.onCallAccepted?.();
          this.handlers.onConnectionStateChange?.('connecting');

          // Start connection timeout
          this.connectionTimer = setTimeout(() => {
            if (this.callState === 'connecting') {
              this.endCall();
            }
          }, CONNECTION_TIMEOUT_MS);

          // Caller creates the peer connection and sends an offer
          this.createPeerConnectionAndOffer();
        },
      ),
    );

    // Call rejected
    cleanups.push(
      socketService.on(
        WS_EVENTS.CALL_REJECT,
        (data) => {
          if (this.callState !== 'outgoing') return;

          this.handlers.onCallRejected?.(data.reason);
          this.cleanup();
          this.handlers.onConnectionStateChange?.('idle');
        },
      ),
    );

    // Call ended
    cleanups.push(
      socketService.on(
        WS_EVENTS.CALL_END,
        (_data) => {
          if (this.callState === 'idle') return;

          this.handlers.onCallEnded?.();
          this.cleanup();
          this.handlers.onConnectionStateChange?.('idle');
        },
      ),
    );

    // WebRTC SDP offer received (callee side)
    cleanups.push(
      socketService.on(
        WS_EVENTS.WEBRTC_OFFER,
        (data) => {
          this.handleRemoteOffer(data.sdp);
        },
      ),
    );

    // WebRTC SDP answer received (caller side)
    cleanups.push(
      socketService.on(
        WS_EVENTS.WEBRTC_ANSWER,
        (data) => {
          this.handleRemoteAnswer(data.sdp);
        },
      ),
    );

    // ICE candidate received
    cleanups.push(
      socketService.on(
        WS_EVENTS.WEBRTC_ICE_CANDIDATE,
        (data) => {
          this.handleRemoteIceCandidate(data.candidate);
        },
      ),
    );

    this.listenerCleanups = cleanups;

    return () => this.teardownListeners();
  }

  /**
   * Initiate a voice or video call.
   * The partner will receive a CALL_INITIATE event.
   */
  initiateCall(sessionId: string, callType: CallType): void {
    if (this.callState !== 'idle') {
      console.warn('[WebRTCService] Cannot initiate call — already in a call');
      return;
    }

    this.currentSessionId = sessionId;
    this.currentCallType = callType;
    this.callState = 'outgoing';

    socketService.initiateCall(sessionId, callType);
    this.handlers.onConnectionStateChange?.('outgoing');
  }

  /**
   * Accept an incoming call.
   * The caller will receive a CALL_ACCEPT event.
   */
  acceptCall(sessionId: string): void {
    if (this.callState !== 'incoming') {
      console.warn('[WebRTCService] Cannot accept — no incoming call');
      return;
    }

    this.clearIncomingCallTimer();
    this.currentSessionId = sessionId;
    this.callState = 'connecting';

    socketService.acceptCall(sessionId);
    this.handlers.onConnectionStateChange?.('connecting');

    // Start connection timeout
    this.connectionTimer = setTimeout(() => {
      if (this.callState === 'connecting') {
        this.endCall();
      }
    }, CONNECTION_TIMEOUT_MS);

    // Callee creates peer connection and waits for the offer from the caller
    this.createPeerConnectionOnly();
  }

  /**
   * Reject an incoming call.
   * The caller will receive a CALL_REJECT event.
   */
  rejectCall(sessionId: string, reason?: string): void {
    if (this.callState !== 'incoming') {
      console.warn('[WebRTCService] Cannot reject — no incoming call');
      return;
    }

    this.clearIncomingCallTimer();
    socketService.rejectCall(sessionId, reason);
    this.cleanup();
    this.handlers.onConnectionStateChange?.('idle');
  }

  /**
   * End the current call (works for any active call state).
   * The partner will receive a CALL_END event.
   */
  endCall(): void {
    if (this.callState === 'idle') {
      console.warn('[WebRTCService] Cannot end call — no active call');
      return;
    }

    if (this.currentSessionId) {
      socketService.endCall(this.currentSessionId);
    }

    this.handlers.onCallEnded?.();
    this.cleanup();
    this.handlers.onConnectionStateChange?.('idle');
  }

  // ─── State Accessors ──────────────────────────────────────────

  /** Get the current call state */
  getCallState(): CallState {
    return this.callState;
  }

  /** Get the current call type (voice or video) */
  getCallType(): CallType | null {
    return this.currentCallType;
  }

  /** Get the current session ID of the active call */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /** Get the caller ID (for incoming calls) */
  getCurrentCallerId(): string | null {
    return this.currentCallerId;
  }

  /**
   * Get the call duration in seconds since the call was connected.
   * Returns 0 if no call is active.
   */
  getCallDurationSeconds(): number {
    if (!this.callStartTime || this.callState !== 'connected') return 0;
    return Math.floor((Date.now() - this.callStartTime) / 1000);
  }

  /** Get the ICE servers configuration (for future RTCPeerConnection setup) */
  getIceServers(): ReadonlyArray<{ urls: string }> {
    return ICE_SERVERS;
  }

  // ─── Media Controls ───────────────────────────────────────────

  /** Toggle microphone mute. Returns the new muted state. */
  toggleMute(): boolean {
    if (!this.localStream) {
      if (__DEV__) {
        console.log('[WebRTCService] toggleMute — no local stream');
      }
      return false;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return this.isMuted;
    }

    this.isMuted = !this.isMuted;
    for (const track of audioTracks) {
      track.enabled = !this.isMuted;
    }

    return this.isMuted;
  }

  /** Toggle speaker output. Returns the new speaker state. */
  toggleSpeaker(): boolean {
    // Speaker routing requires a native module (e.g., react-native-incall-manager).
    // When that module is integrated, toggle speaker here.
    // For now, flip the local state so the UI can reflect the intent.
    this.isSpeakerOn = !this.isSpeakerOn;

    if (__DEV__) {
      console.log(
        `[WebRTCService] toggleSpeaker — speaker is now ${this.isSpeakerOn ? 'ON' : 'OFF'} (native routing requires InCallManager)`,
      );
    }

    return this.isSpeakerOn;
  }

  /** Toggle video on/off during a video call. Returns the new video-enabled state. */
  toggleVideo(): boolean {
    if (!this.localStream) {
      if (__DEV__) {
        console.log('[WebRTCService] toggleVideo — no local stream');
      }
      return true;
    }

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      return this.isVideoEnabled;
    }

    this.isVideoEnabled = !this.isVideoEnabled;
    for (const track of videoTracks) {
      track.enabled = this.isVideoEnabled;
    }

    return this.isVideoEnabled;
  }

  /** Get current mute state */
  getIsMuted(): boolean {
    return this.isMuted;
  }

  /** Get current speaker state */
  getIsSpeakerOn(): boolean {
    return this.isSpeakerOn;
  }

  /** Get current video enabled state */
  getIsVideoEnabled(): boolean {
    return this.isVideoEnabled;
  }

  /** Get the local media stream (for local video preview) */
  getLocalStream(): unknown {
    return this.localStream;
  }

  /** Get the remote media stream (for remote video/audio playback) */
  getRemoteStream(): unknown {
    return this.remoteStream;
  }

  // ─── Private: Peer Connection ─────────────────────────────────

  /**
   * Create peer connection, acquire local media, then create and send an SDP offer.
   * Called by the initiator (caller) after the callee accepts.
   */
  private async createPeerConnectionAndOffer(): Promise<void> {
    const ready = await this.setupPeerConnection();
    if (!ready) return;

    await this.createAndSendOffer();
  }

  /**
   * Create peer connection and acquire local media without sending an offer.
   * Called by the callee; the offer will arrive via signaling.
   */
  private async createPeerConnectionOnly(): Promise<void> {
    await this.setupPeerConnection();
  }

  /**
   * Core peer connection setup: create RTCPeerConnection, get local media, add tracks.
   * Returns true if native WebRTC setup succeeded, false if falling back to simulation.
   */
  private async setupPeerConnection(): Promise<boolean> {
    if (!this.webrtcModule) {
      if (__DEV__) {
        console.log(
          '[WebRTCService] WebRTC module not available — simulating connection',
        );
      }
      // Fallback: simulate connection for development without the native module
      this.simulateConnection();
      return false;
    }

    try {
      const { RTCPeerConnection, mediaDevices } = this.webrtcModule;

      // Reset ICE candidate queue
      this.pendingIceCandidates = [];
      this.hasRemoteDescription = false;

      // Create the peer connection
      this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Handle ICE candidates — send to remote peer via signaling
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentSessionId) {
          socketService.sendICECandidate(
            this.currentSessionId,
            JSON.stringify({
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
            }),
          );
        }
      };

      // Handle remote tracks (audio/video from the other peer)
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams.length > 0) {
          this.remoteStream = event.streams[0];
          this.handlers.onRemoteStream?.(this.remoteStream);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;

        if (__DEV__) {
          console.log(`[WebRTCService] Connection state: ${state}`);
        }

        if (state === 'connected') {
          this.clearConnectionTimer();
          this.callState = 'connected';
          this.callStartTime = Date.now();
          this.handlers.onConnectionStateChange?.('connected');
        } else if (state === 'failed') {
          // 'failed' is terminal — end the call
          if (__DEV__) {
            console.warn('[WebRTCService] Peer connection failed — ending call');
          }
          this.endCall();
        }
      };

      // Acquire local media (audio always, video only for video calls)
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: this.currentCallType === 'video',
      });
      this.handlers.onLocalStream?.(this.localStream);

      // Add local tracks to the peer connection
      const tracks = this.localStream.getTracks();
      for (const track of tracks) {
        this.peerConnection.addTrack(track, this.localStream);
      }

      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('[WebRTCService] Failed to setup peer connection:', error);
      }
      // Fallback to simulated connection so the call flow does not break
      this.simulateConnection();
      return false;
    }
  }

  /**
   * Create an SDP offer and send it to the remote peer via signaling.
   */
  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection || !this.currentSessionId || !this.webrtcModule) {
      return;
    }

    try {
      const offer = await this.peerConnection.createOffer({});
      await this.peerConnection.setLocalDescription(offer);
      socketService.sendWebRTCOffer(this.currentSessionId, offer.sdp);
    } catch (error) {
      if (__DEV__) {
        console.error('[WebRTCService] Failed to create/send offer:', error);
      }
    }
  }

  /**
   * Handle a remote SDP offer (callee side).
   * Sets the remote description, flushes queued ICE candidates, creates and sends an answer.
   */
  private async handleRemoteOffer(sdp: string): Promise<void> {
    if (!this.peerConnection || !this.currentSessionId || !this.webrtcModule) {
      if (__DEV__) {
        console.log('[WebRTCService] Ignoring remote offer — no peer connection');
      }
      return;
    }

    try {
      const { RTCSessionDescription } = this.webrtcModule;
      const remoteDesc = new RTCSessionDescription({ type: 'offer', sdp });
      await this.peerConnection.setRemoteDescription(remoteDesc);
      this.hasRemoteDescription = true;

      // Flush any ICE candidates that arrived before the remote description was set
      await this.flushPendingIceCandidates();

      // Create and send the answer
      const answer = await this.peerConnection.createAnswer({});
      await this.peerConnection.setLocalDescription(answer);
      socketService.sendWebRTCAnswer(this.currentSessionId, answer.sdp);
    } catch (error) {
      if (__DEV__) {
        console.error('[WebRTCService] Failed to handle remote offer:', error);
      }
    }
  }

  /**
   * Handle a remote SDP answer (caller side).
   * Sets the remote description and flushes queued ICE candidates.
   */
  private async handleRemoteAnswer(sdp: string): Promise<void> {
    if (!this.peerConnection || !this.webrtcModule) {
      if (__DEV__) {
        console.log('[WebRTCService] Ignoring remote answer — no peer connection');
      }
      return;
    }

    try {
      const { RTCSessionDescription } = this.webrtcModule;
      const remoteDesc = new RTCSessionDescription({ type: 'answer', sdp });
      await this.peerConnection.setRemoteDescription(remoteDesc);
      this.hasRemoteDescription = true;

      // Flush any ICE candidates that arrived before the remote description was set
      await this.flushPendingIceCandidates();
    } catch (error) {
      if (__DEV__) {
        console.error('[WebRTCService] Failed to handle remote answer:', error);
      }
    }
  }

  /**
   * Handle a remote ICE candidate. If the remote description is not yet set,
   * queue the candidate for later processing (trickle ICE).
   */
  private async handleRemoteIceCandidate(candidateJson: string): Promise<void> {
    if (!this.peerConnection || !this.webrtcModule) {
      return;
    }

    try {
      const parsed: RTCIceCandidateInit = JSON.parse(candidateJson);

      if (!this.hasRemoteDescription) {
        // Queue the candidate — it will be added after setRemoteDescription
        this.pendingIceCandidates.push(parsed);
        return;
      }

      const { RTCIceCandidate } = this.webrtcModule;
      const candidate = new RTCIceCandidate(parsed);
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      if (__DEV__) {
        console.error('[WebRTCService] Failed to add ICE candidate:', error);
      }
    }
  }

  /**
   * Add all queued ICE candidates to the peer connection.
   * Called after setRemoteDescription succeeds.
   */
  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.webrtcModule) return;

    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];

    const { RTCIceCandidate } = this.webrtcModule;

    for (const parsed of candidates) {
      try {
        const candidate = new RTCIceCandidate(parsed);
        await this.peerConnection.addIceCandidate(candidate);
      } catch (error) {
        if (__DEV__) {
          console.error('[WebRTCService] Failed to flush ICE candidate:', error);
        }
      }
    }
  }

  /**
   * Simulate a successful connection when the native WebRTC module is not available.
   * This allows the call UI flow to work in development (Expo Go) without the native module.
   */
  private simulateConnection(): void {
    setTimeout(() => {
      if (this.callState === 'connecting') {
        this.clearConnectionTimer();
        this.callState = 'connected';
        this.callStartTime = Date.now();
        this.handlers.onConnectionStateChange?.('connected');
      }
    }, 1000);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Clean up all call state and resources.
   * Closes the peer connection, stops media tracks, resets all state.
   */
  private cleanup(): void {
    this.clearIncomingCallTimer();
    this.clearConnectionTimer();

    // Close RTCPeerConnection
    if (this.peerConnection) {
      // Remove handlers to prevent callbacks after close
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Release local media tracks (stops camera/microphone)
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      for (const track of tracks) {
        track.stop();
      }
      this.localStream = null;
    }

    // Clear remote stream reference
    this.remoteStream = null;

    // Reset call state
    this.callState = 'idle';
    this.currentSessionId = null;
    this.currentCallType = null;
    this.currentCallerId = null;
    this.callStartTime = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.isVideoEnabled = true;
    this.pendingIceCandidates = [];
    this.hasRemoteDescription = false;
  }

  /**
   * Remove all socket event listeners.
   */
  private teardownListeners(): void {
    for (const cleanupFn of this.listenerCleanups) {
      cleanupFn();
    }
    this.listenerCleanups = [];
  }

  private clearIncomingCallTimer(): void {
    if (this.incomingCallTimer) {
      clearTimeout(this.incomingCallTimer);
      this.incomingCallTimer = null;
    }
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }
}

/** Singleton instance shared across the app */
export const webrtcService = new WebRTCService();
