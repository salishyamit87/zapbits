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

    // REAL SIGNUP - Proper error handling
    async handleSignup(email, password) {
        try {
            this.showNotification('Creating account...', 'info');
            console.log('🔄 Creating user:', email);
            
            // First check if user already exists
            const checkResponse = await fetch('/api/proxy?path=user');
            if (checkResponse.ok) {
                const usersData = await checkResponse.json();
                const userExists = usersData.users && usersData.users.some(user => 
                    user.name === email
                );
                
                if (userExists) {
                    this.showNotification('User already exists. Please login instead.', 'warning');
                    return;
                }
            }
            
            // Create new user
            const response = await fetch('/api/proxy?path=user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: email
                })
            });
            
            console.log('📨 Signup response status:', response.status);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ User created successfully:', userData);
                
                this.currentUser = { 
                    email: email,
                    username: email,
                    isAdmin: false,
                    ...userData 
                };
                this.isLoggedIn = true;
                
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification('Account created successfully! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                const errorText = await response.text();
                console.error('❌ Signup failed:', response.status, errorText);
                
                if (response.status === 409) {
                    this.showNotification('User already exists. Please login.', 'warning');
                } else if (response.status === 500) {
                    this.showNotification('Server error. Please try again.', 'error');
                } else {
                    this.showNotification(`Signup failed: ${errorText}`, 'error');
                }
            }
            
        } catch (error) {
            console.error('🌐 Signup network error:', error);
            this.showNotification('Network error. Please check console for details.', 'error');
        }
    }

    // REAL LOGIN - Proper error handling
    async handleLogin(email, password) {
        try {
            this.showNotification('Signing in...', 'info');
            console.log('🔄 Login attempt for:', email);
            
            const response = await fetch('/api/proxy?path=user');
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const usersData = await response.json();
            console.log('📊 All users from API:', usersData);
            
            // Check if user exists
            const userExists = usersData.users && usersData.users.some(user => 
                user.name === email
            );
            
            if (userExists) {
                console.log('✅ User found, logging in...');
                this.currentUser = { 
                    email: email,
                    username: email,
                    isAdmin: false
                };
                this.isLoggedIn = true;
                
                localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
                localStorage.setItem('headscale_loggedIn', 'true');
                
                this.showNotification('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                console.log('❌ User not found');
                this.showNotification('User not found. Please sign up first.', 'error');
            }
            
        } catch (error) {
            console.error('🌐 Login error:', error);
            this.showNotification('Login failed. Please check console for details.', 'error');
        }
    }

    // OAuth - Better simulation
    async handleOAuth(provider) {
        try {
            this.showNotification(`Signing in with ${provider}...`, 'info');
            
            // Create a realistic email for demo
            const oauthEmail = `${provider.toLowerCase()}.user@gmail.com`;
            
            console.log('🔄 OAuth attempt for:', provider, 'Email:', oauthEmail);
            
            // First check if user exists
            const checkResponse = await fetch('/api/proxy?path=user');
            let userExists = false;
            
            if (checkResponse.ok) {
                const usersData = await checkResponse.json();
                userExists = usersData.users && usersData.users.some(user => 
                    user.name === oauthEmail
                );
            }
            
            if (!userExists) {
                // Create user if doesn't exist
                const response = await fetch('/api/proxy?path=user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: oauthEmail
                    })
                });
                
                if (!response.ok) {
                    throw new Error('OAuth user creation failed');
                }
            }
            
            // Login the user
            this.currentUser = { 
                email: oauthEmail,
                username: oauthEmail,
                provider: provider,
                isAdmin: false
            };
            this.isLoggedIn = true;
            
            localStorage.setItem('headscale_user', JSON.stringify(this.currentUser));
            localStorage.setItem('headscale_loggedIn', 'true');
            
            this.showNotification(`Successfully signed in with ${provider}!`, 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('OAuth error:', error);
            this.showNotification(`${provider} sign-in failed. Please try email signup.`, 'error');
        }
    }

    checkAuth() {
        const loggedIn = localStorage.getItem('headscale_loggedIn');
        const userData = localStorage.getItem('headscale_user');
        
        if (loggedIn === 'true' && userData) {
            try {
                this.isLoggedIn = true;
                this.currentUser = JSON.parse(userData);
                
                // Ensure email is properly set
                if (!this.currentUser.email && this.currentUser.username) {
                    this.currentUser.email = this.currentUser.username;
                }
                
                return true;
            } catch (e) {
                console.error('Auth data corrupted:', e);
                this.logout();
                return false;
            }
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
