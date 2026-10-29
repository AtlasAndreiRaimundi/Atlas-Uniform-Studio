declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    DB?: D1Database;
    ADMIN_USER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
