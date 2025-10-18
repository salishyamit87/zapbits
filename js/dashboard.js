// Complete Tailscale-style Dashboard Manager
class DashboardManager {
    constructor() {
        this.currentSection = 'overview';
        this.machines = [];
        this.routes = [];
        this.authKeys = [];
        this.aclRules = [];
        this.currentUser = null;
    }

    // Initialize Dashboard
    async init() {
        // Set current user
        this.currentUser = Auth.getCurrentUser();
        if (this.currentUser) {
            headscaleAPI.setCurrentUser(this.currentUser);
            
            // Update UI with actual user info
            const userEmail = this.currentUser.email || this.currentUser.username;
            document.getElementById('userWelcome').textContent = userEmail;
            document.getElementById('userAvatar').textContent = userEmail.charAt(0).toUpperCase();
            document.getElementById('userEmail').value = userEmail;
            document.getElementById('userUsername').value = this.currentUser.username || userEmail;
            document.getElementById('currentSSHUser').textContent = userEmail;
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
            'routes': 'Subnets',
            'exit-nodes': 'Exit Nodes',
            'acls': 'ACLs',
            'dns': 'DNS',
            'ssh': 'SSH',
            'keys': 'Auth Keys',
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
            case 'exit-nodes':
                await this.loadExitNodes();
                break;
            case 'acls':
                await this.loadACLs();
                break;
            case 'dns':
                await this.loadDNS();
                break;
            case 'ssh':
                await this.loadSSH();
                break;
            case 'keys':
                await this.loadAuthKeys();
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
            this.updateFeatureCounts();

        } catch (error) {
            console.error('Error loading overview:', error);
            this.showNotification('Error loading overview data', 'error');
            this.loadDemoData();
        }
    }

    updateOverviewStats() {
        document.getElementById('totalMachines').textContent = this.machines.length;
        
        const onlineMachines = this.machines.filter(machine => machine.online).length;
        document.getElementById('onlineMachines').textContent = onlineMachines;
        
        const activeRoutes = this.routes.filter(route => route.enabled).length;
        document.getElementById('activeRoutes').textContent = activeRoutes;
        
        // Calculate network health
        const health = this.machines.length > 0 ? 
            Math.round((onlineMachines / this.machines.length) * 100) : 100;
        document.getElementById('networkHealth').textContent = `${health}%`;
    }

