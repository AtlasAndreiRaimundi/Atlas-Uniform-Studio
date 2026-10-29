declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    ATLAS_VECTOR_ENABLED?: string;
    ATLAS_VECTOR_URL?: string;
    ATLAS_VECTOR_TOKEN?: string;
    DB?: D1Database;
    ADMIN_USER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
