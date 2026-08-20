var API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

let activeNomination = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth('TRAINEE');
    if (user) renderUserProfile(user);

    loadTraineeStats();
    loadInvitationsTable();
});

function showSection(sectionName) {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));

    const navMap = {
        'invitations': 'nav-invitations',
        'programs': 'nav-programs',
        'scan': 'nav-scan',
        'notifications': 'nav-notifications'
    };

    const activeNav = document.getElementById(navMap[sectionName]);
    if (activeNav) activeNav.classList.add('active');

    const titleMap = {
        'invitations': 'Official Training Invitations',
        'programs': 'My Confirmed Training Programs',
        'scan': 'Session QR Attendance Scanner',
        'notifications': 'Executive Trainee Notifications'
    };

    document.getElementById('page-title').innerText = titleMap[sectionName] || 'Trainee Portal';

    if (sectionName === 'notifications') {
        document.getElementById('section-notifications').classList.add('active');
        loadNotifications();
    } else if (sectionName === 'programs') {
        document.getElementById('section-programs').classList.add('active');
        loadConfirmedProgramsTable();
    } else if (sectionName === 'scan') {
        document.getElementById('section-scan').classList.add('active');
    } else {
        document.getElementById('section-invitations').classList.add('active');
        loadInvitationsTable();
    }
}

async function loadTraineeStats() {
    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/trainee-stats/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const stats = data.stats;
            document.getElementById('stat-total').innerText = stats.total_invitations;
            document.getElementById('stat-accepted').innerText = stats.accepted_programs;
            document.getElementById('stat-pending').innerText = stats.pending_acceptance;
        }
    } catch (e) {
        console.warn("Failed to load trainee stats.");
    }
}

async function loadInvitationsTable() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('trainee-invitations-body');

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading invitations...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/my-invitations/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const invitations = data.invitations || [];

            if (invitations.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#6c757d;">No training invitations found.</td></tr>`;
                return;
            }

            tbody.innerHTML = invitations.map(inv => `
                <tr>
                    <td><strong>${inv.program_title}</strong></td>
                    <td><span class="role-pill">${inv.company_code}</span></td>
                    <td>${inv.venue_name || 'IICM Campus'}</td>
                    <td>${inv.start_date} to ${inv.end_date} (${inv.duration_days} days)</td>
                    <td>${inv.full_name} (${inv.eis_number})</td>
                    <td><span class="badge-status badge-${inv.confirmation_status.toLowerCase()}">${inv.confirmation_status}</span></td>
                    <td>
                        <button class="btn-primary btn-sm" onclick="openTraineeModal(${inv.id})">
                            ${inv.confirmation_status === 'PENDING' ? 'Respond' : 'View'}
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error loading invitations.</td></tr>`;
    }
}

async function loadConfirmedProgramsTable() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('trainee-programs-body');

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading confirmed programs...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/my-programs/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const programs = data.programs || [];

            if (programs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#6c757d;">No confirmed programs yet. Accept an invitation to view program details.</td></tr>`;
                return;
            }

            tbody.innerHTML = programs.map(p => `
                <tr>
                    <td>
                        <strong>${p.program_title}</strong>
                        ${p.reporting_instructions ? `<br><small style="color:#2d6a4f;">📝 <strong>Instructions:</strong> ${p.reporting_instructions}</small>` : ''}
                    </td>
                    <td>${p.program_venue_name || 'IICM Campus'}</td>
                    <td>${p.program_start_date || p.start_date} to ${p.program_end_date || p.end_date}</td>
                    <td>${p.duration_days || 1} Days</td>
                    <td><span class="badge-status badge-accepted">CONFIRMED</span></td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${p.whatsapp_group_link ? `<a href="${p.whatsapp_group_link}" target="_blank" class="btn-success btn-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;">💬 Join WhatsApp Group</a>` : ''}
                            <button class="btn-secondary btn-sm" onclick="openFeedbackModal(${p.program}, '${p.program_title.replace(/'/g, "\\'")}')">⭐ Feedback</button>
                            <button class="btn-primary btn-sm" onclick="openCertificateModal(${p.id})">📜 Certificate</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading programs.</td></tr>`;
    }
}

function openFeedbackModal(programId, programTitle) {
    document.getElementById('fb-program-id').value = programId;
    document.getElementById('fb-program-title').innerText = programTitle;
    document.getElementById('feedback-modal').style.display = 'flex';
}

function openDetailedFeedbackPortal() {
    const programTitle = document.getElementById('fb-program-title')?.innerText || 'Artificial Intelligence and Digital Transformation';
    let user = {};
    try { user = JSON.parse(localStorage.getItem('iicm_user') || '{}'); } catch(e) {}
    const name = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.username || '');
    const eis = user.username || '';
    const subsidiary = user.subsidiary || 'CCL';
    
    const params = new URLSearchParams({
        program: programTitle,
        name: name,
        eis: eis,
        subsidiary: subsidiary
    });

    window.open(`../feedback/index.html?${params.toString()}`, '_blank');
}
window.openDetailedFeedbackPortal = openDetailedFeedbackPortal;

