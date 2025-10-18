// Updated checkAuth method in Auth class
checkAuth() {
    const loggedIn = localStorage.getItem('headscale_loggedIn');
    const userData = localStorage.getItem('headscale_user');
    
    if (loggedIn === 'true' && userData) {
        this.isLoggedIn = true;
        this.currentUser = JSON.parse(userData);
        
        // Ensure email is properly set
        if (!this.currentUser.email && this.currentUser.username) {
            this.currentUser.email = this.currentUser.username;
        }
        
        return true;
    }
    return false;
}

// Updated handleLogin method
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
                username: email, // Make sure username is set
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
