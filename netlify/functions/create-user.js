const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }
    
    try {
        const { email, name } = JSON.parse(event.body);
        const HEADSCALE_API = 'https://headscale.publicvm.com/api/v1';
        const API_KEY = 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';
        
        // Create user in Headscale
        const headscaleResponse = await fetch(`${HEADSCALE_API}/user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: email.split('@')[0].toLowerCase(),
                email: email
            })
        });
        
        if (headscaleResponse.ok) {
            const userData = await headscaleResponse.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    message: 'User created successfully',
                    user: userData
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
