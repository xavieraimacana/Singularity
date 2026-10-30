export type ProjectType = 'mod' | 'plugin' | 'modpack' | 'datapack';

export interface CatalogItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly projectType: ProjectType;
  readonly categories: string[];
  readonly downloads: number;
  readonly iconUrl?: string;
  readonly author: string;
  readonly providerId: string;
}

export interface CatalogSearchQuery {
  readonly query: string;
  readonly projectType?: ProjectType;
  readonly loader?: string;
  readonly gameVersion?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface CatalogSearchResult {
  readonly items: CatalogItem[];
  readonly totalHits: number;
  readonly offset: number;
  readonly limit: number;
}

export interface VersionDependency {
  readonly projectId: string;
  readonly versionId?: string;
  readonly dependencyType: 'required' | 'optional' | 'incompatible';
}

export interface ContentVersion {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly versionNumber: string;
  readonly gameVersions: string[];
  readonly loaders: string[];
  readonly fileName: string;
  readonly downloadUrl: string;
  readonly size: number;
  readonly hashes: {
    readonly sha1?: string;
    readonly sha512?: string;
    readonly sha256?: string;
  };
  readonly dependencies: VersionDependency[];
}

export interface InstallContentRequest {
  readonly instanceId: string;
  readonly providerId: string;
  readonly projectId: string;
  readonly projectType: ProjectType;
  readonly versionId: string;
  readonly versionNumber: string;
  readonly fileName: string;
  readonly downloadUrl: string;
  readonly hashes?: {
    readonly sha1?: string;
    readonly sha512?: string;
    readonly sha256?: string;
  };
}

export interface InstalledItem {
  readonly id: string;
  readonly projectId: string;
  readonly providerId: string;
  readonly projectType: ProjectType;
  readonly versionId: string;
  readonly versionNumber: string;
  readonly fileName: string;
  readonly installedAt: string;
}

export interface InstanceManifest {
  readonly instanceId: string;
  installedItems: InstalledItem[];
  updatedAt: string;
}
