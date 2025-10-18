// Enhanced Headscale API with User Isolation
class HeadscaleAPI {
    constructor() {
        this.baseURL = '';
        this.adminApiKey = 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';
        this.useProxy = true;
        this.currentUser = null;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            let url;
            let headers = {
                'Content-Type': 'application/json'
            };

            if (this.useProxy) {
                url = `/api/proxy?path=${endpoint.replace(/^\//, '')}`;
                // Always use admin API key for proxy
                headers['X-Admin-Key'] = this.adminApiKey;
            } else {
                url = `https://headscale.publicvm.com/api/v1${endpoint}`;
                headers['Authorization'] = `Bearer ${this.adminApiKey}`;
            }

            const options = {
                method: method,
                headers: headers
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            console.log(`API ${method}: ${endpoint}`);
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
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

    // Node Management - USER SPECIFIC
    async listNodes() {
        const allNodes = await this.makeRequest('/node');
        
        if (!this.currentUser) {
            return { nodes: [] };
        }

        // Filter nodes for current user only
        const userNodes = allNodes.nodes ? allNodes.nodes.filter(node => {
            // Check if node belongs to current user
            // This is a simple filter - in real scenario, you'd have proper user-node mapping
            return node.user && node.user.name === this.currentUser.username;
        }) : [];

        return { nodes: userNodes };
    }

    async getNode(nodeId) {
        const node = await this.makeRequest(`/node/${nodeId}`);
        
        // Check if node belongs to current user
        if (this.currentUser && node.user && node.user.name === this.currentUser.username) {
            return node;
        } else {
            throw new Error('Access denied');
        }
    }

    async deleteNode(nodeId) {
        // First verify node belongs to user
        const node = await this.getNode(nodeId);
        return await this.makeRequest(`/node/${nodeId}`, 'DELETE');
    }

    async expireNode(nodeId) {
        // First verify node belongs to user
        const node = await this.getNode(nodeId);
        return await this.makeRequest(`/node/${nodeId}/expire`, 'POST');
    }

    async renameNode(nodeId, newName) {
        // First verify node belongs to user
        const node = await this.getNode(nodeId);
        return await this.makeRequest(`/node/${nodeId}/rename`, 'POST', { name: newName });
    }

    // Route Management - USER SPECIFIC
    async listRoutes() {
        const allRoutes = await this.makeRequest('/routes');
        
        if (!this.currentUser) {
            return { routes: [] };
        }

        // Filter routes for current user's nodes only
        const userRoutes = allRoutes.routes ? allRoutes.routes.filter(route => {
            return route.node && route.node.user && route.node.user.name === this.currentUser.username;
        }) : [];

        return { routes: userRoutes };
    }

    async enableRoute(routeId) {
        // First verify route belongs to user's node
        const allRoutes = await this.listRoutes();
        const userRoute = allRoutes.routes.find(route => route.id === routeId);
        
        if (!userRoute) {
            throw new Error('Access denied');
        }
        
        return await this.makeRequest(`/routes/${routeId}/enable`, 'POST');
    }

    async disableRoute(routeId) {
        // First verify route belongs to user's node
        const allRoutes = await this.listRoutes();
        const userRoute = allRoutes.routes.find(route => route.id === routeId);
        
        if (!userRoute) {
            throw new Error('Access denied');
        }
        
        return await this.makeRequest(`/routes/${routeId}/disable`, 'POST');
    }

    async deleteRoute(routeId) {
        // First verify route belongs to user's node
        const allRoutes = await this.listRoutes();
        const userRoute = allRoutes.routes.find(route => route.id === routeId);
        
        if (!userRoute) {
            throw new Error('Access denied');
        }
        
        return await this.makeRequest(`/routes/${routeId}`, 'DELETE');
    }

    // Pre-auth Keys - FOR USER DEPLOYMENT
    async createPreAuthKey(user, reusable = true, ephemeral = false, expiration = '24h') {
        return await this.makeRequest(`/user/${user}/preauthkey`, 'POST', {
            reusable: reusable,
            ephemeral: ephemeral,
            expiration: expiration
        });
    }

    async listPreAuthKeys(user) {
        return await this.makeRequest(`/user/${user}/preauthkey`);
    }

    async expirePreAuthKey(user, key) {
        return await this.makeRequest(`/user/${user}/preauthkey/${key}`, 'POST');
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

// Utility Functions
const HeadscaleUI = {
    formatDate(dateString) {
        if (!dateString) return 'Never';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return date.toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    },

    getStatusClass(status) {
        const statusMap = {
            'online': 'status-connected',
            'offline': 'status-disconnected',
            'connected': 'status-connected',
            'disconnected': 'status-disconnected',
            'enabled': 'status-enabled',
            'disabled': 'status-disabled'
        };
        return statusMap[status] || 'status-unknown';
    },

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(note => note.remove());
        
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            z-index: 1000;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    },

    createModal(title, content, buttons = []) {
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 0.5rem;
            padding: 0;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        `;

        modal.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb;">
                <h3 style="margin: 0; font-size: 1.25rem;">${title}</h3>
            </div>
            <div style="padding: 1.5rem;">
                ${content}
            </div>
            <div style="padding: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; justify-content: flex-end;">
                ${buttons.map(btn => `
                    <button class="btn ${btn.class || 'btn-outline'}" onclick="${btn.onclick}">
                        ${btn.text}
                    </button>
                `).join('')}
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        return modalOverlay;
    }
};

// Initialize API
const headscaleAPI = new HeadscaleAPI();
