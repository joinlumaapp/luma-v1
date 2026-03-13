// Call store — Zustand store for voice/video call state management
// Bridges webrtcService events to reactive UI state with auto-incrementing timer.

import { create } from 'zustand';
import { webrtcService, type CallState } from '../services/webrtcService';
import type { CallType } from '../services/socketService';

/** Remote user info displayed during a call */
export interface RemoteCallUser {
  id: string;
  name: string;
  avatar: string;
}

/** Call quality level derived from connection stats */
export type CallQuality = 'excellent' | 'good' | 'poor';

interface CallStoreState {
  // State
  callState: CallState;
  callType: CallType | null;
  remoteUser: RemoteCallUser | null;
  isMuted: boolean;
  isSpeaker: boolean;
  isCameraOff: boolean;
  callDuration: number;
  callQuality: CallQuality;
  isMinimized: boolean;

  // Actions
  startCall: (sessionId: string, type: CallType, user: RemoteCallUser) => void;
  handleIncomingCall: (sessionId: string, type: CallType, user: RemoteCallUser) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  flipCamera: () => void;
  setMinimized: (minimized: boolean) => void;
  reset: () => void;

  // Internal — timer
  _durationInterval: ReturnType<typeof setInterval> | null;
  _startDurationTimer: () => void;
  _stopDurationTimer: () => void;
  _currentSessionId: string | null;
}

const initialState = {
  callState: 'idle' as CallState,
  callType: null as CallType | null,
  remoteUser: null as RemoteCallUser | null,
  isMuted: false,
  isSpeaker: false,
  isCameraOff: false,
  callDuration: 0,
  callQuality: 'excellent' as CallQuality,
  isMinimized: false,
  _durationInterval: null as ReturnType<typeof setInterval> | null,
  _currentSessionId: null as string | null,
};

export const useCallStore = create<CallStoreState>((set, get) => ({
  ...initialState,

  // ── Outgoing call ──────────────────────────────────────────
  startCall: (sessionId, type, user) => {
    const state = get();
    if (state.callState !== 'idle') return;

    set({
      callState: 'outgoing',
      callType: type,
      remoteUser: user,
      _currentSessionId: sessionId,
      isMuted: false,
      isSpeaker: false,
      isCameraOff: false,
      callDuration: 0,
      isMinimized: false,
    });

    webrtcService.initiateCall(sessionId, type);
  },

  // ── Incoming call ──────────────────────────────────────────
  handleIncomingCall: (sessionId, type, user) => {
    const state = get();
    if (state.callState !== 'idle') return;

    set({
      callState: 'incoming',
      callType: type,
      remoteUser: user,
      _currentSessionId: sessionId,
      isMuted: false,
      isSpeaker: false,
      isCameraOff: false,
      callDuration: 0,
      isMinimized: false,
    });
  },

  // ── Accept incoming ────────────────────────────────────────
  acceptCall: () => {
    const state = get();
    if (state.callState !== 'incoming' || !state._currentSessionId) return;

    set({ callState: 'connecting' });
    webrtcService.acceptCall(state._currentSessionId);
  },

  // ── Reject incoming ────────────────────────────────────────
  rejectCall: () => {
    const state = get();
    if (state.callState !== 'incoming' || !state._currentSessionId) return;

    webrtcService.rejectCall(state._currentSessionId, 'declined');
    get()._stopDurationTimer();
    set({ ...initialState });
  },

  // ── End call ───────────────────────────────────────────────
  endCall: () => {
    const state = get();
    if (state.callState === 'idle') return;

    webrtcService.endCall();
    get()._stopDurationTimer();
    set({ ...initialState });
  },

  // ── Media controls ─────────────────────────────────────────
  toggleMute: () => {
    const newMuted = webrtcService.toggleMute();
    set({ isMuted: newMuted });
  },

  toggleSpeaker: () => {
    const newSpeaker = webrtcService.toggleSpeaker();
    set({ isSpeaker: newSpeaker });
  },

  toggleCamera: () => {
    const newVideo = webrtcService.toggleVideo();
    // toggleVideo returns whether video is enabled, so cameraOff is the inverse
    set({ isCameraOff: !newVideo });
  },

  flipCamera: () => {
    // Camera flip requires native module (react-native-webrtc switchCamera)
    // This is a placeholder — the webrtcService can be extended for this
    if (__DEV__) {
      console.log('[CallStore] flipCamera — requires native switchCamera support');
    }
  },

  setMinimized: (minimized) => {
    set({ isMinimized: minimized });
  },

  reset: () => {
    get()._stopDurationTimer();
    set({ ...initialState });
  },

  // ── Duration timer ─────────────────────────────────────────
  _startDurationTimer: () => {
    const state = get();
    if (state._durationInterval) return;

    const interval = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);

    set({ _durationInterval: interval });
  },

  _stopDurationTimer: () => {
    const state = get();
    if (state._durationInterval) {
      clearInterval(state._durationInterval);
      set({ _durationInterval: null });
    }
  },
}));

// ── WebRTC event bridge ─────────────────────────────────────
// Register handlers on the webrtcService singleton so that
// connection state changes flow into the Zustand store.

export function setupCallStoreListeners(): () => void {
  webrtcService.setHandlers({
    onConnectionStateChange: (state: CallState) => {
      const store = useCallStore.getState();

      if (state === 'connected') {
        useCallStore.setState({ callState: 'connected' });
        store._startDurationTimer();
      } else if (state === 'idle') {
        store._stopDurationTimer();
        useCallStore.setState({ ...initialState });
      } else {
        useCallStore.setState({ callState: state });
      }
    },
    onCallRejected: (reason) => {
      if (__DEV__) {
        console.log('[CallStore] Call rejected:', reason);
      }
      const store = useCallStore.getState();
      store._stopDurationTimer();
      useCallStore.setState({ ...initialState });
    },
    onCallEnded: () => {
      const store = useCallStore.getState();
      store._stopDurationTimer();
      useCallStore.setState({ ...initialState });
    },
  });

  const cleanupListeners = webrtcService.setupListeners();

  return () => {
    cleanupListeners();
    const store = useCallStore.getState();
    store._stopDurationTimer();
  };
}