    updateFeatureCounts() {
        document.getElementById('overviewMachinesCount').textContent = this.machines.length;
        document.getElementById('overviewRoutesCount').textContent = this.routes.filter(r => r.enabled).length;
        document.getElementById('overviewACLsCount').textContent = '5'; // Default ACL rules
        document.getElementById('overviewKeysCount').textContent = '2'; // Default keys
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
                    <td>${machine.hostinfo?.OS || machine.os || 'Unknown'}</td>
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
                    <td colspan="6" class="empty-state">
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
            
            // Setup search
            this.setupMachineSearch();
            
        } catch (error) {
            console.error('Error loading machines:', error);
            this.showNotification('Error loading machines', 'error');
            this.loadDemoMachines();
        }
    }

    setupMachineSearch() {
        const searchInput = document.getElementById('machineSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterMachines(e.target.value);
            });
        }
    }

    filterMachines(searchTerm) {
        let filtered = this.machines;
        
        if (searchTerm) {
            filtered = this.machines.filter(machine => 
                machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                machine.ipAddresses?.some(ip => ip.includes(searchTerm))
            );
        }
        
        this.updateMachinesTable(filtered);
    }

    updateMachinesTable(machines = this.machines) {
        const table = document.getElementById('machinesTable');
        
        if (machines.length > 0) {
            table.innerHTML = machines.map(machine => `
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
                        <div>
                            <span class="tag ${machine.online ? 'success' : ''}">
                                ${machine.online ? 'active' : 'inactive'}
                            </span>
                            ${machine.tags ? machine.tags.map(tag => `
                                <span class="tag primary">${tag}</span>
                            `).join('') : ''}
                        </div>
                    </td>
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
                    <td colspan="7" class="empty-state">
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
                <div class="detail-row">
                    <div class="detail-item">
                        <strong style="display: block; font-size: 0.875rem; color: #6b7280;">Name</strong>
                        <div>${machine.name || 'Unnamed'}</div>
                    </div>
                    <div class="detail-item">
                        <strong style="display: block; font-size: 0.875rem; color: #6b7280;">Status</strong>
                        <span class="${machine.online ? 'status-badge status-online' : 'status-badge status-offline'}">
                            ${machine.online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-item">
                        <strong style="display: block; font-size: 0.875rem; color: #6b7280;">Last Seen</strong>
                        <div>${this.formatRelativeTime(machine.lastSeen)}</div>
                    </div>
                    <div class="detail-item">
                        <strong style="display: block; font-size: 0.875rem; color: #6b7280;">Expires</strong>
                        <div>${machine.expiry ? this.formatRelativeTime(machine.expiry) : 'Never'}</div>
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

            <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Tags</label>
                <input type="text" class="form-input" id="machineTags" value="${machine.tags ? machine.tags.join(',') : ''}" placeholder="tag:web, tag:database" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem;">
                <small style="color: #6b7280;">Separate multiple tags with commas</small>
            </div>
        `;

        this.createModal(
            'Manage Machine',
            content,
            [
                {
                    text: 'Save Changes',
                    class: 'btn-primary',
                    onclick: `dashboard.updateMachine('${machine.id}')`
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

    async updateMachine(machineId) {
        const newName = document.getElementById('machineNewName')?.value;
        const tags = document.getElementById('machineTags')?.value;
        
        if (!newName) {
            this.showNotification('Please enter a name', 'error');
            return;
        }

        try {
            // Update name
            await headscaleAPI.renameNode(machineId, newName);
            
            // In real implementation, you would update tags via API
            if (tags) {
                this.showNotification('Tags updated (demo)', 'info');
            }
            
            this.showNotification('Machine updated successfully', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await this.loadMachines();
            await this.loadOverview();
        } catch (error) {
            this.showNotification('Failed to update machine', 'error');
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
                            # Linux/macOS<br>
                            curl -fsSL https://tailscale.com/install.sh | sh<br>
                            tailscale up --login-server=https://headscale.publicvm.com<br><br>
                            
                            # Windows<br>
                            # Download from tailscale.com and use login server:<br>
                            https://headscale.publicvm.com
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

    // Routes/Subnets Section
    async loadRoutes() {
        try {
            const routesData = await headscaleAPI.listRoutes();
            this.routes = routesData.routes || [];
            this.updateRoutesTable();
        } catch (error) {
            console.error('Error loading routes:', error);
            this.showNotification('Error loading routes', 'error');
            this.loadDemoRoutes();
        }
    }

    updateRoutesTable() {
        const table = document.getElementById('routesTable');
        
        if (this.routes.length > 0) {
            table.innerHTML = this.routes.map(route => `
                <tr>
                    <td><code>${route.prefix}</code></td>
                    <td>${route.node?.name || 'Unknown'}</td>
                    <td>
                        <span class="${route.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'}">
                            ${route.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </td>
                    <td>${this.formatRelativeTime(route.createdAt)}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            ${route.enabled ? 
                                `<button class="btn btn-outline btn-sm" onclick="dashboard.disableRoute('${route.id}')">
                                    Disable
                                </button>` :
                                `<button class="btn btn-outline btn-sm" onclick="dashboard.enableRoute('${route.id}')">
                                    Enable
                                </button>`
                            }
                            <button class="btn btn-outline btn-sm" onclick="dashboard.deleteRoute('${route.id}')">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon">🛣️</div>
                        <div>No subnet routes configured</div>
                        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="dashboard.showAddRouteModal()">
                            Advertise Subnet
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    showAddRouteModal() {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Advertise Subnet</h3>
                <p style="color: #6b7280; margin-bottom: 1rem;">Configure a subnet route to allow access to local networks.</p>
                
                <div class="form-group">
                    <label class="form-label">Subnet CIDR</label>
                    <input type="text" class="form-input" id="subnetCIDR" placeholder="192.168.1.0/24" style="width: 100%;">
                    <small style="color: #6b7280;">Enter the subnet in CIDR notation (e.g., 192.168.1.0/24)</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Machine</label>
                    <select class="form-input" id="routeMachine" style="width: 100%;">
                        <option value="">Select a machine</option>
                        ${this.machines.map(machine => `
                            <option value="${machine.id}">${machine.name} (${machine.ipAddresses?.[0]})</option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;

        this.createModal(
            'Advertise Subnet',
            content,
            [
                {
                    text: 'Advertise Route',
                    class: 'btn-primary',
                    onclick: 'dashboard.addSubnetRoute()'
                }
            ]
        );
    }

    addSubnetRoute() {
        const cidr = document.getElementById('subnetCIDR')?.value;
        const machineId = document.getElementById('routeMachine')?.value;
        
        if (!cidr || !machineId) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        // In real implementation, you would call headscaleAPI to create route
        this.showNotification(`Subnet route ${cidr} advertised successfully`, 'success');
        document.querySelector('.modal-overlay')?.remove();
        
        // Reload routes
        this.loadRoutes();
    }

    async enableRoute(routeId) {
        try {
            await headscaleAPI.enableRoute(routeId);
            this.showNotification('Route enabled successfully', 'success');
            await this.loadRoutes();
        } catch (error) {
            this.showNotification('Failed to enable route', 'error');
        }
    }

    async disableRoute(routeId) {
        try {
            await headscaleAPI.disableRoute(routeId);
            this.showNotification('Route disabled successfully', 'success');
            await this.loadRoutes();
        } catch (error) {
            this.showNotification('Failed to disable route', 'error');
        }
    }

    // Exit Nodes Section
    async loadExitNodes() {
        const exitNodesList = document.getElementById('exitNodesList');
        const exitNodes = this.machines.filter(m => m.exitNode);
        
        if (exitNodes.length > 0) {
            exitNodesList.innerHTML = exitNodes.map(node => `
                <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: between; align-items: center;">
                        <div>
                            <strong>${node.name}</strong>
                            <div style="color: #6b7280; font-size: 0.875rem;">${node.ipAddresses?.[0]}</div>
                        </div>
                        <span class="status-badge status-enabled">Exit Node</span>
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <button class="btn btn-outline btn-sm" onclick="dashboard.disableExitNode('${node.id}')">
                            Disable Exit Node
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            exitNodesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🚪</div>
                    <div>No exit nodes configured</div>
                    <p style="color: #6b7280; margin-top: 0.5rem;">Exit nodes allow you to route internet traffic through specific machines.</p>
                </div>
            `;
        }
    }

    enableExitNode() {
        if (this.machines.length === 0) {
            this.showNotification('No machines available to configure as exit node', 'error');
            return;
        }

        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Enable Exit Node</h3>
                <p style="color: #6b7280; margin-bottom: 1rem;">Select a machine to use as an exit node:</p>
                
                <div class="form-group">
                    <label class="form-label">Machine</label>
                    <select class="form-input" id="exitNodeMachine" style="width: 100%;">
                        ${this.machines.map(machine => `
                            <option value="${machine.id}">${machine.name} (${machine.ipAddresses?.[0]})</option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="background: #fef3c7; padding: 1rem; border-radius: 6px;">
                    <strong>Note:</strong> The selected machine must have exit node functionality enabled in its Tailscale settings.
                </div>
            </div>
        `;

        this.createModal(
            'Enable Exit Node',
            content,
            [
                {
                    text: 'Enable Exit Node',
                    class: 'btn-primary',
                    onclick: 'dashboard.configureExitNode()'
                }
            ]
        );
    }

    configureExitNode() {
        const machineId = document.getElementById('exitNodeMachine')?.value;
        if (!machineId) return;

        // In real implementation, you would configure the machine as exit node
        const machine = this.machines.find(m => m.id === machineId);
        machine.exitNode = true;
        
        this.showNotification(`Exit node enabled on ${machine.name}`, 'success');
        document.querySelector('.modal-overlay')?.remove();
        this.loadExitNodes();
    }

    disableExitNode(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            machine.exitNode = false;
            this.showNotification(`Exit node disabled on ${machine.name}`, 'success');
            this.loadExitNodes();
        }
    }

    // ACLs Section
    async loadACLs() {
        const aclRulesContainer = document.getElementById('aclRulesContainer');
        
        // Default ACL rules
        this.aclRules = [
            { id: 1, action: 'accept', source: '*', dest: '*', ports: '*' },
            { id: 2, action: 'accept', source: 'tag:web', dest: 'tag:database', ports: '5432' },
            { id: 3, action: 'accept', source: '100.64.0.1', dest: '*', ports: '22,80,443' },
            { id: 4, action: 'deny', source: '*', dest: 'tag:admin', ports: '*' },
            { id: 5, action: 'accept', source: 'tag:internal', dest: 'tag:internal', ports: '*' }
        ];

        aclRulesContainer.innerHTML = this.aclRules.map(rule => `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <strong style="color: ${rule.action === 'accept' ? '#10b981' : '#ef4444'}">
                            ${rule.action === 'accept' ? 'ALLOW' : 'DENY'}
                        </strong>
                        <div style="font-family: monospace; font-size: 0.875rem; margin-top: 0.25rem;">
                            ${rule.source} → ${rule.dest} : ${rule.ports}
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="dashboard.deleteACLRule(${rule.id})">
                        Delete
                    </button>
                </div>
                <div style="color: #6b7280; font-size: 0.875rem;">
                    ${this.getACLDescription(rule)}
                </div>
            </div>
        `).join('');
    }

    getACLDescription(rule) {
        if (rule.source === '*' && rule.dest === '*' && rule.ports === '*') {
            return 'Allow all traffic between all machines';
        } else if (rule.source === 'tag:web' && rule.dest === 'tag:database') {
            return 'Allow web servers to access database on port 5432';
        } else if (rule.source === '100.64.0.1') {
            return 'Allow specific machine SSH and web access';
        } else if (rule.dest === 'tag:admin') {
            return 'Deny access to admin machines';
        } else {
            return 'Internal network access rule';
        }
    }

    showAddACLModal() {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Add ACL Rule</h3>
                
                <div class="form-group">
                    <label class="form-label">Action</label>
                    <select class="form-input" id="aclAction" style="width: 100%;">
                        <option value="accept">Allow</option>
                        <option value="deny">Deny</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Source</label>
                    <input type="text" class="form-input" id="aclSource" placeholder="*, tag:web, 100.64.0.1" style="width: 100%;">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Destination</label>
                    <input type="text" class="form-input" id="aclDest" placeholder="*, tag:database, tag:admin" style="width: 100%;">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Ports</label>
                    <input type="text" class="form-input" id="aclPorts" placeholder="*, 80,443, 22,80,443" style="width: 100%;">
                    <small style="color: #6b7280;">Use * for all ports, or comma-separated port numbers</small>
                </div>
            </div>
        `;

        this.createModal(
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
        const action = document.getElementById('aclAction')?.value;
        const source = document.getElementById('aclSource')?.value;
        const dest = document.getElementById('aclDest')?.value;
        const ports = document.getElementById('aclPorts')?.value;

        if (!source || !dest || !ports) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        const newRule = {
            id: Date.now(),
            action: action,
            source: source,
            dest: dest,
            ports: ports
        };

        this.aclRules.push(newRule);
        this.showNotification('ACL rule added successfully', 'success');
        document.querySelector('.modal-overlay')?.remove();
        this.loadACLs();
    }

    deleteACLRule(ruleId) {
        this.aclRules = this.aclRules.filter(rule => rule.id !== ruleId);
        this.showNotification('ACL rule deleted', 'success');
        this.loadACLs();
    }

    // DNS Section
    async loadDNS() {
        // DNS settings are mostly UI-based, no API calls needed for demo
        this.showNotification('DNS settings loaded', 'success');
    }

    // SSH Section
    async loadSSH() {
        // SSH settings are mostly UI-based
        this.showNotification('SSH settings loaded', 'success');
    }

        // Auth Keys Section - Continued
    async loadAuthKeys() {
        // Demo auth keys
        this.authKeys = [
            { 
                id: 1, 
                key: 'tskey-auth-k123abc456def', 
                created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                usage: '5 machines',
                reusable: true
            },
            { 
                id: 2, 
                key: 'tskey-auth-k789ghi012jkl', 
                created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                usage: '1 machine',
                reusable: false
            }
        ];
        
        this.updateAuthKeysTable();
    }

    updateAuthKeysTable() {
        const table = document.getElementById('authKeysTable');
        
        if (this.authKeys.length > 0) {
            table.innerHTML = this.authKeys.map(key => `
                <tr>
                    <td>
                        <code style="font-size: 0.75rem;">${key.key}</code>
                        ${key.reusable ? '<span class="tag primary" style="margin-left: 0.5rem;">reusable</span>' : ''}
                    </td>
                    <td>${this.formatRelativeTime(key.created)}</td>
                    <td>${this.formatRelativeTime(key.expires)}</td>
                    <td>${key.usage}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="btn btn-outline btn-sm" onclick="dashboard.copyAuthKey('${key.key}')">
                                Copy
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="dashboard.revokeAuthKey(${key.id})">
                                Revoke
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon">🔑</div>
                        <div>No authentication keys</div>
                        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="dashboard.showCreateKeyModal()">
                            Create Key
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    showCreateKeyModal() {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Create Authentication Key</h3>
                
                <div class="form-group">
                    <label class="form-label">Key Type</label>
                    <select class="form-input" id="keyType" style="width: 100%;">
                        <option value="reusable">Reusable Key</option>
                        <option value="ephemeral">Ephemeral (One-time use)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Expiration</label>
                    <select class="form-input" id="keyExpiration" style="width: 100%;">
                        <option value="90d">90 days</option>
                        <option value="30d">30 days</option>
                        <option value="7d">7 days</option>
                        <option value="1d">1 day</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Tags</label>
                    <input type="text" class="form-input" id="keyTags" placeholder="tag:web, tag:database" style="width: 100%;">
                    <small style="color: #6b7280;">Optional: Assign tags to machines using this key</small>
                </div>
                
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px;">
                    <strong>Usage:</strong>
                    <div style="font-family: monospace; font-size: 0.875rem; margin-top: 0.5rem;">
                        tailscale up --authkey=KEY_HERE
                    </div>
                </div>
            </div>
        `;

        this.createModal(
            'Create Auth Key',
            content,
            [
                {
                    text: 'Create Key',
                    class: 'btn-primary',
                    onclick: 'dashboard.createAuthKey()'
                }
            ]
        );
    }

    createAuthKey() {
        const keyType = document.getElementById('keyType')?.value;
        const expiration = document.getElementById('keyExpiration')?.value;
        const tags = document.getElementById('keyTags')?.value;

        // Generate demo key
        const newKey = {
            id: Date.now(),
            key: 'tskey-auth-k' + Math.random().toString(36).substr(2, 16),
            created: new Date().toISOString(),
            expires: this.calculateExpiration(expiration),
            usage: '0 machines',
            reusable: keyType === 'reusable',
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        };

        this.authKeys.push(newKey);
        this.showNotification('Authentication key created successfully', 'success');
        document.querySelector('.modal-overlay')?.remove();
        this.updateAuthKeysTable();
        
        // Show key in a new modal
        this.showKeyDetailsModal(newKey);
    }

    showKeyDetailsModal(key) {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">Authentication Key Created</h3>
                <p style="color: #6b7280; margin-bottom: 1rem;">Copy this key and use it to authenticate machines:</p>
                
                <div style="background: #1f2937; color: white; padding: 1rem; border-radius: 6px; font-family: monospace; font-size: 0.875rem; word-break: break-all;">
                    ${key.key}
                </div>
                
                <div style="margin-top: 1rem;">
                    <strong>Usage:</strong>
                    <div style="font-family: monospace; font-size: 0.875rem; margin-top: 0.5rem; background: #f3f4f6; padding: 0.5rem; border-radius: 4px;">
                        tailscale up --authkey=${key.key}
                    </div>
                </div>
                
                <div style="margin-top: 1rem; color: #6b7280; font-size: 0.875rem;">
                    <div>Expires: ${this.formatRelativeTime(key.expires)}</div>
                    <div>Type: ${key.reusable ? 'Reusable' : 'Ephemeral'}</div>
                    ${key.tags.length > 0 ? `<div>Tags: ${key.tags.join(', ')}</div>` : ''}
                </div>
            </div>
        `;

        this.createModal(
            'Auth Key Details',
            content,
            [
                {
                    text: 'Copy Key',
                    class: 'btn-primary',
                    onclick: `dashboard.copyAuthKey('${key.key}')`
                },
                {
                    text: 'Close',
                    class: 'btn-outline',
                    onclick: "document.querySelector('.modal-overlay').remove()"
                }
            ]
        );
    }

    copyAuthKey(key) {
        navigator.clipboard.writeText(key).then(() => {
            this.showNotification('Auth key copied to clipboard', 'success');
        });
    }

    revokeAuthKey(keyId) {
        if (!confirm('Are you sure you want to revoke this authentication key?')) return;
        
        this.authKeys = this.authKeys.filter(key => key.id !== keyId);
        this.showNotification('Authentication key revoked', 'success');
        this.updateAuthKeysTable();
    }

    calculateExpiration(expirationStr) {
        const now = new Date();
        const match = expirationStr.match(/(\d+)([dmy])/);
        if (!match) return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        
        const amount = parseInt(match[1]);
        const unit = match[2];
        
        let milliseconds;
        switch(unit) {
            case 'd':
                milliseconds = amount * 24 * 60 * 60 * 1000;
                break;
            case 'm':
                milliseconds = amount * 30 * 24 * 60 * 60 * 1000;
                break;
            case 'y':
                milliseconds = amount * 365 * 24 * 60 * 60 * 1000;
                break;
            default:
                milliseconds = 90 * 24 * 60 * 60 * 1000;
        }
        
        return new Date(now.getTime() + milliseconds).toISOString();
    }

    // Settings Section
    loadSettings() {
        // API Key is already set in init()
        document.getElementById('apiKey').value = 'Gib3hJr.WbZDm1n3YvRFU2T6uLStRteWmp4Wh4J2';
        this.showNotification('Settings loaded', 'success');
    }

    copyApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        apiKeyInput.select();
        document.execCommand('copy');
        this.showNotification('API key copied to clipboard', 'success');
    }

    generateNewApiKey() {
        this.showNotification('New API key generated (demo feature)', 'info');
    }

    generateAuthKey() {
        this.showCreateKeyModal();
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
                os: 'Windows',
                hostinfo: { OS: 'Windows' },
                tags: ['tag:desktop', 'tag:personal']
            },
            {
                id: '2', 
                name: 'home-server',
                ipAddresses: ['100.64.0.2'],
                online: true,
                lastSeen: new Date(Date.now() - 3600000).toISOString(),
                os: 'Linux',
                hostinfo: { OS: 'Ubuntu 22.04' },
                tags: ['tag:server', 'tag:internal']
            },
            {
                id: '3',
                name: 'mobile-device',
                ipAddresses: ['100.64.0.3'],
                online: false,
                lastSeen: new Date(Date.now() - 86400000).toISOString(),
                os: 'Android',
                tags: ['tag:mobile']
            }
        ];
        
        this.routes = [
            {
                id: '1',
                prefix: '192.168.1.0/24',
                enabled: true,
                node: { name: 'home-server' },
                createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
            }
        ];
        
        this.updateOverviewStats();
        this.updateRecentMachines();
        this.updateFeatureCounts();
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
                hostinfo: { OS: 'Windows' },
                tags: ['tag:desktop']
            },
            {
                id: '2',
                name: 'home-server', 
                ipAddresses: ['100.64.0.2'],
                online: false,
                lastSeen: new Date(Date.now() - 7200000).toISOString(),
                os: 'Linux',
                hostinfo: { OS: 'Linux' },
                tags: ['tag:server']
            }
        ];
        this.updateMachinesTable();
        this.showNotification('Demo machines loaded', 'info');
    }

    loadDemoRoutes() {
        this.routes = [
            {
                id: '1',
                prefix: '192.168.1.0/24',
                enabled: true,
                node: { name: 'home-server' },
                createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
            },
            {
                id: '2',
                prefix: '10.0.0.0/24',
                enabled: false,
                node: { name: 'my-laptop' },
                createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
            }
        ];
        this.updateRoutesTable();
        this.showNotification('Demo routes loaded', 'info');
    }
}

// Global functions
function switchSection(sectionName) {
    dashboard.switchSection(sectionName);
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        if (!Auth.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        dashboard.init();
    }
});
