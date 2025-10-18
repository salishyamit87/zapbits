// Headscale API Configuration
const HEADSCALE_CONFIG = {
    baseURL: 'https://headscale.publicvm.com',
    apiKey: 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2',
    apiVersion: 'v1'
};

// API Helper Functions
class HeadscaleAPI {
    constructor() {
        this.baseURL = HEADSCALE_CONFIG.baseURL;
        this.apiKey = HEADSCALE_CONFIG.apiKey;
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.baseURL}/api/${HEADSCALE_CONFIG.apiVersion}${endpoint}`;
            const options = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // User Management
    async listUsers() {
        return await this.makeRequest('/user');
    }

    async createUser(username) {
        return await this.makeRequest('/user', 'POST', { name: username });
    }

    async deleteUser(username) {
        return await this.makeRequest(`/user/${username}`, 'DELETE');
    }

    // Node Management
    async listNodes() {
        return await this.makeRequest('/node');
    }

    async getNode(nodeId) {
        return await this.makeRequest(`/node/${nodeId}`);
    }

    async deleteNode(nodeId) {
        return await this.makeRequest(`/node/${nodeId}`, 'DELETE');
    }

    async expireNode(nodeId) {
        return await this.makeRequest(`/node/${nodeId}/expire`, 'POST');
    }

    // Route Management
    async listRoutes() {
        return await this.makeRequest('/routes');
    }

    async enableRoute(routeId) {
        return await this.makeRequest(`/routes/${routeId}/enable`, 'POST');
    }

    async disableRoute(routeId) {
        return await this.makeRequest(`/routes/${routeId}/disable`, 'POST');
    }

    // API Key Management
    async listApiKeys() {
        return await this.makeRequest('/apikey');
    }

    async createApiKey(expiration = '90d') {
        return await this.makeRequest('/apikey', 'POST', { expiration: expiration });
    }

    async expireApiKey(prefix) {
        return await this.makeRequest(`/apikey/${prefix}`, 'DELETE');
    }
}

// Initialize API
const headscaleAPI = new HeadscaleAPI();

// Utility Functions for UI
const HeadscaleUI = {
    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },

    // Get status badge class
    getStatusClass(status) {
        const statusMap = {
            'online': 'status-connected',
            'offline': 'status-disconnected',
            'connected': 'status-connected',
            'disconnected': 'status-disconnected'
        };
        return statusMap[status] || 'status-unknown';
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

// Demo data for testing (remove in production)
const demoData = {
    users: [
        { id: '1', name: 'user1@example.com', createdAt: new Date().toISOString() },
        { id: '2', name: 'user2@example.com', createdAt: new Date().toISOString() }
    ],
    nodes: [
        { id: '1', name: 'laptop-user', ip: '100.64.0.1', status: 'connected', lastSeen: new Date().toISOString() },
        { id: '2', name: 'server-prod', ip: '100.64.0.2', status: 'connected', lastSeen: new Date().toISOString() },
        { id: '3', name: 'phone-mobile', ip: '100.64.0.3', status: 'disconnected', lastSeen: new Date(Date.now() - 3600000).toISOString() }
    ],
    routes: [
        { id: '1', prefix: '100.64.0.0/24', enabled: true, node: 'laptop-user' },
        { id: '2', prefix: '100.64.1.0/24', enabled: false, node: 'server-prod' }
    ]
};
