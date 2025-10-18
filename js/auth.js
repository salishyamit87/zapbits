// Enhanced Authentication System with User Isolation
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userApiKey = null;
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

    // Handle user signup
    async handleSignup(email, password) {
        try {
            this.showNotification('Creating account...', 'info');
            
            // Headscale mein user create karein
            const response = await fetch('/api/proxy?path=user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: email
                })
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = { 
                    email: email,
                    username: email,
                    isAdmin: false, // Regular user, not admin
                    ...userData 
                };
                this.isLoggedIn = true;
                
                // Store in localStorage
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification('Account created successfully!', 'success');
                
                // Redirect to user dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                throw new Error('User creation failed');
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Account creation failed. Please try again.', 'error');
        }
    }

    // Handle user login
    async handleLogin(email, password) {
        try {
            this.showNotification('Signing in...', 'info');
            
            // Check if user exists in Headscale
            const response = await fetch('/api/proxy?path=user');
            const usersData = await response.json();
            
            const userExists = usersData.users.some(user => 
                user.name === email
            );
            
            if (userExists) {
                this.currentUser = { 
                    email: email,
                    username: email,
                    isAdmin: false // Regular user
                };
                this.isLoggedIn = true;
                
                // Store in localStorage
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                this.showNotification('User not found. Please sign up first.', 'error');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    // Handle OAuth login - CREATE NEW USER FOR OAUTH
    async handleOAuth(provider) {
        try {
            this.showNotification(`Signing in with ${provider}...`, 'info');
            
            // Generate unique email for OAuth user
            const oauthEmail = `oauth_${provider}_${Date.now()}@headscale.local`;
            const oauthUsername = `${provider}_user_${Date.now()}`;
            
            // Create new user in Headscale for OAuth
            const response = await fetch('/api/proxy?path=user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: oauthUsername
                })
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = { 
                    email: oauthEmail,
                    username: oauthUsername,
                    provider: provider,
                    isAdmin: false,
                    ...userData 
                };
                this.isLoggedIn = true;
                
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification(`Logged in with ${provider} successfully!`, 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error('OAuth user creation failed');
            }
            
        } catch (error) {
            console.error('OAuth error:', error);
            this.showNotification(`${provider} login failed. Please try email signup.`, 'error');
        }
    }

    // Check if user is logged in
    checkAuth() {
        const loggedIn = localStorage.getItem('headscale_loggedIn');
        const userData = localStorage.getItem('headscale_user');
        
        if (loggedIn === 'true' && userData) {
            this.isLoggedIn = true;
            this.currentUser = JSON.parse(userData);
            return true;
        }
        return false;
    }

    // Logout user
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.currentUser = null;
            this.isLoggedIn = false;
            localStorage.removeItem('headscale_user');
            localStorage.removeItem('headscale_loggedIn');
            window.location.href = 'index.html';
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is admin
    isUserAdmin() {
        return this.currentUser && this.currentUser.isAdmin === true;
    }
}

// Initialize Auth System
const Auth = new AuthSystem();