function closeFeedbackModal() {
    document.getElementById('feedback-modal').style.display = 'none';
}

async function submitFeedbackForm(evt) {
    evt.preventDefault();
    const token = localStorage.getItem('iicm_access_token');
    const programId = document.getElementById('fb-program-id').value;

    try {
        const res = await fetch(`${API_BASE_URL}/feedback/submit/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                program_id: programId,
                rating: document.getElementById('fb-rating').value,
                content_rating: document.getElementById('fb-content').value,
                faculty_rating: document.getElementById('fb-faculty').value,
                facility_rating: document.getElementById('fb-facility').value,
                comments: document.getElementById('fb-comments').value
            })
        });

        if (res.ok) {
            closeFeedbackModal();
            alert("Thank you! Your feedback has been submitted successfully.");
        } else {
            alert("Failed to submit feedback.");
        }
    } catch (e) {
        alert("Server error during feedback submission.");
    }
}

async function openCertificateModal(nominationId) {
    const token = localStorage.getItem('iicm_access_token');
    const modal = document.getElementById('cert-modal');
    const blockedBox = document.getElementById('cert-blocked-box');
    const certCard = document.getElementById('cert-display-card');
    const printBtn = document.getElementById('btn-print-cert');

    modal.style.display = 'flex';
    blockedBox.style.display = 'none';
    certCard.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/reports/certificate/?nomination_id=${nominationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok && data.eligible) {
            const cert = data.certificate;
            document.getElementById('cert-name').innerText = cert.trainee_name;
            document.getElementById('cert-company').innerText = cert.company;
            document.getElementById('cert-title').innerText = cert.program_title;
            document.getElementById('cert-dates').innerText = `${cert.start_date} to ${cert.end_date}`;
            document.getElementById('cert-pct').innerText = `${cert.attendance_percentage}%`;
            document.getElementById('cert-number').innerText = `Certificate Ref: ${cert.certificate_number}`;

            certCard.style.display = 'block';
            printBtn.style.display = 'inline-block';
        } else {
            // THRESHOLD NOT MET (< 75%)
            blockedBox.innerHTML = `<strong>⚠️ Certificate Generation Blocked!</strong><br>${data.message || 'Attendance threshold of 75% was not met.'}`;
            blockedBox.style.display = 'block';
            printBtn.style.display = 'none';
        }
    } catch (e) {
        blockedBox.innerText = "Error verifying certificate eligibility.";
        blockedBox.style.display = 'block';
        printBtn.style.display = 'none';
    }
}

function closeCertModal() {
    document.getElementById('cert-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    var token = new URLSearchParams(window.location.search).get('attendance_token');
    var input = document.getElementById('qr-token-input');
    if (token && input) {
        input.value = token;
        var section = document.getElementById('section-attendance');
        if (section && typeof showSection === 'function') showSection('attendance');
    }
});

async function handleMarkAttendance(e) {
    e.preventDefault();
    const token = localStorage.getItem('iicm_access_token');
    const qrToken = document.getElementById('qr-token-input').value.trim();
    const alertBox = document.getElementById('scan-alert-box');

    alertBox.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/mark/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token: qrToken })
        });

        const data = await res.json();

        if (res.ok) {
            alertBox.className = 'alert alert-success';
            alertBox.innerHTML = `<strong>✅ Attendance Marked!</strong><br>${data.message}`;
            alertBox.style.display = 'block';
            document.getElementById('qr-token-input').value = '';
        } else {
            alertBox.className = 'alert alert-danger';
            alertBox.innerHTML = `<strong>⚠️ Attendance Failed:</strong><br>${data.message}`;
            alertBox.style.display = 'block';
        }
    } catch (err) {
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = `<strong>Connection Error:</strong> Server unreachable.`;
        alertBox.style.display = 'block';
    }
}

async function loadNotifications() {
    const token = localStorage.getItem('iicm_access_token');
    const container = document.getElementById('notifications-list');

    if (!container) return;
    container.innerHTML = `<div>Loading notifications...</div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/notifications/?role=TRAINEE`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const results = data.results || data;

            if (results.length === 0) {
                container.innerHTML = `<div style="padding:30px; text-align:center; color:#6c757d;">No notifications.</div>`;
                return;
            }

            container.innerHTML = results.map(n => `
                <div style="padding:16px; border-bottom:1px solid #e9ecef; background:${n.is_read ? '#fff' : '#f8f9fa'};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#1b4332;">${n.title}</strong>
                        <span style="font-size:11px; color:#6c757d;">${new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p style="font-size:13px; color:#495057; margin-top:6px;">${n.message}</p>
                </div>
            `).join('');
        }
    } catch (e) {
        container.innerHTML = `<div style="color:red;">Error loading notifications.</div>`;
    }
}
