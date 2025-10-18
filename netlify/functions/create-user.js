exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    try {
        const { email, name } = JSON.parse(event.body);
        
        // For now, just simulate success - later we'll add real Headscale API
        console.log('Creating user:', email, name);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                message: 'User created successfully (Simulation)',
                username: email.split('@')[0]
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                message: 'Server error: ' + error.message 
            })
        };
    }
};
