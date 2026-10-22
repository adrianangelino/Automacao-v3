const LOCAL_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isAuthorized(
  request: { ip?: string; authorization?: string },
  token: string,
): boolean {
  if (!token) return true;
  if (request.ip && LOCAL_IPS.has(request.ip)) return true;
  return request.authorization === `Bearer ${token}`;
}
