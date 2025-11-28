// /functions/api/sign.js
export async function onRequestPost({ request, env }) {
  // Basic CORS
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN ? origin : '*';
  const cors = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const body = await request.json();
    const {
      public_id,
      timestamp,
      overwrite = true,
      invalidate = true,
      upload_preset, // optional – include only if you actually use a preset
    } = body || {};

    // --- Safety 1: required fields
    if (!public_id || !timestamp) {
      return new Response(JSON.stringify({ error: 'public_id and timestamp are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // --- Safety 2: public_id path enforcement
    // Allow only: users/<uid>/pfp  OR  users/<uid>/gallery/<token>
    const pidOk = /^users\/[a-zA-Z0-9_-]{6,}\/(pfp|gallery\/[a-zA-Z0-9_-]{3,})$/.test(public_id);
    if (!pidOk) {
      return new Response(JSON.stringify({ error: 'forbidden public_id' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // --- Safety 3: whitelist the exact params we sign (sorted)
    const paramsToSign = { public_id, timestamp, overwrite, invalidate };
    if (upload_preset) paramsToSign.upload_preset = upload_preset;

    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join('&');

    // Cloudinary signature = sha1( querystring + api_secret )
    const toSign = `${sorted}${env.CLOUDINARY_API_SECRET}`;
    const signatureBuf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign));
    const signature = [...new Uint8Array(signatureBuf)].map(b => b.toString(16).padStart(2, '0')).join('');

    return new Response(JSON.stringify({
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME, // your cloud name
      timestamp,                             // echo back if useful
    }), { headers: { 'Content-Type': 'application/json', ...cors }});

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
}

// /functions/api/sign.js  (replace existing onRequestPost)
export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN ? origin : '*';
  const cors = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const body = await request.json();
    const { public_id, timestamp, overwrite = true, invalidate = true, upload_preset, op } = body || {};

    if (!public_id || !timestamp) {
      return new Response(JSON.stringify({ error: 'public_id and timestamp are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // allow only safe public_id patterns
    const pidOk = /^users\/[a-zA-Z0-9_-]{6,}\/(pfp|gallery\/[a-zA-Z0-9_-]{3,})$/.test(public_id);
    if (!pidOk) {
      return new Response(JSON.stringify({ error: 'forbidden public_id' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // Build params to sign depending on operation
    let paramsToSign = {};
    if (op === 'destroy') {
      // Cloudinary destroy signature: sign string "public_id=...&timestamp=..."
      paramsToSign = { public_id, timestamp };
    } else {
      // default: upload signature (same as before)
      paramsToSign = { public_id, timestamp, overwrite, invalidate };
      if (upload_preset) paramsToSign.upload_preset = upload_preset;
    }

    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join('&');

    const toSign = `${sorted}${env.CLOUDINARY_API_SECRET}`;
    const signatureBuf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign));
    const signature = [...new Uint8Array(signatureBuf)].map(b => b.toString(16).padStart(2, '0')).join('');

    return new Response(JSON.stringify({
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      timestamp,
    }), { headers: { 'Content-Type': 'application/json', ...cors }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
}