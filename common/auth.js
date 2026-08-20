/**
 * IICM QRTMS — Shared Auth Helper
 * Used by all role dashboards.
 *
 * Usage: <script src="../common/auth.js"></script>
 * Then call:  const user = checkAuth('ROLE_CODE');
 */

const IICM_DASH = {
    'SUPER_ADMIN':         '../super_admin/dashboard.html',
    'ADMIN':               '../admin/dashboard.html',
    'GM':                  '../gm/dashboard.html',
    'DC':                  '../dc/dashboard.html',
    'PROGRAM_COORDINATOR': '../program_coordinator/dashboard.html',
    'COMPANY_ADMIN':       '../company/dashboard.html',
    'FACULTY':             '../faculty/dashboard.html',
    'TRAINEE':             '../trainee/dashboard.html'
};

const IICM_LOGIN = '../login/index.html';

/**
 * checkAuth(requiredRole)
 * - If no session → redirect to login.
 * - If role mismatch → redirect to user's own dashboard.
 * - If all OK → return user object.
 * - Dev fallback (no userJson but STANDALONE=true) → return demo user.
 */
function checkAuth(requiredRole = null) {
    const token    = localStorage.getItem('iicm_access_token');
    const userJson = localStorage.getItem('iicm_user');

    if (!userJson || !token) {
        /* ── Dev / Standalone mode ── */
        if (window.__IICM_STANDALONE__) {
            const devUser = {
                id: 0,
                username: 'dev_user',
                first_name: 'Dev',
                last_name: 'User',
                email: 'dev@localhost',
                role_code: requiredRole || 'SUPER_ADMIN',
                role_name: requiredRole ? _roleName(requiredRole) : 'Super Admin',
                is_active: true
            };
            console.warn('[STANDALONE MODE] No session found — using demo user:', devUser);
            return devUser;
        }
        /* Redirect to login */
        window.location.href = IICM_LOGIN;
        return null;
    }

    let user;
    try { user = JSON.parse(userJson); }
    catch(e) {
        localStorage.clear();
        window.location.href = IICM_LOGIN;
        return null;
    }

    /* Role mismatch → send to correct dashboard */
    if (requiredRole && user.role_code !== requiredRole) {
        const correctDash = IICM_DASH[user.role_code];
        if (correctDash) {
            window.location.href = correctDash;
        } else {
            window.location.href = IICM_LOGIN;
        }
        return null;
    }

    return user;
}

function _roleName(code) {
    const map = {
        'SUPER_ADMIN': 'Super Admin',
        'ADMIN': 'Admin',
        'GM': 'GM Academics',
        'DC': 'Executive Director',
        'PROGRAM_COORDINATOR': 'Programme Coordinator',
        'COMPANY_ADMIN': 'Finance Officer',
        'FACULTY': 'Faculty',
        'TRAINEE': 'Trainee'
    };
    return map[code] || code;
}

/**
 * renderUserProfile(user)
 * Injects user name + role badge into #user-profile-info
 */
function renderUserProfile(user) {
    const badge = document.getElementById('user-profile-info');
    if (badge && user) {
        badge.innerHTML = `
            <span class="role-pill">${user.role_name || _roleName(user.role_code)}</span>
            <span style="font-size:14px;font-weight:600;margin-right:15px;">
                ${[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
            </span>
        `;
    }
}

/**
 * logoutUser()
 * Clears session and redirects to login page.
 */
function logoutUser() {
    localStorage.removeItem('iicm_access_token');
    localStorage.removeItem('iicm_refresh_token');
    localStorage.removeItem('iicm_user');
    window.location.href = IICM_LOGIN;
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
    alert('Password change: please contact your system administrator.');
}
