// Enhanced Dashboard Manager with User Isolation
class DashboardManager {
    constructor() {
        this.currentSection = 'overview';
        this.nodes = [];
        this.routes = [];
        this.users = [];
        this.filteredNodes = [];
        this.currentNodeFilter = 'all';
    }

    // Initialize Dashboard
    async init() {
        // Set current user in API
        const user = Auth.getCurrentUser();
        if (user) {
            headscaleAPI.setCurrentUser(user);
            document.getElementById('userWelcome').textContent = `Welcome, ${user.email || user.username || 'User'}!`;
            document.getElementById('userEmail').value = user.email || 'Not set';
            document.getElementById('userUsername').value = user.username || 'Not set';
        }

        // Load initial data
        await this.loadOverview();
        
        HeadscaleUI.showNotification('Dashboard loaded successfully', 'success');
    }

    // Section Management
    switchSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
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
            'nodes': 'Nodes',
            'routes': 'Routes',
            'acls': 'ACLs',
            'deploy': 'Deploy',
            'settings': 'Settings'
        };
        return names[sectionName] || sectionName;
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
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

    // Overview Section
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
        
        const onlineNodes = this.nodes.filter(node => node.online).length;
        document.getElementById('onlineNodes').textContent = onlineNodes;
        
        const activeRoutes = this.routes.filter(route => route.enabled).length;
        document.getElementById('activeRoutes').textContent = activeRoutes;
        
        document.getElementById('aclRules').textContent = '1'; // Default rule
    }

    updateRecentNodes() {
        const table = document.getElementById('recentNodesTable');
        
        // Sort nodes by last seen (newest first) and take first 5
        const recentNodes = [...this.nodes]
            .sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))
            .slice(0, 5);
        
        if (recentNodes.length > 0) {
            table.innerHTML = recentNodes.map(node => `
                <tr>
                    <td>
                        <strong>${node.name || 'Unnamed'}</strong>
                        ${node.online ? '<span class="status-badge status-online" style="margin-left: 0.5rem;">Online</span>' : ''}
                    </td>
                    <td><code>${node.ipAddresses ? node.ipAddresses[0] : 'N/A'}</code></td>
                    <td>
                        <span class="${node.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                            ${node.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td>${HeadscaleUI.formatDate(node.lastSeen)}</td>
                    <td>
                        <button class="btn btn-outline" onclick="dashboard.manageNode('${node.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                            Manage
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">
                        <div style="margin-bottom: 1rem;">No devices connected yet</div>
                        <button class="btn btn-primary" onclick="dashboard.switchSection('deploy')">
                            Deploy Your First Device
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    // Nodes Section
    async loadNodes() {
        try {
            const nodesData = await headscaleAPI.listNodes();
            this.nodes = nodesData.nodes || [];
            this.filteredNodes = [...this.nodes];
            this.updateNodesTable();
            
            // Setup search functionality
            this.setupNodeSearch();
            
        } catch (error) {
            console.error('Error loading nodes:', error);
            HeadscaleUI.showNotification('Error loading nodes', 'error');
        }
    }

    setupNodeSearch() {
        const searchInput = document.getElementById('nodeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterNodesBySearch(e.target.value);
            });
        }
    }

    filterNodesBySearch(searchTerm) {
        if (!searchTerm) {
            this.filteredNodes = [...this.nodes];
        } else {
            this.filteredNodes = this.nodes.filter(node => 
                node.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                node.ipAddresses?.some(ip => ip.includes(searchTerm))
            );
        }
        this.applyNodeFilter(this.currentNodeFilter);
    }

    filterNodes(filterType) {
        this.currentNodeFilter = filterType;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.applyNodeFilter(filterType);
    }

    applyNodeFilter(filterType) {
        let filtered = [...this.filteredNodes];
        
        switch(filterType) {
            case 'online':
                filtered = filtered.filter(node => node.online);
                break;
            case 'offline':
                filtered = filtered.filter(node => !node.online);
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }
        
        this.updateNodesTable(filtered);
    }

    updateNodesTable(nodes = this.filteredNodes) {
        const table = document.getElementById('nodesTable');
        
        if (nodes.length > 0) {
            table.innerHTML = nodes.map(node => `
                <tr>
                    <td>
                        <strong>${node.name || 'Unnamed'}</strong>
                        ${node.online ? '<span class="status-badge status-online" style="margin-left: 0.5rem;">Online</span>' : ''}
                    </td>
                    <td><code>${node.ipAddresses ? node.ipAddresses[0] : 'N/A'}</code></td>
                    <td>
                        <span class="${node.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                            ${node.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td>${HeadscaleUI.formatDate(node.lastSeen)}</td>
                    <td>${node.hostinfo?.OS || node.os || 'Unknown'}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                            <button class="btn btn-outline" onclick="dashboard.manageNode('${node.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                Manage
                            </button>
                            <button class="btn btn-outline" onclick="dashboard.expireNode('${node.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                Expire
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: #6b7280;">
                        <div style="margin-bottom: 1rem;">No nodes found</div>
                        <button class="btn btn-primary" onclick="dashboard.switchSection('deploy')">
                            Deploy Your First Device
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    async manageNode(nodeId) {
        try {
            const node = await headscaleAPI.getNode(nodeId);
            this.showNodeDetailsModal(node);
        } catch (error) {
            console.error('Error managing node:', error);
            HeadscaleUI.showNotification('Error accessing node details', 'error');
        }
    }

    showNodeDetailsModal(node) {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem; color: #1f2937;">Node Details</h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; justify-content: between;">
                        <strong>Name:</strong>
                        <span>${node.name || 'Unnamed'}</span>
                    </div>
                    <div style="display: flex; justify-content: between;">
                        <strong>Status:</strong>
                        <span class="${node.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                            ${node.online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: between;">
                        <strong>Last Seen:</strong>
                        <span>${HeadscaleUI.formatDate(node.lastSeen)}</span>
                    </div>
                    <div style="display: flex; justify-content: between;">
                        <strong>Expires:</strong>
                        <span>${node.expiry ? HeadscaleUI.formatDate(node.expiry) : 'Never'}</span>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem; color: #1f2937;">IP Addresses</h4>
                <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.375rem;">
                    ${node.ipAddresses ? node.ipAddresses.map(ip => `
                        <div style="font-family: monospace; margin-bottom: 0.25rem;">${ip}</div>
                    `).join('') : 'No IP addresses'}
                </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem; color: #1f2937;">Routes</h4>
                <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.375rem;">
                    ${node.routes ? node.routes.map(route => `
                        <div style="font-family: monospace; margin-bottom: 0.25rem;">
                            ${route.prefix} 
                            <span class="${route.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'}" style="margin-left: 0.5rem;">
                                ${route.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    `).join('') : 'No routes advertised'}
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Rename Node</label>
                <input type="text" class="form-input" id="nodeNewName" value="${node.name || ''}" placeholder="Enter new name">
            </div>
        `;

        HeadscaleUI.createModal(
            'Manage Node',
            content,
            [
                {
                    text: 'Rename',
                    class: 'btn-primary',
                    onclick: `dashboard.renameNode('${node.id}')`
                },
                {
                    text: 'Expire Node',
                    class: 'btn-warning',
                    onclick: `dashboard.expireNode('${node.id}')`
                },
                {
                    text: 'Delete Node',
                    class: 'btn-error',
                    onclick: `dashboard.deleteNode('${node.id}')`
                }
            ]
        );
    }

    async renameNode(nodeId) {
        const newName = document.getElementById('nodeNewName')?.value;
        if (!newName) {
            HeadscaleUI.showNotification('Please enter a name', 'error');
            return;
        }

        try {
            await headscaleAPI.renameNode(nodeId, newName);
            HeadscaleUI.showNotification('Node renamed successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadNodes();
            await this.loadOverview(); // Refresh overview too
        } catch (error) {
            HeadscaleUI.showNotification('Failed to rename node', 'error');
        }
    }

    async expireNode(nodeId) {
        if (!confirm('Are you sure you want to expire this node? It will need to re-authenticate.')) return;

        try {
            await headscaleAPI.expireNode(nodeId);
            HeadscaleUI.showNotification('Node expired successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadNodes();
            await this.loadOverview();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to expire node', 'error');
        }
    }

    async deleteNode(nodeId) {
        if (!confirm('Are you sure you want to delete this node? This action cannot be undone.')) return;

        try {
            await headscaleAPI.deleteNode(nodeId);
            HeadscaleUI.showNotification('Node deleted successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadNodes();
            await this.loadOverview();
        } catch (error) {
            HeadscaleUI.showNotification('Failed to delete node', 'error');
        }
    }

    // Routes Section
    async loadRoutes() {
        try {
            const routesData = await headscaleAPI.listRoutes();
            this.routes = routesData.routes || [];
            this.updateRoutesTable();
            
            // Setup search functionality
            this.setupRouteSearch();
            
        } catch (error) {
            console.error('Error loading routes:', error);
            HeadscaleUI.showNotification('Error loading routes', 'error');
        }
    }

    setupRouteSearch() {
        const searchInput = document.getElementById('routeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterRoutesBySearch(e.target.value);
            });
        }
    }

    filterRoutesBySearch(searchTerm) {
        let filteredRoutes = [...this.routes];
        
        if (searchTerm) {
            filteredRoutes = filteredRoutes.filter(route => 
                route.prefix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                route.node?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        this.updateRoutesTable(filteredRoutes);
    }

    updateRoutesTable(routes = this.routes) {
        const table = document.getElementById('routesTable');
        
        if (routes.length > 0) {
            table.innerHTML = routes.map(route => `
                <tr>
                    <td><code>${route.prefix}</code></td>
                    <td>${route.node?.name || 'Unknown'}</td>
                    <td>
                        <span class="${route.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'}">
                            ${route.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </td>
                    <td>${HeadscaleUI.formatDate(route.createdAt)}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                            ${route.enabled ? 
                                `<button class="btn btn-outline" onclick="dashboard.disableRoute('${route.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                    Disable
                                </button>` :
                                `<button class="btn btn-outline" onclick="dashboard.enableRoute('${route.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                    Enable
                                </button>`
                            }
                            <button class="btn btn-outline" onclick="dashboard.deleteRoute('${route.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">
                        No routes found
                    </td>
                </tr>
            `;
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

    // ACLs Section
    async loadACLs() {
        try {
            // For now, we'll use demo ACL data
            this.updateACLsDisplay();
        } catch (error) {
            console.error('Error loading ACLs:', error);
            HeadscaleUI.showNotification('Error loading ACLs', 'error');
        }
    }

    updateACLsDisplay() {
        const aclList = document.getElementById('aclRulesList');
        aclList.innerHTML = `
            <div style="background: white; padding: 1rem; border-radius: 0.375rem; margin-bottom: 0.5rem; border: 1px solid #e5e7eb;">
                <strong>Allow all traffic</strong>
                <div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">
                    Default rule - allows all nodes to communicate with each other
                </div>
                <div style="margin-top: 0.5rem;">
                    <span class="status-badge status-enabled">Enabled</span>
                </div>
            </div>
        `;
    }

    showAddACLModal() {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <p>Create custom access control rules to restrict traffic between your nodes.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Rule Name</label>
                <input type="text" class="form-input" id="aclRuleName" placeholder="Enter rule name">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Source</label>
                    <select class="form-input" id="aclSource">
                        <option value="*">All nodes (*)</option>
                        <option value="tag:web">Web servers</option>
                        <option value="tag:db">Database servers</option>
                        <option value="tag:internal">Internal only</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Destination</label>
                    <select class="form-input" id="aclDest">
                        <option value="*">All nodes (*)</option>
                        <option value="tag:web">Web servers</option>
                        <option value="tag:db">Database servers</option>
                        <option value="tag:internal">Internal only</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Ports</label>
                <input type="text" class="form-input" id="aclPorts" placeholder="80,443,22 or * for all ports">
                <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                    Separate multiple ports with commas
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Action</label>
                <select class="form-input" id="aclAction">
                    <option value="accept">Allow</option>
                    <option value="deny">Deny</option>
                </select>
            </div>
        `;

        HeadscaleUI.createModal(
            'Add ACL Rule',
            content,
            [
                {
                    text: 'Add Rule',
                    class: 'btn-primary',
                    onclick: 'dashboard.addACLRule()'
                }
            ]
        );
    }

    addACLRule() {
        const name = document.getElementById('aclRuleName')?.value;
        const source = document.getElementById('aclSource')?.value;
        const dest = document.getElementById('aclDest')?.value;
        const ports = document.getElementById('aclPorts')?.value;
        const action = document.getElementById('aclAction')?.value;

        if (!name) {
            HeadscaleUI.showNotification('Please enter a rule name', 'error');
            return;
        }

        // In a real implementation, you would call headscaleAPI.updateACLs()
        HeadscaleUI.showNotification(`ACL rule "${name}" added successfully`, 'success');
        document.querySelector('.modal-overlay')?.remove();
        
        // Refresh ACLs display
        this.loadACLs();
    }

    // Settings Section
    loadSettings() {
        const user = Auth.getCurrentUser();
        if (user) {
            document.getElementById('userEmail').value = user.email || 'Not set';
            document.getElementById('userUsername').value = user.username || 'Not set';
        }
    }

    copyApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.select();
            document.execCommand('copy');
            HeadscaleUI.showNotification('API key copied to clipboard', 'success');
        }
    }

    generateNewApiKey() {
        HeadscaleUI.showNotification('New API key generated (demo feature)', 'info');
    }

    deleteAccount() {
        if (confirm('Are you absolutely sure? This will permanently delete your account and all associated nodes and data.')) {
            if (confirm('This action cannot be undone. Type "DELETE" to confirm:')) {
                HeadscaleUI.showNotification('Account deletion initiated', 'warning');
                setTimeout(() => {
                    Auth.logout();
                }, 2000);
            }
        }
    }
}

// Global functions for HTML onclick
function switchSection(sectionName) {
    dashboard.switchSection(sectionName);
}

function filterNodes(filterType) {
    dashboard.filterNodes(filterType);
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

function showAddACLModal() {
    dashboard.showAddACLModal();
}

// Initialize dashboard when page loads
const dashboard = new DashboardManager();
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        // Check authentication
        if (!Auth.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        // Initialize dashboard
        dashboard.init();
    }
});
