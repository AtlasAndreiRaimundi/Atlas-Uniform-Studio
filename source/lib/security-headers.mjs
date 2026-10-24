// Keep the studio's own frames and ChatGPT embedding working. External sites
// cannot frame an authenticated editor or submit forms through its pages.
const PAGE_POLICY="base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com";
export function secureResponse(request,response) {
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if (new URL(request.url).protocol==='https:') headers.set('Strict-Transport-Security','max-age=31536000');
  if (headers.get('Content-Type')?.toLowerCase().includes('text/html')) {
    headers.set('Content-Security-Policy',headers.get('Content-Security-Policy')||PAGE_POLICY);
    headers.set('Cache-Control','private, no-store');
    headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
