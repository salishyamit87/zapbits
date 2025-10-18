// Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(note => note.remove());
        
        // Create notification element
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
                this.currentUser = { email, ...userData };
                this.isLoggedIn = true;
                
                // Store in localStorage
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification('Account created successfully!', 'success');
                
                // Redirect to dashboard
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
                this.currentUser = { email };
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

    // Handle OAuth login
    handleOAuth(provider) {
        this.showNotification(`${provider} OAuth integration coming soon!`, 'info');
        
        // Simulate OAuth success for demo
        setTimeout(() => {
            this.currentUser = { 
                email: `user@${provider}.com`,
                name: `${provider} User`,
                provider: provider
            };
            this.isLoggedIn = true;
            
            localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
            localStorage.setItem('headscale_loggedIn', 'true');
            
            this.showNotification(`Logged in with ${provider} successfully!`, 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }, 1500);
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
}

// Initialize Auth System
const Auth = new AuthSystem();

// Auto-check auth on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        if (!Auth.checkAuth()) {
            window.location.href = 'login.html';
        }
    }
});
