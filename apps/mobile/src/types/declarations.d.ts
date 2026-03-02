// Module declarations for packages without types or not yet installed

declare module '@sentry/react-native' {
  export function init(options: {
    dsn: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    sendDefaultPii?: boolean;
    enabled?: boolean;
  }): void;
  export function captureException(error: unknown): void;
  export function setUser(user: { id: string } | null): void;
  export function addBreadcrumb(breadcrumb: {
    category?: string;
    message?: string;
    level?: string;
  }): void;
  export function withScope(callback: (scope: {
    setExtra(key: string, value: unknown): void;
    setTag(key: string, value: string): void;
    setUser(user: { id: string } | null): void;
  }) => void): void;
}
declare module 'expo-in-app-purchases' {
  interface IAPProduct {
    productId: string;
    title: string;
    description: string;
    price: string;
  }

  interface IAPPurchaseItem {
    productId: string;
    transactionReceipt?: string;
    orderId?: string;
    acknowledged?: boolean;
  }

  interface IAPPurchaseEvent {
    responseCode: number;
    results?: IAPPurchaseItem[];
  }

  export function connectAsync(): Promise<void>;
  export function disconnectAsync(): Promise<void>;
  export function getProductsAsync(itemIds: string[]): Promise<{ results?: IAPProduct[] }>;
  export function getPurchaseHistoryAsync(): Promise<{ results?: IAPPurchaseItem[] }>;
  export function purchaseItemAsync(itemId: string): Promise<void>;
  export function setPurchaseListener(listener: (event: IAPPurchaseEvent) => void): void;
  export function finishTransactionAsync(purchase: IAPPurchaseItem, consumeItem: boolean): Promise<void>;
}

declare module 'react-native-webrtc' {
  interface RTCIceCandidateInit {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  }

  interface RTCSessionDescriptionInit {
    type: string;
    sdp: string;
  }

  interface MediaTrack {
    enabled: boolean;
    kind: string;
    stop: () => void;
  }

  interface MediaStream {
    getTracks: () => MediaTrack[];
    getAudioTracks: () => MediaTrack[];
    getVideoTracks: () => MediaTrack[];
  }

  interface RTCPeerConnectionConfig {
    iceServers: ReadonlyArray<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;
  }

  class RTCPeerConnection {
    constructor(config: RTCPeerConnectionConfig);
    addTrack(track: MediaTrack, stream: MediaStream): void;
    createOffer(options?: Record<string, unknown>): Promise<RTCSessionDescriptionInit>;
    createAnswer(options?: Record<string, unknown>): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void>;
    setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void>;
    addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
    close(): void;
    connectionState: string;
    onicecandidate: ((event: { candidate: RTCIceCandidateInit | null }) => void) | null;
    ontrack: ((event: { streams: MediaStream[] }) => void) | null;
    onconnectionstatechange: (() => void) | null;
  }

  class RTCSessionDescription {
    constructor(desc: RTCSessionDescriptionInit);
    type: string;
    sdp: string;
  }

  class RTCIceCandidate {
    constructor(candidate: RTCIceCandidateInit);
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  }

  const mediaDevices: {
    getUserMedia: (constraints: {
      audio: boolean;
      video: boolean;
    }) => Promise<MediaStream>;
  };

  export {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
  };
  export type {
    RTCPeerConnectionConfig,
    RTCSessionDescriptionInit,
    RTCIceCandidateInit,
    MediaTrack,
    MediaStream,
  };
}

declare module 'socket.io-client' {
  import { EventEmitter } from 'events';

  interface ManagerOptions {
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    timeout?: number;
    autoConnect?: boolean;
    transports?: string[];
  }

  interface SocketOptions {
    auth?: Record<string, unknown>;
  }

  interface Socket extends EventEmitter {
    id: string;
    connected: boolean;
    disconnected: boolean;
    connect(): this;
    disconnect(): this;
    emit(event: string, ...args: unknown[]): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    off(event: string, listener?: (...args: unknown[]) => void): this;
    io: {
      opts: ManagerOptions & SocketOptions;
    };
  }

  function io(uri: string, opts?: Partial<ManagerOptions & SocketOptions>): Socket;
  export { io, Socket, ManagerOptions, SocketOptions };
}
