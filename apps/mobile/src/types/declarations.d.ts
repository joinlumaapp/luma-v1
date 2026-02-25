// Module declarations for packages without types
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
