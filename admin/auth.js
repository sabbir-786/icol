/**
 * IICM QRTMS — Admin Auth
 * Role: ADMIN
 */

const IICM_LOGIN_URL = '../login/index.html';

const IICM_ROLE_DASH_MAP = {
    'SUPER_ADMIN':         '../super_admin/dashboard.html',
    'ADMIN':               '../admin/dashboard.html',
    'GM':                  '../gm/dashboard.html',
    'DC':                  '../dc/dashboard.html',
    'PROGRAM_COORDINATOR': '../program_coordinator/dashboard.html',
    'COMPANY_ADMIN':       '../company/dashboard.html',
    'FACULTY':             '../faculty/dashboard.html',
    'TRAINEE':             '../trainee/dashboard.html'
};

function checkAuth(requiredRole) {
    const token    = localStorage.getItem('iicm_access_token');
    const userJson = localStorage.getItem('iicm_user');

    if (!userJson || !token) {
        window.location.href = IICM_LOGIN_URL;
        return null;
    }

    let user;
    try { user = JSON.parse(userJson); } catch(e) {
        localStorage.clear();
        window.location.href = IICM_LOGIN_URL;
        return null;
    }

    if (requiredRole && user.role_code !== requiredRole) {
        const target = IICM_ROLE_DASH_MAP[user.role_code];
        window.location.href = target || IICM_LOGIN_URL;
        return null;
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
