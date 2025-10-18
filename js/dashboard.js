// Dashboard Management System
class DashboardManager {
    constructor() {
        this.currentTab = 'overview';
        this.nodes = [];
        this.routes = [];
        this.users = [];
    }

    // Tab Management
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        
        // Activate selected tab button
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.textContent.toLowerCase().includes(tabName)) {
                tab.classList.add('active');
            }
        });
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch(tabName) {
            case 'overview':
                await this.loadOverview();
                break;
            case 'nodes':
                await this.loadNodes();
                break;
            case 'routes':
                await this.loadRoutes();
                break;
            case 'acls':
                await this.loadACLs();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // Overview Tab
    async loadOverview() {
        try {
            const [usersData, nodesData, routesData] = await Promise.all([
                headscaleAPI.listUsers(),
                headscaleAPI.listNodes(),
                headscaleAPI.listRoutes()
            ]);

            this.users = usersData.users || [];
            this.nodes = nodesData.nodes || [];
            this.routes = routesData.routes || [];

            this.updateOverviewStats();
            this.updateRecentNodes();

        } catch (error) {
            console.error('Error loading overview:', error);
            HeadscaleUI.showNotification('Error loading overview data', 'error');
        }
    }

    updateOverviewStats() {
        document.getElementById('totalNodes').textContent = this.nodes.length;
        
        const connectedNodes = this.nodes.filter(node => node.online).length;
        document.getElementById('connectedNodes').textContent = connectedNodes;
        
        const activeRoutes = this.routes.filter(route => route.enabled).length;
        document.getElementById('activeRoutes').textContent = activeRoutes;
        
        document.getElementById('aclRules').textContent = '1'; // Default rule
    }

    updateRecentNodes() {
        const table = document.getElementById('recentNodesTable');
        const recentNodes = this.nodes.slice(0, 5); // Show last 5 nodes
        
        if (recentNodes.length > 0) {
            table.innerHTML = recentNodes.map(node => `
                <tr>
                    <td><strong>${node.name || 'Unnamed'}</strong></td>
                    <td><code>${node.ipAddresses ? node.ipAddresses[0] : 'N/A'}</code></td>
                    <td>
                        <span class="${HeadscaleUI.getStatusClass(node.online ? 'connected' : 'disconnected')}">
                            ● ${node.online ? 'Connected' : 'Disconnected'}
                        </span>
                    </td>
                    <td>${HeadscaleUI.formatDate(node.lastSeen)}</td>
                    <td>
                        <button class="btn btn-outline" onclick="dashboard.manageNode('${node.id}')" style="padding: 0.25rem 0.5rem;">
                            Manage
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">No devices connected</td></tr>';
        }
    }

    // Nodes Tab
    async loadNodes() {
        try {
            const nodesData = await headscaleAPI.listNodes();
            this.nodes = nodesData.nodes || [];
            this.updateNodesTable();
        } catch (error) {
            console.error('Error loading nodes:', error);
            HeadscaleUI.showNotification('Error loading nodes', 'error');
        }
    }

    updateNodesTable() {
        const table = document.getElementById('nodesTable');
        
        if (this.nodes.length > 0) {
            table.innerHTML = this.nodes.map(node => `
                <tr>
                    <td>
                        <strong>${node.name || 'Unnamed'}</strong>
                        ${node.online ? '<span class="badge badge-success" style="margin-left: 0.5rem;">Online</span>' : ''}
                    </td>
                    <td><code>${node.ipAddresses ? node.ipAddresses[0] : 'N/A'}</code></td>
                    <td>
                        <span class="${HeadscaleUI.getStatusClass(node.online ? 'connected' : 'disconnected')}">
                            ● ${node.online ? 'Connected' : 'Disconnected'}
                        </span>
                    </td>
                    <td>${HeadscaleUI.formatDate(node.lastSeen)}</td>
                    <td>${node.os || 'Unknown'}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="btn btn-outline" onclick="dashboard.manageNode('${node.id}')" style="padding: 0.25rem 0.5rem;">
                                Manage
                            </button>
                            <button class="btn btn-outline" onclick="dashboard.expireNode('${node.id}')" style="padding: 0.25rem 0.5rem;">
                                Expire
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #6b7280;">No nodes found</td></tr>';
        }
    }

    async manageNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const actions = `
            <div style="margin-bottom: 1rem;">
                <strong>Node:</strong> ${node.name}<br>
                <strong>IP:</strong> ${node.ipAddresses ? node.ipAddresses[0] : 'N/A'}<br>
                <strong>Status:</strong> ${node.online ? 'Connected' : 'Disconnected'}
            </div>
            <div class="form-group">
                <label class="form-label">New Name</label>
                <input type="text" class="form-input" id="nodeNewName" value="${node.name}">
            </div>
        `;

        HeadscaleUI.createModal(
            'Manage Node',
            actions,
            [
                {
                    text: 'Rename',
                    class: 'btn-primary',
                    onclick: `dashboard.renameNode('${nodeId}')`
                },
                {
                    text: 'Delete',
                    class: 'btn-error',
                    onclick: `dashboard.deleteNode('${nodeId}')`
                }
            ]
        );
    }

    async renameNode(nodeId) {
        const newName = document.getElementById('nodeNewName').value;
        if (!newName) {
            HeadscaleUI.showNotification('Please enter a name', 'error');
            return;
        }

        try {
            await headscaleAPI.renameNode(nodeId, newName);
            HeadscaleUI.showNotification('Node renamed successfully', 'success');
            document.querySelector('.modal-overlay').remove();
            await this.loadNodes();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to rename node', 'error');
        }
    }

    async expireNode(nodeId) {
        if (!confirm('Are you sure you want to expire this node?')) return;

        try {
            await headscaleAPI.expireNode(nodeId);
            HeadscaleUI.showNotification('Node expired successfully', 'success');
            await this.loadNodes();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to expire node', 'error');
        }
    }

    async deleteNode(nodeId) {
        if (!confirm('Are you sure you want to delete this node? This action cannot be undone.')) return;

        try {
            await headscaleAPI.deleteNode(nodeId);
            HeadscaleUI.showNotification('Node deleted successfully', 'success');
            document.querySelector('.modal-overlay').remove();
            await this.loadNodes();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to delete node', 'error');
        }
    }

    showAddNodeModal() {
        const content = `
            <p>To add a new node, use the deployment instructions in the Deploy tab.</p>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 0.375rem; margin-top: 1rem;">
                <strong>Quick Command:</strong><br>
                <code style="background: #1f2937; color: white; padding: 0.5rem; display: block; margin-top: 0.5rem; border-radius: 0.25rem;">
                    tailscale up --login-server https://headscale.publicvm.com
                </code>
            </div>
        `;

        HeadscaleUI.createModal(
            'Add New Node',
            content,
            [
                {
                    text: 'Open Deploy Tab',
                    class: 'btn-primary',
                    onclick: 'dashboard.switchTab(\'deploy\'); document.querySelector(\'.modal-overlay\').remove();'
                }
            ]
        );
    }

    // Routes Tab
    async loadRoutes() {
        try {
            const routesData = await headscaleAPI.listRoutes();
            this.routes = routesData.routes || [];
            this.updateRoutesTable();
        } catch (error) {
            console.error('Error loading routes:', error);
            HeadscaleUI.showNotification('Error loading routes', 'error');
        }
    }

    updateRoutesTable() {
        const table = document.getElementById('routesTable');
        
        if (this.routes.length > 0) {
            table.innerHTML = this.routes.map(route => `
                <tr>
                    <td><code>${route.prefix}</code></td>
                    <td>${route.node.name}</td>
                    <td>
                        <span class="${HeadscaleUI.getStatusClass(route.enabled ? 'enabled' : 'disabled')}">
                            ● ${route.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </td>
                    <td>${HeadscaleUI.formatDate(route.createdAt)}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            ${route.enabled ? 
                                `<button class="btn btn-outline" onclick="dashboard.disableRoute('${route.id}')" style="padding: 0.25rem 0.5rem;">
                                    Disable
                                </button>` :
                                `<button class="btn btn-outline" onclick="dashboard.enableRoute('${route.id}')" style="padding: 0.25rem 0.5rem;">
                                    Enable
                                </button>`
                            }
                            <button class="btn btn-outline" onclick="dashboard.deleteRoute('${route.id}')" style="padding: 0.25rem 0.5rem;">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">No routes found</td></tr>';
        }
    }

    async enableRoute(routeId) {
        try {
            await headscaleAPI.enableRoute(routeId);
            HeadscaleUI.showNotification('Route enabled successfully', 'success');
            await this.loadRoutes();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to enable route', 'error');
        }
    }

    async disableRoute(routeId) {
        try {
            await headscaleAPI.disableRoute(routeId);
            HeadscaleUI.showNotification('Route disabled successfully', 'success');
            await this.loadRoutes();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to disable route', 'error');
        }
    }

    async deleteRoute(routeId) {
        if (!confirm('Are you sure you want to delete this route?')) return;

        try {
            await headscaleAPI.deleteRoute(routeId);
            HeadscaleUI.showNotification('Route deleted successfully', 'success');
            await this.loadRoutes();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to delete route', 'error');
        }
    }

    showAddRouteModal() {
        HeadscaleUI.showNotification('Route creation is managed automatically by nodes', 'info');
    }

    // ACLs Tab
    async loadACLs() {
        try {
            const aclsData = await headscaleAPI.getACLs();
            this.updateACLsDisplay(aclsData);
        } catch (error) {
            console.error('Error loading ACLs:', error);
            // Use default ACLs
            this.updateACLsDisplay({ acls: [] });
        }
    }

    updateACLsDisplay(aclsData) {
        const aclList = document.getElementById('aclRulesList');
        // For now, show default rule
        aclList.innerHTML = `
            <div class="rule-item">
                <strong>Allow all traffic</strong>
                <div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">
                    Default rule - allows all nodes to communicate
                </div>
            </div>
        `;
    }

    addACLRule() {
        const source = document.getElementById('aclSource').value;
        const dest = document.getElementById('aclDest').value;
        const ports = document.getElementById('aclPorts').value;

        HeadscaleUI.showNotification('ACL rule added (demo mode)', 'success');
        this.resetACLForm();
    }

    resetACLForm() {
        document.getElementById('aclSource').value = '*';
        document.getElementById('aclDest').value = '*';
        document.getElementById('aclPorts').value = '';
    }

    showAddACLModal() {
        HeadscaleUI.showNotification('Use the form below to add ACL rules', 'info');
    }

    // Settings Tab
    loadSettings() {
        const user = Auth.getCurrentUser();
        if (user) {
            document.getElementById('userEmail').value = user.email || 'user@example.com';
        }
    }

    copyApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        apiKeyInput.select();
        document.execCommand('copy');
        HeadscaleUI.showNotification('API key copied to clipboard', 'success');
    }

    generateNewApiKey() {
        HeadscaleUI.showNotification('New API key generated (demo)', 'success');
    }

    deleteAccount() {
        if (confirm('Are you absolutely sure? This will delete your account and all data permanently.')) {
            HeadscaleUI.showNotification('Account deletion initiated (demo)', 'warning');
            setTimeout(() => {
                Auth.logout();
            }, 2000);
        }
    }

    // Initialize Dashboard
    async init() {
        // Set welcome message
        const user = Auth.getCurrentUser();
        if (user) {
            document.getElementById('userWelcome').textContent = `Welcome, ${user.email || 'User'}!`;
        }

        // Load initial data
        await this.loadOverview();
        
        HeadscaleUI.showNotification('Dashboard loaded successfully', 'success');
    }
}

// Global functions for HTML onclick
function switchTab(tabName) {
    dashboard.switchTab(tabName);
}

function showAddNodeModal() {
    dashboard.showAddNodeModal();
}

function showAddRouteModal() {
    dashboard.showAddRouteModal();
}

function showAddACLModal() {
    dashboard.showAddACLModal();
}

function resetACLForm() {
    dashboard.resetACLForm();
}

function addACLRule() {
    dashboard.addACLRule();
}

function copyApiKey() {
    dashboard.copyApiKey();
}

function generateNewApiKey() {
    dashboard.generateNewApiKey();
}

function deleteAccount() {
    dashboard.deleteAccount();
}

// Initialize dashboard when page loads
const dashboard = new DashboardManager();
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        dashboard.init();
    }
});
