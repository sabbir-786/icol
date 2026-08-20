const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

function checkAuth(requiredRole = null) {
    const token    = localStorage.getItem('iicm_access_token');
    const userJson = localStorage.getItem('iicm_user');

    // ── DEV MODE: no token? Skip login, return a mock user so the dashboard loads ──
    if (!token || !userJson) {
        const devUser = {
            id: 0,
            username: 'dev_user',
            first_name: 'Dev',
            last_name: 'User',
            email: 'dev@localhost',
            role_code: requiredRole || 'SUPER_ADMIN',
            role_name: requiredRole || 'Super Admin',
            is_active: true
        };
        console.warn('[DEV MODE] No auth token found — loading dashboard with mock user:', devUser);
        return devUser;
    }

    const user = JSON.parse(userJson);

    // Allow SUPER_ADMIN to access any dashboard
    if (requiredRole && user.role_code !== requiredRole && user.role_code !== 'SUPER_ADMIN') {
        // Redirect to their own correct dashboard instead of login
        const myDash = {
            'ADMIN':                '../admin/dashboard.html',
            'PROGRAM_COORDINATOR':  '../program_coordinator/dashboard.html',
            'FACULTY':              '../faculty/dashboard.html',
            'TRAINEE':              '../trainee/dashboard.html',
            'GM':                   '../gm/dashboard.html',
            'DC':                   '../dc/dashboard.html',
            'COMPANY_ADMIN':        '../company/dashboard.html',
        };
        const redirect = myDash[user.role_code] || '../login/index.html';
        window.location.href = redirect;
        return null;
    }

    return user;
}


function renderUserProfile(user) {
    const userBadge = document.getElementById('user-profile-info');
    if (userBadge && user) {
        userBadge.innerHTML = `
            <span class="role-pill">${user.role_name || user.role_code}</span>
            <span style="font-size: 14px; font-weight: 600; margin-right: 15px;">${user.first_name || ''} ${user.last_name || ''} (${user.username})</span>
        `;
    }

    // Inject Change Password Button
    const badgeContainer = document.querySelector('.user-profile-badge');
    if (badgeContainer && !document.getElementById('btn-change-pwd')) {
        const cpBtn = document.createElement('button');
        cpBtn.id = 'btn-change-pwd';
        cpBtn.className = 'btn-secondary';
        cpBtn.innerText = 'Change Password';
        cpBtn.style.marginRight = '10px';
        cpBtn.onclick = openChangePasswordModal;
        badgeContainer.insertBefore(cpBtn, badgeContainer.querySelector('.btn-logout'));
    }

    // Inject Change Password Modal HTML
    if (!document.getElementById('changePasswordModal')) {
        const modalHtml = `
            <div id="changePasswordModal" class="modal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Change Password</h2>
                        <span class="close" onclick="closeChangePasswordModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="change-password-form" onsubmit="handleChangePassword(event)">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>Current Password *</label>
                                <input type="password" id="cp_old_pwd" class="form-control" required>
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label>New Password *</label>
                                <input type="password" id="cp_new_pwd" class="form-control" required>
                            </div>
                            <button type="submit" class="btn-primary" style="width: 100%;" id="cp_submit_btn">Update Password</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'block';
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('change-password-form').reset();
}

async function handleChangePassword(e) {
    e.preventDefault();
    const btn = document.getElementById('cp_submit_btn');
    btn.disabled = true;
    btn.innerText = 'Updating...';

    const old_password = document.getElementById('cp_old_pwd').value;
    const new_password = document.getElementById('cp_new_pwd').value;

    try {
        const token = localStorage.getItem('iicm_access_token');
        const res = await fetch(`${API_BASE_URL}/accounts/change-password/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ old_password, new_password })
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            alert("Password successfully updated. Please log in again with your new password.");
            logoutUser();
        } else {
            alert(data.message || "Failed to update password.");
        }
    } catch (e) {
        alert("Server connection error.");
    } finally {
        btn.disabled = false;
        btn.innerText = 'Update Password';
    }
}

async function logoutUser() {
    const token = localStorage.getItem('iicm_access_token');
    const refresh = localStorage.getItem('iicm_refresh_token');

    if (token) {
        try {
            await fetch(`${API_BASE_URL}/accounts/logout/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ refresh_token: refresh })
            });
        } catch (e) {
            console.warn("Logout request completed locally.");
        }
    }

    localStorage.removeItem('iicm_access_token');
    localStorage.removeItem('iicm_refresh_token');
    localStorage.removeItem('iicm_user');

    window.location.href = '../login/index.html';
}
