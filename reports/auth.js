function checkAuth(requiredRole = null) {
    const userJson = localStorage.getItem('iicm_user');

    if (!userJson) {
        const devUser = {
            id: 0,
            username: 'dev_user',
            first_name: 'Dev',
            last_name: 'User',
            email: 'dev@localhost',
            role_code: requiredRole || 'SUPER_ADMIN',
            role_name: requiredRole || 'Reports Executive',
            is_active: true
        };
        console.warn('[STANDALONE MODE] No auth token found — using local demo user:', devUser);
        return devUser;
    }

    return JSON.parse(userJson);
}

function renderUserProfile(user) {
    const userBadge = document.getElementById('user-profile-info');
    if (userBadge && user) {
        userBadge.innerHTML = `
            <span class="role-pill">${user.role_name || user.role_code}</span>
            <span style="font-size: 14px; font-weight: 600; margin-right: 15px;">${user.first_name || ''} ${user.last_name || ''} (${user.username})</span>
        `;
    }
}

function logoutUser() {
    localStorage.removeItem('iicm_access_token');
    localStorage.removeItem('iicm_refresh_token');
    localStorage.removeItem('iicm_user');
    window.location.href = '../login/index.html';
}

function openChangePasswordModal() {
    alert('Standalone demo mode: password changes are disabled.');
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

function handleChangePassword(e) {
    e.preventDefault();
    alert('Standalone demo mode: password changes are disabled.');
}
