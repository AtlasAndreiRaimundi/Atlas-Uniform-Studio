declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    DB?: D1Database;
    ADMIN_USER_ID?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
    AUTH_APP_URL?: string;
    BUCKET?: R2Bucket;
  }
}
