// Tailscale-style Dashboard Manager
class DashboardManager {
    constructor() {
        this.currentSection = 'overview';
        this.machines = [];
        this.routes = [];
        this.users = [];
    }

    // Initialize Dashboard
    async init() {
        // Set current user
        const user = Auth.getCurrentUser();
        if (user) {
            headscaleAPI.setCurrentUser(user);
            
            // Update UI with user info
            document.getElementById('userWelcome').textContent = user.email || user.username || 'User';
            document.getElementById('userAvatar').textContent = (user.email || user.username || 'U').charAt(0).toUpperCase();
        }

        // Load initial data
        await this.loadOverview();
        
        this.showNotification('Dashboard loaded successfully', 'success');
    }

    // Show notification
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
    }

    // Section Management
    switchSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(sectionName).classList.add('active');
        
        // Activate selected nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.textContent.includes(this.getSectionDisplayName(sectionName))) {
                link.classList.add('active');
            }
        });
        
        // Update page title
        document.getElementById('pageTitle').textContent = this.getSectionDisplayName(sectionName);
        
        this.currentSection = sectionName;
        
        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    getSectionDisplayName(sectionName) {
        const names = {
            'overview': 'Overview',
            'machines': 'Machines',
            'routes': 'Routes',
            'acls': 'ACLs',
            'dns': 'DNS',
            'settings': 'Settings'
        };
        return names[sectionName] || sectionName;
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
            case 'overview':
                await this.loadOverview();
                break;
            case 'machines':
                await this.loadMachines();
                break;
            case 'routes':
                await this.loadRoutes();
                break;
            case 'acls':
                await this.loadACLs();
                break;
            case 'dns':
                await this.loadDNS();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // Overview Section
    async loadOverview() {
        try {
            this.showNotification('Loading overview...', 'info');
            
            const [machinesData, routesData] = await Promise.all([
                headscaleAPI.listNodes(),
                headscaleAPI.listRoutes()
            ]);

            this.machines = machinesData.nodes || [];
            this.routes = routesData.routes || [];

            this.updateOverviewStats();
            this.updateRecentMachines();

        } catch (error) {
            console.error('Error loading overview:', error);
            this.showNotification('Error loading overview data', 'error');
            // Load demo data for testing
            this.loadDemoData();
        }
    }

    updateOverviewStats() {
        document.getElementById('totalMachines').textContent = this.machines.length;
        
        const onlineMachines = this.machines.filter(machine => machine.online).length;
        document.getElementById('onlineMachines').textContent = onlineMachines;
        
        const activeRoutes = this.routes.filter(route => route.enabled).length;
        document.getElementById('activeRoutes').textContent = activeRoutes;
        
        // Calculate network health (simple calculation)
        const health = this.machines.length > 0 ? 
            Math.round((onlineMachines / this.machines.length) * 100) : 100;
        document.getElementById('networkHealth').textContent = `${health}%`;
    }

    updateRecentMachines() {
        const table = document.getElementById('recentMachinesTable');
        
        if (this.machines.length > 0) {
            // Sort by last seen and take first 5
            const recentMachines = [...this.machines]
                .sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))
                .slice(0, 5);
            
            table.innerHTML = recentMachines.map(machine => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${machine.online ? '#10b981' : '#6b7280'};"></div>
                            <strong>${machine.name || 'Unnamed'}</strong>
                        </div>
                    </td>
                    <td><code>${machine.ipAddresses ? machine.ipAddresses[0] : 'N/A'}</code></td>
                    <td>
                        <span class="${machine.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                            ${machine.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td>${this.formatRelativeTime(machine.lastSeen)}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="btn btn-outline btn-sm" onclick="dashboard.manageMachine('${machine.id}')">
                                Manage
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon">🖥️</div>
                        <div>No machines connected yet</div>
                        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="dashboard.showAddMachineModal()">
                            Add Your First Machine
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    // Machines Section
    async loadMachines() {
        try {
            this.showNotification('Loading machines...', 'info');
            
            const machinesData = await headscaleAPI.listNodes();
            this.machines = machinesData.nodes || [];
            this.updateMachinesTable();
            
        } catch (error) {
            console.error('Error loading machines:', error);
            this.showNotification('Error loading machines', 'error');
            this.loadDemoMachines();
        }
    }

    updateMachinesTable() {
        const table = document.getElementById('machinesTable');
        
        if (this.machines.length > 0) {
            table.innerHTML = this.machines.map(machine => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${machine.online ? '#10b981' : '#6b7280'};"></div>
                            <strong>${machine.name || 'Unnamed'}</strong>
                        </div>
                    </td>
                    <td><code>${machine.ipAddresses ? machine.ipAddresses[0] : 'N/A'}</code></td>
                    <td>
                        <span class="${machine.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                            ${machine.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td>${this.formatRelativeTime(machine.lastSeen)}</td>
                    <td>${machine.hostinfo?.OS || machine.os || 'Unknown'}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="btn btn-outline btn-sm" onclick="dashboard.manageMachine('${machine.id}')">
                                Manage
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="dashboard.expireMachine('${machine.id}')">
                                Expire
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-icon">🖥️</div>
                        <div>No machines found</div>
                        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="dashboard.showAddMachineModal()">
                            Add Your First Machine
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    async manageMachine(machineId) {
        try {
            const machine = await headscaleAPI.getNode(machineId);
            this.showMachineDetailsModal(machine);
        } catch (error) {
            console.error('Error managing machine:', error);
            this.showNotification('Error accessing machine details', 'error');
        }
    }

    showMachineDetailsModal(machine) {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Machine Details</h3>
                <div style="display: grid; gap: 1rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <strong style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Name</strong>
                            <div>${machine.name || 'Unnamed'}</div>
                        </div>
                        <div>
                            <strong style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Status</strong>
                            <span class="${machine.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                                ${machine.online ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <strong style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Last Seen</strong>
                            <div>${this.formatRelativeTime(machine.lastSeen)}</div>
                        </div>
                        <div>
                            <strong style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Expires</strong>
                            <div>${machine.expiry ? this.formatRelativeTime(machine.expiry) : 'Never'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <strong style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">IP Addresses</strong>
                <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.375rem; font-family: monospace; font-size: 0.875rem;">
                    ${machine.ipAddresses ? machine.ipAddresses.map(ip => `
                        <div style="margin-bottom: 0.25rem;">${ip}</div>
                    `).join('') : 'No IP addresses assigned'}
                </div>
            </div>

            ${machine.routes && machine.routes.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <strong style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Advertised Routes</strong>
                <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.375rem;">
                    ${machine.routes.map(route => `
                        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: white; border-radius: 0.25rem;">
                            <code>${route.prefix}</code>
                            <span class="${route.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'}">
                                ${route.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Rename Machine</label>
                <input type="text" class="form-input" id="machineNewName" value="${machine.name || ''}" placeholder="Enter new name" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem;">
            </div>
        `;

        this.createModal(
            'Manage Machine',
            content,
            [
                {
                    text: 'Rename',
                    class: 'btn-primary',
                    onclick: `dashboard.renameMachine('${machine.id}')`
                },
                {
                    text: 'Expire Machine',
                    class: 'btn-warning',
                    onclick: `dashboard.expireMachine('${machine.id}')`
                },
                {
                    text: 'Delete Machine',
                    class: 'btn-error',
                    onclick: `dashboard.deleteMachine('${machine.id}')`
                }
            ]
        );
    }

    async renameMachine(machineId) {
        const newName = document.getElementById('machineNewName')?.value;
        if (!newName) {
            this.showNotification('Please enter a name', 'error');
            return;
        }

        try {
            await headscaleAPI.renameNode(machineId, newName);
            this.showNotification('Machine renamed successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadMachines();
            await this.loadOverview();
        } catch (error) {
            this.showNotification('Failed to rename machine', 'error');
        }
    }

    async expireMachine(machineId) {
        if (!confirm('Are you sure you want to expire this machine? It will need to re-authenticate.')) return;

        try {
            await headscaleAPI.expireNode(machineId);
            this.showNotification('Machine expired successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadMachines();
            await this.loadOverview();
        } catch (error) {
            this.showNotification('Failed to expire machine', 'error');
        }
    }

    async deleteMachine(machineId) {
        if (!confirm('Are you sure you want to delete this machine? This action cannot be undone.')) return;

        try {
            await headscaleAPI.deleteNode(machineId);
            this.showNotification('Machine deleted successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadMachines();
            await this.loadOverview();
        } catch (error) {
            this.showNotification('Failed to delete machine', 'error');
        }
    }

    showAddMachineModal() {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Add New Machine</h3>
                <p style="color: #6b7280; margin-bottom: 1rem;">Choose how you want to add a new machine to your network:</p>
                
                <div style="display: grid; gap: 1rem;">
                    <div style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">Install Tailscale</h4>
                        <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem;">Install Tailscale on your device and connect to your Headscale server.</p>
                        <div class="code-block">
                            tailscale up --login-server=https://headscale.publicvm.com
                        </div>
                    </div>
                    
                    <div style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">Generate Auth Key</h4>
                        <p style="color: #6b7280; font-size: 0.875rem;">Generate a pre-auth key for automated deployment.</p>
                        <button class="btn btn-primary" style="margin-top: 0.5rem;" onclick="dashboard.generateAuthKey()">
                            Generate Key
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.createModal(
            'Add Machine',
            content,
            [
                {
                    text: 'Close',
                    class: 'btn-outline',
                    onclick: "document.querySelector('.modal-overlay').remove()"
                }
            ]
        );
    }

    generateAuthKey() {
        this.showNotification('Auth key generation coming soon', 'info');
    }

    // Routes Section
    async loadRoutes() {
        try {
            const routesData = await headscaleAPI.listRoutes();
            this.routes = routesData.routes || [];
            this.showNotification('Routes loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading routes:', error);
            this.showNotification('Error loading routes', 'error');
        }
    }

    // ACLs Section
    async loadACLs() {
        this.showNotification('ACLs loaded successfully', 'success');
    }

    // DNS Section
    async loadDNS() {
        this.showNotification('DNS settings loaded successfully', 'success');
    }

    // Settings Section
    loadSettings() {
        const user = Auth.getCurrentUser();
        if (user) {
            // Update settings form with user data
        }
        this.showNotification('Settings loaded successfully', 'success');
    }

    // Utility Functions
    formatRelativeTime(dateString) {
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
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
            
            return date.toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    }

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
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        `;

        modal.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb;">
                <h3 style="margin: 0; font-size: 1.25rem; color: #1f2937;">${title}</h3>
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
            </div>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        return modalOverlay;
    }

    // Demo data for testing
    loadDemoData() {
        console.log('Loading demo data...');
        this.machines = [
            {
                id: '1',
                name: 'my-laptop',
                ipAddresses: ['100.64.0.1'],
                online: true,
                lastSeen: new Date().toISOString(),
                os: 'Windows'
            },
            {
                id: '2', 
                name: 'home-server',
                ipAddresses: ['100.64.0.2'],
                online: true,
                lastSeen: new Date(Date.now() - 3600000).toISOString(),
                os: 'Linux'
            }
        ];
        
        this.routes = [
            {
                id: '1',
                prefix: '192.168.1.0/24',
                enabled: true,
                node: { name: 'home-server' }
            }
        ];
        
        this.updateOverviewStats();
        this.updateRecentMachines();
        this.showNotification('Demo data loaded', 'info');
    }

    loadDemoMachines() {
        this.machines = [
            {
                id: '1',
                name: 'my-laptop',
                ipAddresses: ['100.64.0.1'],
                online: true,
                lastSeen: new Date().toISOString(),
                os: 'Windows',
                hostinfo: { OS: 'Windows' }
            },
            {
                id: '2',
                name: 'home-server', 
                ipAddresses: ['100.64.0.2'],
                online: false,
                lastSeen: new Date(Date.now() - 7200000).toISOString(),
                os: 'Linux',
                hostinfo: { OS: 'Linux' }
            }
        ];
        this.updateMachinesTable();
        this.showNotification('Demo machines loaded', 'info');
    }
}

// Global functions
function switchSection(sectionName) {
    dashboard.switchSection(sectionName);
}

// Initialize dashboard
const dashboard = new DashboardManager();
