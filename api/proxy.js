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
  
  // Environment variables se values lo (Vercel pe set karein)
  const HEADSCALE_URL = process.env.HEADSCALE_URL || 'https://headscale.publicvm.com';
  const API_KEY = process.env.HEADSCALE_API_KEY || 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';

  console.log(`Proxying ${request.method} request to: ${HEADSCALE_URL}/api/v1/${path}`);

  try {
    const url = `${HEADSCALE_URL}/api/v1/${path}`;
    
    const apiResponse = await fetch(url, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: request.method !== 'GET' && request.method !== 'DELETE' ? JSON.stringify(request.body) : undefined,
    });

    console.log(`Headscale API response status: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Headscale API error ${apiResponse.status}:`, errorText);
      
      // Return proper error response
      response.status(apiResponse.status).json({ 
        error: true,
        message: errorText,
        status: apiResponse.status
      });
      return;
    }

    // Try to parse JSON response
    try {
      const data = await apiResponse.json();
      response.status(200).json(data);
    } catch (parseError) {
      // If no JSON content, return success
      response.status(200).json({ success: true });
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Return structured error response
    response.status(500).json({ 
      error: true,
      message: 'Internal server error',
      details: error.message
    });
  }
}
