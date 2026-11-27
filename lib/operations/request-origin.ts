export function isLoopbackRequest(request: Request) {
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(
    request.headers.get("host") ?? "",
  );
}

export function acceptsOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const internal = new URL(request.url);
  if (origin === internal.origin) return true;
  // Next may build request.url with localhost even when the browser uses 127.0.0.1.
  if (
    isLoopbackRequest(request) &&
    origin === `${internal.protocol}//${request.headers.get("host")}`
  )
    return true;
  // TLS can end at Railway before Next receives the request. Compare the actual Host,
  // never an arbitrary forwarded-host list, when the public request used HTTPS.
  const host = request.headers.get("host");
  if (host && origin === `https://${host}` && !isLoopbackRequest(request)) return true;
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  return (
    (Boolean(domain) && origin === `https://${domain}`) ||
    origin === process.env.RIP_PUBLIC_ORIGIN
  );
}
