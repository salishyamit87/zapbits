// Complete Headscale API Integration
class HeadscaleAPI {
    constructor() {
        this.baseURL = '';
        this.apiKey = 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';
        this.useProxy = true;
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            let url;
            let headers = {
                'Content-Type': 'application/json'
            };

            if (this.useProxy) {
                url = `/api/proxy?path=${endpoint.replace(/^\//, '')}`;
            } else {
                url = `https://headscale.publicvm.com/api/v1${endpoint}`;
                headers['Authorization'] = `Bearer ${this.apiKey}`;
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

    async renameNode(nodeId, newName) {
        return await this.makeRequest(`/node/${nodeId}/rename`, 'POST', { name: newName });
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

    async deleteRoute(routeId) {
        return await this.makeRequest(`/routes/${routeId}`, 'DELETE');
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

    // ACL Management
    async getACLs() {
        return await this.makeRequest('/acl');
    }

    async updateACLs(aclConfig) {
        return await this.makeRequest('/acl', 'POST', aclConfig);
    }
}

// Utility Functions
const HeadscaleUI = {
    formatDate(dateString) {
        if (!dateString) return 'Never';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        // Remove existing modal
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
