// cztrainers-signature worker

// 🔒 Edit these to match your site(s)
const ALLOWED_ORIGINS = [
  "https://yourname.github.io",       // ← your GitHub Pages origin
  // "https://www.yourcustomdomain.cz" // ← add custom domain if you have it
];

const ALLOWED_KEYS = new Set([
  "public_id",
  "timestamp",
  "overwrite",
  "invalidate",
  "eager"
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function pick(obj, allowed) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    if (allowed.has(k) && obj[k] !== undefined && obj[k] !== null) {
      out[k] = obj[k];
    }
  }
  return out;
}

function isAllowedOrigin(origin) {
  return origin && ALLOWED_ORIGINS.includes(origin);
}

function safePublicId(pid) {
  // Allow only users/<anything-safe>/pfp (blocks ../ and odd characters)
  return typeof pid === "string" && /^users\/[A-Za-z0-9_-]+\/pfp$/.test(pid);
}

async function sha1Hex(str) {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin");
    const cors = corsHeaders(isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0]);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    if (!isAllowedOrigin(origin)) {
      return new Response("Origin not allowed", { status: 403, headers: cors });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: cors });
    }

    // Whitelist params & basic sanity checks
    const params = pick(body, ALLOWED_KEYS);

    // Enforce required params
    if (!params.timestamp) {
      return new Response("Missing timestamp", { status: 400, headers: cors });
    }
    if (!params.public_id || !safePublicId(params.public_id)) {
      return new Response("Invalid public_id", { status: 400, headers: cors });
    }

    // Force single-asset overwrite behavior
    params.overwrite = true;
    params.invalidate = true;

    // Build signature string: sort keys, join with &, then append API secret
    const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
    const signature = await sha1Hex(`${toSign}${env.CLOUDINARY_API_SECRET}`);

    const resJson = {
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
    };

    return new Response(JSON.stringify(resJson), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
};
