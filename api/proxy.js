export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const { query } = request;
  const path = query.path || '';
  const HEADSCALE_URL = 'https://headscale.publicvm.com';
  const API_KEY = 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';

  try {
    const url = `${HEADSCALE_URL}/api/v1/${path}`;
    console.log('Proxying to:', url);
    
    const apiResponse = await fetch(url, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      throw new Error(`Headscale API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    response.status(200).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}
