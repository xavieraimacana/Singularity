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

  fastify.get<{
    Params: { id: string };
    Querystring: { token?: string };
  }>('/ws/servers/:id/console', { websocket: true }, (socket: WebSocket, request) => {
    const instanceId = request.params.id;
    let isAuthenticated = false;

    // Check query token
    const queryToken = request.query?.token;
    if (queryToken) {
      try {
        authService.verifyToken(queryToken);
        isAuthenticated = true;
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Token de autenticación inválido' }));
        socket.close(1008, 'Unauthorized');
        return;
      }
    }

    const sendJson = (payload: unknown) => {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(JSON.stringify(payload));
      }
    };

    // If not authenticated via query string, wait for initial auth message
    let authTimeout: NodeJS.Timeout | null = null;
    if (!isAuthenticated) {
      authTimeout = setTimeout(() => {
        if (!isAuthenticated) {
          sendJson({ type: 'error', message: 'Timeout de autenticación' });
          socket.close(1008, 'Unauthorized');
        }
      }, 5000);
    }

    const startStreaming = () => {
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

      processRunner.on('log', onLog);
      processRunner.on('player-event', onPlayer);
      processRunner.on('crash-detected', onCrash);
      processRunner.on('status-changed', onStatus);

      // Clean up when socket disconnects
      socket.on('close', () => {
        processRunner.off('log', onLog);
        processRunner.off('player-event', onPlayer);
        processRunner.off('crash-detected', onCrash);
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

        // Handle commands
        if (msg.type === 'command' && typeof msg.command === 'string') {
          processRunner.sendCommand(instanceId, msg.command);
        }
      } catch {
        sendJson({ type: 'error', message: 'Mensaje JSON inválido' });
      }
    });
  });
};
