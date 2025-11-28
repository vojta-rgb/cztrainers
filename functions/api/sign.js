// functions/api/sign.js
// Cloudflare Pages Function: sign Cloudinary upload & destroy requests
// Required env vars: CLOUDINARY_API_SECRET, CLOUDINARY_API_KEY, CLOUDINARY_CLOUD_NAME
// Optional env var: ALLOWED_ORIGIN (for strict CORS)

export async function onRequestOptions({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN ? origin : "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN ? origin : "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { public_id, timestamp, overwrite = true, invalidate = true, upload_preset, op } = body || {};

    // Basic required fields
    if (!public_id || !timestamp) {
      return new Response(JSON.stringify({ error: "public_id and timestamp are required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Safety: allow only your intended public_id patterns
    // Adjust this regex if your public_id structure changes.
    const pidOk = /^users\/[a-zA-Z0-9_-]{6,}\/(pfp|gallery\/[a-zA-Z0-9_-]{3,})$/.test(public_id);
    if (!pidOk) {
      return new Response(JSON.stringify({ error: "forbidden public_id" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Build the params object to sign depending on operation
    let paramsToSign = {};
    if (op === "destroy") {
      // destroy signature uses only public_id and timestamp
      paramsToSign = { public_id, timestamp };
    } else {
      // upload signature: include overwrite/invalidate and optional upload_preset
      paramsToSign = { public_id, timestamp, overwrite, invalidate };
      if (upload_preset) paramsToSign.upload_preset = upload_preset;
    }

    // Create sorted querystring "key=value&key2=value2"
    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");

    // Compute SHA-1(signatureString + API_SECRET)
    const toSign = `${sorted}${env.CLOUDINARY_API_SECRET}`;
    const buf = new TextEncoder().encode(toSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", buf);
    const signature = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // Return signer response
    return new Response(JSON.stringify({
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      timestamp,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}