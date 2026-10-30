import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket, RawData } from 'ws';
import type { ProcessRunner } from '../../process-supervisor/services/process-runner.js';
import type { AuthService } from '../../auth-identity/services/auth-service.js';

export interface ConsoleSocketOptions {
  processRunner: ProcessRunner;
  authService: AuthService;
}

export const consoleSocketPlugin: FastifyPluginAsync<ConsoleSocketOptions> = async (fastify, opts) => {
  const { processRunner, authService } = opts;

  const handleSocketConnection = (socket: WebSocket, request: any) => {
    const instanceId = request.params?.id;
    let isAuthenticated = false;

    const sendJson = (payload: unknown) => {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(JSON.stringify(payload));
      }
    };

    // Check query token
    const queryToken = request.query?.token;
    if (queryToken) {
      try {
        authService.verifyToken(queryToken);
        isAuthenticated = true;
      } catch {
        sendJson({ type: 'error', message: 'Token de autenticación inválido o expirado' });
        socket.close(1008, 'Unauthorized');
        return;
      }
    }

    // If not authenticated via query string, wait for initial auth message
    let authTimeout: NodeJS.Timeout | null = null;
    if (!isAuthenticated) {
      authTimeout = setTimeout(() => {
        if (!isAuthenticated) {
          sendJson({ type: 'error', message: 'Timeout de autenticación WebSocket' });
          socket.close(1008, 'Unauthorized');
        }
      }, 5000);
    }

    let isStreaming = false;
    const startStreaming = () => {
      if (isStreaming) return;
      isStreaming = true;

      // 1. Send buffer history
      const buffer = processRunner.getBuffer(instanceId);
      const lines = buffer ? buffer.getLines() : [];
      sendJson({ type: 'history', lines });

      // 2. Event listeners
      const onLog = (event: { instanceId: string; line: string }) => {
        if (event.instanceId === instanceId) {
          sendJson({ type: 'log', line: event.line });
        }
      };

      const onPlayer = (event: { instanceId: string; event: unknown }) => {
        if (event.instanceId === instanceId) {
          sendJson({ type: 'player-event', data: event.event });
        }
      };

      const onCrash = (event: { instanceId: string; diagnostic: unknown }) => {
        if (event.instanceId === instanceId) {
          sendJson({ type: 'crash', diagnostic: event.diagnostic });
        }
      };

      const onStatus = (event: { instanceId: string; status: string }) => {
        if (event.instanceId === instanceId) {
          sendJson({ type: 'status', status: event.status });
        }
      };

      processRunner.on('console-line', onLog);
      processRunner.on('log', onLog);
      processRunner.on('player-event', onPlayer);
      processRunner.on('crash-detected', onCrash);
      processRunner.on('status-change', onStatus);
      processRunner.on('status-changed', onStatus);

      // Clean up when socket disconnects
      socket.on('close', () => {
        processRunner.off('console-line', onLog);
        processRunner.off('log', onLog);
        processRunner.off('player-event', onPlayer);
        processRunner.off('crash-detected', onCrash);
        processRunner.off('status-change', onStatus);
        processRunner.off('status-changed', onStatus);
      });
    };

    if (isAuthenticated) {
      startStreaming();
    }

    // Handle incoming client messages
    socket.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!isAuthenticated) {
          if (msg.type === 'auth' && typeof msg.token === 'string') {
            authService.verifyToken(msg.token);
            isAuthenticated = true;
            if (authTimeout) clearTimeout(authTimeout);
            sendJson({ type: 'authenticated', success: true });
            startStreaming();
          } else {
            sendJson({ type: 'error', message: 'Debe autenticarse primero' });
            socket.close(1008, 'Unauthorized');
          }
          return;
        }

        // Handle heartbeat ping
        if (msg.type === 'ping') {
          sendJson({ type: 'pong', timestamp: Date.now() });
          return;
        }

        // Handle commands
        if (msg.type === 'command' && typeof msg.command === 'string') {
          processRunner.sendCommand(instanceId, msg.command);
        }
      } catch {
        sendJson({ type: 'error', message: 'Mensaje JSON inválido' });
      }
    });
  };

  // Register primary route
  fastify.get<{
    Params: { id: string };
    Querystring: { token?: string };
  }>('/ws/servers/:id/console', { websocket: true }, handleSocketConnection);

  // Register alternative route for reverse proxies forwarding /api only
  fastify.get<{
    Params: { id: string };
    Querystring: { token?: string };
  }>('/api/ws/servers/:id/console', { websocket: true }, handleSocketConnection);
};
