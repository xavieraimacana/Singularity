export type ServerLoader = 'vanilla' | 'paper' | 'purpur' | 'fabric' | 'forge' | 'neoforge' | 'spigot' | 'quilt';

export type ServerStatus = 'offline' | 'starting' | 'online' | 'stopping' | 'crashed';

export interface ServerInstance {
  readonly id: string;
  name: string;
  loader: ServerLoader;
  gameVersion: string;
  loaderVersion?: string;
  memoryMb: number;
  port: number;
  rconPort?: number;
  javaPath?: string;
  jvmArgs?: string[];
  autoRestart: boolean;
  status: ServerStatus;
  eulaAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServerInstanceOptions {
  name: string;
  loader: ServerLoader;
  gameVersion: string;
  loaderVersion?: string;
  memoryMb?: number;
  port?: number;
  javaPath?: string;
  jvmArgs?: string[];
  autoRestart?: boolean;
}
