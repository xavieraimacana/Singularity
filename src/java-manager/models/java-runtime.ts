export interface JavaRuntime {
  readonly id: string;
  readonly majorVersion: number;
  readonly versionString: string;
  readonly path: string;
  readonly vendor: string;
  readonly isPortable: boolean;
}

export interface JavaRequirement {
  readonly minMajorVersion: number;
  readonly recommendedMajorVersion: number;
  readonly maxMajorVersion?: number;
}
