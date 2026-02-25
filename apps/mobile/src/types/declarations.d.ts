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
