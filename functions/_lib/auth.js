import { createRemoteJWKSet, jwtVerify } from "jose";

function normalizeDomain(domain) {
  if (!domain) throw new Error("AUTH0_DOMAIN is not configured.");
  return domain.startsWith("https://") ? domain : `https://${domain}`;
}

export async function requireUser(request, env) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return { error: new Response("Authentication required.", { status: 401 }) };
  }

  if (!env.AUTH0_DOMAIN || !env.AUTH0_AUDIENCE) {
    return {
      error: new Response("The API authentication environment is not configured.", { status: 503 }),
    };
  }

  try {
    const issuer = `${normalizeDomain(env.AUTH0_DOMAIN)}/`;
    const jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));

    const { payload } = await jwtVerify(match[1], jwks, {
      issuer,
      audience: env.AUTH0_AUDIENCE,
      algorithms: ["RS256"],
    });

    if (!payload.sub) {
      return { error: new Response("Invalid access token.", { status: 401 }) };
    }

    return { user: { sub: payload.sub } };
  } catch {
    return { error: new Response("Invalid or expired access token.", { status: 401 }) };
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(message, status = 400) {
  return json({ error: message }, status);
}

export function isValidText(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}
