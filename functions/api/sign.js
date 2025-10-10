// Cloudflare Pages Function
export async function onRequest(context) {
  const { request } = context;

  // allow your production & preview origins
  const allowed = new Set([
    'https://cztrainers.com',
    'https://www.cztrainers.com',
    'http://localhost:5500',   // dev
    'http://127.0.0.1:5500'
  ]);

  const origin = request.headers.get('Origin') || '';
  const allowOrigin = allowed.has(origin) ? origin : 'https://cztrainers.com';

  // common CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // TODO: generate your signature / do your logic here
  // Example response payload:
  const payload = { ok: true };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}