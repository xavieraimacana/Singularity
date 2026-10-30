import type {
  CatalogItem,
  CatalogSearchQuery,
  CatalogSearchResult,
  ContentVersion
} from '../models/catalog-item.js';

export interface IContentProvider {
  readonly id: string;
  readonly name: string;
  readonly isEnabled: boolean;

  search(query: CatalogSearchQuery): Promise<CatalogSearchResult>;
  getVersions(
    projectId: string,
    gameVersion?: string,
    loader?: string
  ): Promise<ContentVersion[]>;
}
