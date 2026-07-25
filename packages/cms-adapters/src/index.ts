export type CmsPlatform = 'wordpress' | 'joomla' | 'opencart';

export interface CmsSiteInfo {
  id: string;
  name: string;
  url: string;
  platform: CmsPlatform;
  version?: string;
}

export interface ContentListParams {
  page: number;
  pageSize: number;
  updatedAfter?: string;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CmsContentItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  url: string;
  updatedAt: string;
}

export interface CmsContentDetail extends CmsContentItem {
  html: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CmsUpdatePayload {
  title?: string;
  slug?: string;
  html?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CmsPreviewResult {
  contentId: string;
  changedFields: string[];
}

export interface CmsApplyResult {
  contentId: string;
  snapshotId: string;
  appliedAt: string;
}

export interface CmsRollbackResult {
  contentId: string;
  snapshotId: string;
  rolledBackAt: string;
}

export interface MediaListParams {
  page: number;
  pageSize: number;
}

export interface CmsMediaItem {
  id: string;
  url: string;
  altText?: string;
}

export interface CmsUploadMediaPayload {
  fileName: string;
  mimeType: string;
  content: Uint8Array;
  altText?: string;
}

export interface CmsAdapterCapabilities {
  platform: CmsPlatform;
  canPreviewUpdates: boolean;
  canRollback: boolean;
  supportedContentTypes: string[];
}

export interface CmsAdapter {
  getCapabilities(): CmsAdapterCapabilities;
  getSiteInfo(): Promise<CmsSiteInfo>;
  listContent(params: ContentListParams): Promise<PaginatedResult<CmsContentItem>>;
  getContent(contentId: string): Promise<CmsContentDetail>;
  previewUpdate(contentId: string, payload: CmsUpdatePayload): Promise<CmsPreviewResult>;
  applyUpdate(contentId: string, payload: CmsUpdatePayload): Promise<CmsApplyResult>;
  rollbackContent(contentId: string, snapshotId: string): Promise<CmsRollbackResult>;
  listMedia(params: MediaListParams): Promise<PaginatedResult<CmsMediaItem>>;
  uploadMedia(payload: CmsUploadMediaPayload): Promise<CmsMediaItem>;
}

export function createWordPressAdapter(): CmsAdapter {
  return {
    getCapabilities() {
      return {
        platform: 'wordpress',
        canPreviewUpdates: true,
        canRollback: true,
        supportedContentTypes: ['post', 'page', 'media']
      };
    },
    async getSiteInfo() {
      return {
        id: 'wordpress-local',
        name: 'WordPress Local',
        url: 'http://localhost',
        platform: 'wordpress'
      };
    },
    async listContent(params) {
      return {
        items: [],
        page: params.page,
        pageSize: params.pageSize,
        total: 0
      };
    },
    async getContent(contentId) {
      return {
        id: contentId,
        title: '',
        slug: '',
        status: 'draft',
        url: '',
        updatedAt: new Date(0).toISOString(),
        html: ''
      };
    },
    async previewUpdate(contentId, payload) {
      return {
        contentId,
        changedFields: Object.keys(payload)
      };
    },
    async applyUpdate(contentId) {
      return {
        contentId,
        snapshotId: crypto.randomUUID(),
        appliedAt: new Date().toISOString()
      };
    },
    async rollbackContent(contentId, snapshotId) {
      return {
        contentId,
        snapshotId,
        rolledBackAt: new Date().toISOString()
      };
    },
    async listMedia(params) {
      return {
        items: [],
        page: params.page,
        pageSize: params.pageSize,
        total: 0
      };
    },
    async uploadMedia(payload) {
      return {
        id: crypto.randomUUID(),
        url: `media://${payload.fileName}`,
        altText: payload.altText
      };
    }
  };
}
