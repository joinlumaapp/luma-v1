// WebRTC service — manages peer connections for voice/video calls in Harmony Room.
// Ready for react-native-webrtc integration. Currently provides the full signaling
// layer via Socket.IO and a state machine for call lifecycle.
//
// When react-native-webrtc is installed, the TODO comments mark where
// RTCPeerConnection, getUserMedia, and MediaStream logic should be wired in.

import {
  socketService,
  SERVER_EVENTS,
  type CallType,
  type CallInitiatePayload,
  type CallAcceptPayload,
  type CallRejectPayload,
  type CallEndPayload,
  type WebRTCOfferPayload,
  type WebRTCAnswerPayload,
  type ICECandidatePayload,
} from './socketService';

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
}

// ─── STUN/TURN Configuration ────────────────────────────────────

/** Default ICE servers for NAT traversal. Replace with your own TURN server in production. */
const ICE_SERVERS = [
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

  // TODO: When react-native-webrtc is installed, add these fields:
  // private peerConnection: RTCPeerConnection | null = null;
  // private localStream: MediaStream | null = null;
  // private remoteStream: MediaStream | null = null;
  // private isMuted: boolean = false;
  // private isSpeakerOn: boolean = false;
  // private isVideoEnabled: boolean = true;

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
      socketService.on<CallInitiatePayload>(
        SERVER_EVENTS.CALL_INITIATE,
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

    // Call accepted
    cleanups.push(
      socketService.on<CallAcceptPayload>(
        SERVER_EVENTS.CALL_ACCEPT,
        (_data) => {
          if (this.callState !== 'outgoing') return;

          this.clearIncomingCallTimer();
          this.callState = 'connecting';
          this.handlers.onCallAccepted?.();
          this.handlers.onConnectionStateChange?.('connecting');

          // Start connection timeout
          this.connectionTimer = setTimeout(() => {
            if (this.callState === 'connecting') {
              // Connection failed to establish in time
              this.endCall();
            }
          }, CONNECTION_TIMEOUT_MS);

          // TODO: Create RTCPeerConnection, create SDP offer, send via signaling
          // this.createPeerConnection();
          // this.createAndSendOffer();

          // For now, simulate connection established after a short delay
          setTimeout(() => {
            if (this.callState === 'connecting') {
              this.clearConnectionTimer();
              this.callState = 'connected';
              this.callStartTime = Date.now();
              this.handlers.onConnectionStateChange?.('connected');
            }
          }, 1000);
        },
      ),
    );

    // Call rejected
    cleanups.push(
      socketService.on<CallRejectPayload>(
        SERVER_EVENTS.CALL_REJECT,
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
      socketService.on<CallEndPayload>(
        SERVER_EVENTS.CALL_END,
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
      socketService.on<WebRTCOfferPayload>(
        SERVER_EVENTS.WEBRTC_OFFER,
        (_data) => {
          // TODO: When RTCPeerConnection is available:
          // await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
          // const answer = await this.peerConnection.createAnswer();
          // await this.peerConnection.setLocalDescription(answer);
          // socketService.sendWebRTCAnswer(this.currentSessionId!, answer.sdp!);
        },
      ),
    );

    // WebRTC SDP answer received (caller side)
    cleanups.push(
      socketService.on<WebRTCAnswerPayload>(
        SERVER_EVENTS.WEBRTC_ANSWER,
        (_data) => {
          // TODO: When RTCPeerConnection is available:
          // await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
        },
      ),
    );

    // ICE candidate received
    cleanups.push(
      socketService.on<ICECandidatePayload>(
        SERVER_EVENTS.WEBRTC_ICE_CANDIDATE,
        (_data) => {
          // TODO: When RTCPeerConnection is available:
          // const candidate = new RTCIceCandidate(JSON.parse(data.candidate));
          // await this.peerConnection.addIceCandidate(candidate);
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

    // TODO: Create RTCPeerConnection and wait for offer from caller
    // this.createPeerConnection();

    // For now, simulate connection established after a short delay
    setTimeout(() => {
      if (this.callState === 'connecting') {
        this.clearConnectionTimer();
        this.callState = 'connected';
        this.callStartTime = Date.now();
        this.handlers.onConnectionStateChange?.('connected');
      }
    }, 1000);
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

  // ─── Media Controls (stubs for react-native-webrtc) ───────────

  /** Toggle microphone mute (stub — will control local audio track) */
  toggleMute(): boolean {
    // TODO: When react-native-webrtc is installed:
    // if (this.localStream) {
    //   const audioTracks = this.localStream.getAudioTracks();
    //   audioTracks.forEach(track => { track.enabled = !track.enabled; });
    //   this.isMuted = !audioTracks[0]?.enabled;
    //   return this.isMuted;
    // }
    return false;
  }

  /** Toggle speaker output (stub — will use InCallManager or similar) */
  toggleSpeaker(): boolean {
    // TODO: When react-native-webrtc + InCallManager is installed:
    // InCallManager.setSpeakerphoneOn(!this.isSpeakerOn);
    // this.isSpeakerOn = !this.isSpeakerOn;
    // return this.isSpeakerOn;
    return false;
  }

  /** Toggle video on/off during a video call (stub) */
  toggleVideo(): boolean {
    // TODO: When react-native-webrtc is installed:
    // if (this.localStream) {
    //   const videoTracks = this.localStream.getVideoTracks();
    //   videoTracks.forEach(track => { track.enabled = !track.enabled; });
    //   this.isVideoEnabled = videoTracks[0]?.enabled ?? false;
    //   return this.isVideoEnabled;
    // }
    return true;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Clean up all call state and resources.
   */
  private cleanup(): void {
    this.clearIncomingCallTimer();
    this.clearConnectionTimer();
    this.callState = 'idle';
    this.currentSessionId = null;
    this.currentCallType = null;
    this.currentCallerId = null;
    this.callStartTime = null;

    // TODO: When react-native-webrtc is installed:
    // Close RTCPeerConnection
    // if (this.peerConnection) {
    //   this.peerConnection.close();
    //   this.peerConnection = null;
    // }
    // Release local media tracks
    // if (this.localStream) {
    //   this.localStream.getTracks().forEach(track => track.stop());
    //   this.localStream = null;
    // }
    // this.remoteStream = null;
    // this.isMuted = false;
    // this.isSpeakerOn = false;
    // this.isVideoEnabled = true;
  }

  /**
   * Remove all socket event listeners.
   */
  private teardownListeners(): void {
    this.listenerCleanups.forEach((cleanup) => cleanup());
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

  // TODO: When react-native-webrtc is installed, add these methods:
  //
  // private async createPeerConnection(): Promise<void> {
  //   this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  //
  //   // Handle ICE candidates
  //   this.peerConnection.onicecandidate = (event) => {
  //     if (event.candidate && this.currentSessionId) {
  //       socketService.sendICECandidate(
  //         this.currentSessionId,
  //         JSON.stringify(event.candidate),
  //       );
  //     }
  //   };
  //
  //   // Handle remote stream
  //   this.peerConnection.ontrack = (event) => {
  //     this.remoteStream = event.streams[0];
  //     this.handlers.onRemoteStream?.(this.remoteStream);
  //   };
  //
  //   // Handle connection state changes
  //   this.peerConnection.onconnectionstatechange = () => {
  //     if (this.peerConnection?.connectionState === 'connected') {
  //       this.clearConnectionTimer();
  //       this.callState = 'connected';
  //       this.callStartTime = Date.now();
  //       this.handlers.onConnectionStateChange?.('connected');
  //     } else if (this.peerConnection?.connectionState === 'failed') {
  //       this.endCall();
  //     }
  //   };
  //
  //   // Get local media stream
  //   const constraints = {
  //     audio: true,
  //     video: this.currentCallType === 'video',
  //   };
  //   this.localStream = await mediaDevices.getUserMedia(constraints);
  //   this.localStream.getTracks().forEach(track => {
  //     this.peerConnection?.addTrack(track, this.localStream!);
  //   });
  // }
  //
  // private async createAndSendOffer(): Promise<void> {
  //   if (!this.peerConnection || !this.currentSessionId) return;
  //   const offer = await this.peerConnection.createOffer({});
  //   await this.peerConnection.setLocalDescription(offer);
  //   socketService.sendWebRTCOffer(this.currentSessionId, offer.sdp!);
  // }
}

/** Singleton instance shared across the app */
export const webrtcService = new WebRTCService();
