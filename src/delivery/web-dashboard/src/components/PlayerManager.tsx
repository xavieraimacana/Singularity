import React, { useState } from 'react';
import { Users, Shield, UserX, UserMinus, ShieldAlert } from 'lucide-react';
import { api } from '../services/api-client.js';

export interface PlayerData {
  username: string;
  uuid?: string;
  joinedAt?: string;
  isOp?: boolean;
}

interface PlayerManagerProps {
  serverId: string;
  isOnline: boolean;
  players: PlayerData[];
  onPlayerActionSent?: () => void;
}

export const PlayerManager: React.FC<PlayerManagerProps> = ({
  serverId,
  isOnline,
  players,
  onPlayerActionSent
}) => {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const sendCommand = async (cmd: string) => {
    try {
      await api.post(`/servers/${serverId}/command`, { command: cmd });
      onPlayerActionSent?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al enviar comando');
    }
  };

  const handleOp = async (username: string) => {
    setActionInProgress(username);
    await sendCommand(`op ${username}`);
    setActionInProgress(null);
  };

  const handleDeop = async (username: string) => {
    setActionInProgress(username);
    await sendCommand(`deop ${username}`);
    setActionInProgress(null);
  };

  const handleKick = async (username: string) => {
    const reason = prompt(`Motivo de expulsión para ${username}:`, 'Expulsado por el operador');
    if (reason === null) return;
    setActionInProgress(username);
    await sendCommand(`kick ${username} ${reason}`);
    setActionInProgress(null);
  };

  const handleBan = async (username: string) => {
    const reason = prompt(`Motivo de baneo para ${username}:`, 'Baneado del servidor');
    if (reason === null) return;
    setActionInProgress(username);
    await sendCommand(`ban ${username} ${reason}`);
    setActionInProgress(null);
  };

  return (
    <div className="bg-nebula-900 border border-nebula-800 rounded-xl p-4 shadow-md flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-nebula-800 mb-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Users className="w-4 h-4 text-nebula-accent" />
          <h3 className="font-bold text-xs">Jugadores Conectados</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nebula-850 text-slate-400 border border-nebula-800">
          {players.length} online
        </span>
      </div>

      {!isOnline ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
          <span>Servidor offline</span>
        </div>
      ) : players.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
          <span>No hay jugadores conectados actualmente</span>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
          {players.map((player) => (
            <div
              key={player.username}
              className="flex items-center justify-between p-2 rounded-lg bg-nebula-950 border border-nebula-850 hover:border-nebula-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {/* 3D Head Avatar from Crafatar */}
                <img
                  src={`https://crafatar.com/avatars/${encodeURIComponent(player.username)}?size=32&overlay`}
                  alt={player.username}
                  className="w-8 h-8 rounded-md bg-nebula-850 shrink-0 border border-nebula-800"
                  onError={(e) => {
                    // Fallback to default steve avatar
                    (e.target as HTMLImageElement).src = 'https://crafatar.com/avatars/MHF_Steve?size=32';
                  }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 font-mono">
                      {player.username}
                    </span>
                    {player.isOp && (
                      <span className="text-[9px] font-mono font-bold px-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        OP
                      </span>
                    )}
                  </div>
                  {player.joinedAt && (
                    <span className="text-[10px] text-slate-500 block">
                      Conectado {new Date(player.joinedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Player Admin Actions */}
              <div className="flex items-center gap-1">
                {player.isOp ? (
                  <button
                    disabled={actionInProgress === player.username}
                    onClick={() => handleDeop(player.username)}
                    title="Quitar permisos de operador (/deop)"
                    className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-950/30 transition-colors disabled:opacity-40"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    disabled={actionInProgress === player.username}
                    onClick={() => handleOp(player.username)}
                    title="Otorgar permisos de operador (/op)"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  disabled={actionInProgress === player.username}
                  onClick={() => handleKick(player.username)}
                  title="Expulsar jugador (/kick)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-950/30 transition-colors disabled:opacity-40"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>

                <button
                  disabled={actionInProgress === player.username}
                  onClick={() => handleBan(player.username)}
                  title="Banear jugador (/ban)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
