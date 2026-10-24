declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_USER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
