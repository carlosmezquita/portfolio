import { createRemoteJWKSet, jwtVerify } from 'jose';

// Cache only public signing keys, never a visitor's identity or token.
let cachedDomain;
let cachedKeys;
export function configurationReady(env) {
  return /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN || '')
    && /^[a-f0-9]{64}$/.test(env.ACCESS_AUD || '')
    && typeof env.OWNER_EMAIL === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.OWNER_EMAIL);
}

export async function verifyOwner(token, env, keys) {
  if (!configurationReady(env) || typeof token !== 'string' || !token || token.length > 16000) return false;
  try {
    if (!keys) {
      if (cachedDomain !== env.ACCESS_TEAM_DOMAIN) {
        cachedKeys = createRemoteJWKSet(new URL(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`), { timeoutDuration: 5000 });
        cachedDomain = env.ACCESS_TEAM_DOMAIN;
      }
      keys = cachedKeys;
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`, audience: env.ACCESS_AUD,
      algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub', 'email'],
      clockTolerance: 5,
    });
    return typeof payload.email === 'string'
      && payload.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase()
      && payload.type === 'app';
  } catch { return false; }
}
