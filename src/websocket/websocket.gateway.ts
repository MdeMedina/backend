import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configurar según tu frontend
  },
  namespace: '/',
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.userRole = user.role;
      this.connectedUsers.set(user.id, client);

      // Notificar a otros usuarios (opcional)
      this.server.emit('user:connected', {
        userId: user.id,
        timestamp: new Date(),
      });

      // Enviar confirmación al cliente
      client.emit('connection:success', {
        message: 'Connected successfully',
        userId: user.id,
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.server.emit('user:disconnected', {
        userId: client.userId,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return { event: 'pong', data: { timestamp: new Date() } };
  }

  // Método para enviar notificaciones a usuarios específicos
  sendToUser(userId: string, event: string, data: any) {
    const client = this.connectedUsers.get(userId);
    if (client) {
      client.emit(event, data);
    }
  }

  // Método para enviar notificaciones a todos los usuarios
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Método para enviar notificaciones a usuarios con un rol específico
  sendToRole(role: string, event: string, data: any) {
    this.connectedUsers.forEach((client, userId) => {
      if (client.userRole === role) {
        client.emit(event, data);
      }
    });
  }

  // Obtener usuarios conectados
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}

