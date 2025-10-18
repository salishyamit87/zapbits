exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }
    
    try {
        const { username } = event.queryStringParameters;
        const HEADSCALE_API = 'https://headscale.publicvm.com/api/v1';
        const API_KEY = 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';
        
        // Get user from Headscale using native fetch
        const headscaleResponse = await fetch(`${HEADSCALE_API}/user/${username}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        if (headscaleResponse.ok) {
            const userData = await headscaleResponse.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    user: userData
                })
            };
        } else if (headscaleResponse.status === 404) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'User not found. Please sign up first.' 
                })
            };
        } else {
            const errorText = await headscaleResponse.text();
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: `Headscale error: ${errorText}` 
                })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Server error: ' + error.message 
            })
        };
    }
};
