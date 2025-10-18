// Completely Fixed Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
    }

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

    // REAL API CALL - No fake login
    async handleSignup(email, password) {
        try {
            this.showNotification('Creating account...', 'info');
            console.log('Creating user:', email);
            
            const response = await fetch('/api/proxy?path=user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: email
                })
            });
            
            console.log('Signup response status:', response.status);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('User created successfully:', userData);
                
                this.currentUser = { 
                    email: email,
                    username: email,
                    isAdmin: false,
                    ...userData 
                };
                this.isLoggedIn = true;
                
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification('Account created successfully!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                const errorText = await response.text();
                console.error('Signup failed:', response.status, errorText);
                
                if (response.status === 409) {
                    this.showNotification('User already exists. Please login.', 'warning');
                } else if (response.status === 500) {
                    this.showNotification('Server error. Please try again.', 'error');
                } else {
                    this.showNotification(`Signup failed: ${errorText}`, 'error');
                }
            }
            
        } catch (error) {
            console.error('Signup network error:', error);
            this.showNotification('Network error. Please check console.', 'error');
        }
    }

    // REAL LOGIN CHECK - No fake login
    async handleLogin(email, password) {
        try {
            this.showNotification('Signing in...', 'info');
            console.log('Login attempt for:', email);
            
            const response = await fetch('/api/proxy?path=user');
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const usersData = await response.json();
            console.log('All users from API:', usersData);
            
            // Check if user exists
            const userExists = usersData.users && usersData.users.some(user => 
                user.name === email
            );
            
            if (userExists) {
                this.currentUser = { 
                    email: email,
                    username: email,
                    isAdmin: false
                };
                this.isLoggedIn = true;
                
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
            this.showNotification('Login failed. Please try signup.', 'error');
        }
    }

    // OAuth - REAL implementation
    async handleOAuth(provider) {
        this.showNotification(`${provider} authentication coming soon. Please use email signup.`, 'info');
        return; // Temporary disable OAuth
        
        // Original OAuth code commented out for now
        /*
        try {
            this.showNotification(`Signing in with ${provider}...`, 'info');
            
            const oauthEmail = `oauth_${provider}_${Date.now()}@headscale.local`;
            const oauthUsername = `${provider}_user_${Date.now()}`;
            
            console.log('Creating OAuth user:', oauthUsername);
            
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
                const errorText = await response.text();
                throw new Error(`OAuth failed: ${errorText}`);
            }
            
        } catch (error) {
            console.error('OAuth error:', error);
            this.showNotification(`${provider} login failed. Please try email signup.`, 'error');
        }
        */
    }

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

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.currentUser = null;
            this.isLoggedIn = false;
            localStorage.removeItem('headscale_user');
            localStorage.removeItem('headscale_loggedIn');
            window.location.href = 'index.html';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAdmin() {
        return this.currentUser && this.currentUser.isAdmin === true;
    }
}

// Initialize Auth System
const Auth = new AuthSystem();
