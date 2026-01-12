import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway as WsGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WsGateway({
  cors: {
    origin: '*',
  },
})
export class WebSocketGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    // Aquí podrías validar el token JWT del cliente si lo envía en query/headers
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.emit('pong', data ?? { ok: true });
  }
}


