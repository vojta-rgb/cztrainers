// functions/api/sign.js
export async function onRequestPost({ request, env }) {
  // Basic CORS
  const origin = request.headers.get('Origin') || '';
  const allowOrigin =
    env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN ? origin : '*';

  const cors = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const { public_id, timestamp, ...rest } = await request.json();

    // Build the string to sign
    // Include only the params you’ll send to Cloudinary (in the same order Cloudinary expects)
    const paramsToSign = {
      public_id,
      timestamp,
      ...rest, // e.g. overwrite:true, invalidate:true
    };

    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join('&');

    const toSign = `${sorted}${env.CLOUDINARY_API_SECRET}`;
    const signature = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(toSign)
    );
    const hex = [...new Uint8Array(signature)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return new Response(
      JSON.stringify({
        signature: hex,
        apiKey: env.CLOUDINARY_API_KEY, // <-- IMPORTANT name
        timestamp,                      // echo back if you want
        cloudName: env.CLOUDINARY_CLOUD_NAME, // optional
      }),
      { headers: { 'Content-Type': 'application/json', ...cors } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } }
    );
  }
}
