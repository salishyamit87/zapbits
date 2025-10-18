exports.handler = async function(event, context) {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    try {
        // For now, return demo data - later we'll connect to real Headscale API
        const demoNodes = [
            { 
                id: 1, 
                name: 'My Laptop', 
                ip: '100.64.0.1', 
                online: true, 
                lastSeen: new Date().toISOString() 
            },
            { 
                id: 2, 
                name: 'Office PC', 
                ip: '100.64.0.2', 
                online: true, 
                lastSeen: new Date().toISOString() 
            },
            { 
                id: 3, 
                name: 'Home Server', 
                ip: '100.64.0.3', 
                online: false, 
                lastSeen: new Date().toISOString() 
            }
        ];
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                nodes: demoNodes,
                message: 'Demo data - Real Headscale integration coming soon'
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
