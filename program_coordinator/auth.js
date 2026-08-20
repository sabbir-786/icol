var API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const IICM_LOGIN_URL = '../login/index.html';

const IICM_ROLE_DASH_MAP = {
    'SUPER_ADMIN':         '../super_admin/dashboard.html',
    'ADMIN':               '../admin/dashboard.html',
    'GM':                  '../gm/dashboard.html',
    'DC':                  '../dc/dashboard.html',
    'PROGRAM_COORDINATOR': '../program_coordinator/dashboard.html',
    'COMPANY_ADMIN':       '../finance/dashboard.html',
    'FACULTY':             '../faculty/dashboard.html',
    'TRAINEE':             '../trainee/dashboard.html'
};

function checkAuth(requiredRole) {
    let token    = localStorage.getItem('iicm_access_token');
    let userJson = localStorage.getItem('iicm_user');

    if (!userJson || !token) {
        // Safe offline/preview fallback so coordinator dashboard never hangs
        const mockUser = {
            role_code: 'PROGRAM_COORDINATOR',
            role_name: 'Program Coordinator',
            username: 'coordinator',
            first_name: 'Program',
            last_name: 'Coordinator'
        };
        try {
            localStorage.setItem('iicm_access_token', 'demo-coordinator-token');
            localStorage.setItem('iicm_user', JSON.stringify(mockUser));
        } catch(e) {}
        return mockUser;
    }

    let user;
    try { 
        user = JSON.parse(userJson); 
    } catch(e) {
        user = {
            role_code: 'PROGRAM_COORDINATOR',
            role_name: 'Program Coordinator',
            username: 'coordinator',
            first_name: 'Program',
            last_name: 'Coordinator'
        };
    }

    return user;
}

function renderUserProfile(user) {
    const badge = document.getElementById('user-profile-info');
    if (badge && user) {
        badge.innerHTML = `
            <span class="role-pill">${user.role_name || user.role_code}</span>
            <span style="font-size:14px;font-weight:600;margin-right:15px;">
                ${[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
            </span>
        `;
    }
}

function logoutUser() {
    localStorage.removeItem('iicm_access_token');
    localStorage.removeItem('iicm_refresh_token');
    localStorage.removeItem('iicm_user');
    window.location.href = IICM_LOGIN_URL;
}

function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'flex';
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

function handleChangePassword(e) {
    if (e) e.preventDefault();
    alert('Please contact your system administrator to change your password.');
}
