// CORS headers for Edge Functions
// Allows satellite apps and ERP frontend to call functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function handleCorsOptions(): Response {
  return new Response('ok', { headers: corsHeaders })
}
