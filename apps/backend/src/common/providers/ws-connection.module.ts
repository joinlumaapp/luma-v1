import { Global, Module } from "@nestjs/common";
import { WsConnectionService } from "./ws-connection.service";

/**
 * WsConnectionModule — Global Redis-backed WebSocket connection registry.
 *
 * Registered as @Global so that all gateway modules can inject
 * WsConnectionService without explicit imports.
 */
@Global()
@Module({
  providers: [WsConnectionService],
  exports: [WsConnectionService],
})
export class WsConnectionModule {}
