declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    ATLAS_VECTOR_ENABLED?: string;
    ATLAS_VECTOR_API_URL?: string;
    ATLAS_VECTOR_API_TOKEN?: string;
    DB?: D1Database;
    ADMIN_USER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
