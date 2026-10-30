export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'critical';

export type DiagnosticActionType =
  | 'CHANGE_JAVA_VERSION'
  | 'INCREASE_RAM'
  | 'REMOVE_MOD'
  | 'CHANGE_PORT'
  | 'INSTALL_DEPENDENCY'
  | 'DELETE_CORRUPTED_CHUNK'
  | 'MANUAL_REVIEW';

export interface DiagnosticAction {
  readonly type: DiagnosticActionType;
  readonly label: string;
  readonly targetVersion?: number;
  readonly targetMod?: string;
  readonly targetPort?: number;
}

export interface DiagnosticResult {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly title: string;
  readonly explanation: string;
  readonly matchedLine?: string;
  readonly suggestedAction: DiagnosticAction;
  readonly details?: {
    readonly modName?: string;
    readonly missingMod?: string;
    readonly requiredVersion?: string;
    readonly javaRequired?: number;
    readonly javaCurrent?: number;
    readonly port?: number;
  };
}
