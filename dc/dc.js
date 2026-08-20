/**
 * IICM QRTMS — Executive Director (DC) Dashboard JS
 * Role: DC — Final Approval Authority (Competent Authority)
 * Workflow: Programme Coordinator → GM (Academics) → Executive Director
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

let currentStatusFilter = 'GM_APPROVED';  // Programmes that have passed GM review
let activeProgram = null;

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth('DC');
    if (!user) return;
    renderUserProfile(user);
    loadStats();
    loadProgramsTable();
});

/* ── Section switcher ── */
function showSection(name) {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));

    const navEl = document.getElementById('nav-' + name);
    if (navEl) navEl.classList.add('active');

    const titleMap = {
        pending:       'Programmes Awaiting Final Approval',
        approved:      'Finally Approved Programmes',
        rejected:      'Returned / Rejected Programmes',
        all:           'All Programme Note Sheets',
        notifications: 'Executive Director Notifications'
    };
    document.getElementById('page-title').textContent = 'Executive Director — ' + (titleMap[name] || name);

    if (name === 'notifications') {
        document.getElementById('section-notifications').classList.add('active');
        loadNotifications();
        return;
    }

    const statusMap = {
        pending:  'GM_APPROVED',
        approved: 'APPROVED',
        rejected: 'REJECTED',
        all:      ''
    };
    currentStatusFilter = statusMap[name] !== undefined ? statusMap[name] : 'GM_APPROVED';
    document.getElementById('section-programs').classList.add('active');
    loadProgramsTable();
}

/* ── Load stats ── */
async function loadStats() {
    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/programs/dashboard-stats/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const s = data.stats || {};
            document.getElementById('stat-pending').textContent  = s.gm_approved || s.pending_approval || 0;
            document.getElementById('stat-approved').textContent = s.approved_programs || s.approved || 0;
            document.getElementById('stat-rejected').textContent = s.rejected_programs || s.rejected || 0;
            document.getElementById('stat-total').textContent    = s.total_programs || s.total || 0;
        }
    } catch(e) {
        // Stats remain as dashes
    }
}

/* ── Load programmes table ── */
async function loadProgramsTable() {
    const token  = localStorage.getItem('iicm_access_token');
    const search = document.getElementById('dc-search').value.trim();
    const quarter = document.getElementById('dc-quarter-filter').value;
    const tbody  = document.getElementById('dc-table-body');

    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#6c757d;">Loading...</td></tr>`;

    let url = `${API_BASE_URL}/programs/`;
    const params = [];
    if (currentStatusFilter) params.push(`status=${currentStatusFilter}`);
    if (search)  params.push(`search=${encodeURIComponent(search)}`);
    if (quarter) params.push(`quarter=${encodeURIComponent(quarter)}`);
    if (params.length) url += '?' + params.join('&');

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

        if (res.ok) {
            const data = await res.json();
            const list = data.results || data;

            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#6c757d;">No programmes found for this filter.</td></tr>`;
                return;
            }

            tbody.innerHTML = list.map((p, i) => {
                const gmStatus  = p.gm_status  || p.note_sheet_status || p.status;
                const edStatus  = p.ed_status  || p.status;
                const canAct    = (edStatus === 'GM_APPROVED' || edStatus === 'PENDING_APPROVAL');
                return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${p.title}</strong><br><small style="color:#6c757d;">${p.code || ''}</small></td>
                    <td>${p.program_type_name || p.program_type || '—'}</td>
                    <td>${fmtDate(p.start_date)} – ${fmtDate(p.end_date)}</td>
                    <td>${p.duration_days || '—'} day(s)</td>
                    <td>${p.coordinator_name || '—'}</td>
                    <td><span class="badge-status badge-${(gmStatus||'').toLowerCase()}">${fmtStatus(gmStatus)}</span></td>
                    <td><span class="badge-status badge-${(edStatus||'').toLowerCase()}">${fmtStatus(edStatus)}</span></td>
                    <td>
                        <button class="btn-primary btn-sm" onclick="openReview(${p.id})">
                            ${canAct ? '📝 Review & Decide' : '👁 View'}
                        </button>
                    </td>
                </tr>`;
            }).join('');

        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Server error loading programmes.</td></tr>`;
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Connection error. Is the backend running?</td></tr>`;
    }
}

/* ── Open review modal ── */
async function openReview(id) {
    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/programs/${id}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { alert('Failed to load programme details.'); return; }

        activeProgram = await res.json();
        const p = activeProgram;

        // Populate details
        document.getElementById('modal-title').textContent = '📋 ' + p.title;
        document.getElementById('md-title').textContent     = p.title;
        document.getElementById('md-type').textContent      = p.program_type_name || p.program_type || '—';
        document.getElementById('md-venue').textContent     = p.venue_name || p.venue || '—';
        document.getElementById('md-dates').textContent     = `${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}`;
        document.getElementById('md-duration').textContent  = `${p.duration_days || '—'} working day(s)`;
        document.getElementById('md-participants').textContent = `${p.target_participants || '—'} participants`;
        document.getElementById('md-budget').textContent    = p.budget ? `₹${Number(p.budget).toLocaleString('en-IN')}` : '—';
        document.getElementById('md-coordinator').textContent = p.coordinator_name || '—';
        document.getElementById('md-objective').textContent  = p.objective || p.description || '—';

        // Render remarks history
        renderRemarksHistory(p);

        // Timeline state
        updateTimeline(p.status);

        // Show/hide action buttons
        const canAct = (p.status === 'GM_APPROVED' || p.status === 'PENDING_APPROVAL');
        const footer = document.getElementById('modal-footer');
        document.getElementById('btn-return').style.display  = canAct ? 'inline-flex' : 'none';
        document.getElementById('btn-reject').style.display  = canAct ? 'inline-flex' : 'none';
        document.getElementById('btn-approve').style.display = canAct ? 'inline-flex' : 'none';
        document.getElementById('ed-remarks-group').style.display = canAct ? 'block' : 'none';
        document.getElementById('ed-remarks').value = '';

        document.getElementById('review-modal').style.display = 'flex';

    } catch(e) {
        alert('Error fetching programme data.');
    }
}

function renderRemarksHistory(p) {
    const box = document.getElementById('remarks-history');
    let html = '';

    const ns = p.note_sheet_details || p.note_sheet || {};

    if (ns.gm_remarks) {
        html += `<div class="remark-item remark-gm">
            <strong>📋 GM (Academics) Remarks:</strong>
            <p style="margin-top:4px;">${ns.gm_remarks}</p>
        </div>`;
    }

    if (ns.ed_remarks || ns.dc_remarks) {
        html += `<div class="remark-item remark-dc">
            <strong>👔 Executive Director Remarks:</strong>
            <p style="margin-top:4px;">${ns.ed_remarks || ns.dc_remarks}</p>
        </div>`;
    }

    box.innerHTML = html || `<p style="font-size:13px;color:#6c757d;margin-bottom:12px;">No previous remarks on record.</p>`;
}

function updateTimeline(status) {
    const stepGM    = document.getElementById('step-gm');
    const stepED    = document.getElementById('step-ed');
    const stepFinal = document.getElementById('step-final');

    stepGM.className = 't-step done';
    if (status === 'APPROVED') {
        stepED.className    = 't-step done';
        stepFinal.className = 't-step done';
        stepFinal.querySelector('.t-step-num').textContent = '✓';
    } else if (status === 'REJECTED') {
        stepED.className    = 't-step done';
        stepFinal.className = 't-step';
        stepFinal.querySelector('.t-step-num').textContent = '✕';
    } else {
        stepED.className    = 't-step active';
        stepFinal.className = 't-step';
        stepFinal.querySelector('.t-step-num').textContent = '✓';
    }
}

function closeModal() {
    document.getElementById('review-modal').style.display = 'none';
    activeProgram = null;
}

/* ── Submit ED decision ── */
async function submitEDDecision(decision) {
    if (!activeProgram) return;

    const token   = localStorage.getItem('iicm_access_token');
    const remarks = document.getElementById('ed-remarks').value.trim();

    if ((decision === 'reject' || decision === 'return') && !remarks) {
        alert('Please provide remarks/justification for return or rejection.');
        return;
    }

    const endpointMap = {
        approve: 'approve-note-sheet',
        reject:  'reject-note-sheet',
        return:  'return-note-sheet'
    };

    const endpoint = endpointMap[decision];
    if (!endpoint) return;

    const btn = document.getElementById(`btn-${decision === 'return' ? 'return' : decision}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

    try {
        const res = await fetch(`${API_BASE_URL}/programs/${activeProgram.id}/${endpoint}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ remarks: remarks || 'Approved by Executive Director.' })
        });

        if (res.ok) {
            closeModal();
            const msg = {
                approve: `✅ Programme "${activeProgram.title}" has been FINALLY APPROVED by the Executive Director.`,
                reject:  `❌ Programme "${activeProgram.title}" has been REJECTED.`,
                return:  `↩ Programme "${activeProgram.title}" has been RETURNED to the GM for reconsideration.`
            };
            alert(msg[decision] + '\n\nNotification sent to Programme Coordinator and GM.');
            loadStats();
            loadProgramsTable();
        } else {
            const err = await res.json();
            alert('Action failed: ' + (err.detail || err.message || 'Server error'));
        }

    } catch(e) {
        alert('Connection error during decision submission.');
    }

    if (btn) { btn.disabled = false; }
}

/* ── Notifications ── */
async function loadNotifications() {
    const token = localStorage.getItem('iicm_access_token');
    const el    = document.getElementById('notifications-list');
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#6c757d;">Loading...</div>';

    try {
        const res = await fetch(`${API_BASE_URL}/notifications/?role=DC`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const list = data.results || data;

            if (!list.length) {
                el.innerHTML = '<div style="text-align:center;padding:30px;color:#6c757d;">No notifications at this time.</div>';
                return;
            }

            el.innerHTML = list.map(n => `
                <div style="padding:14px 16px;border-bottom:1px solid #e9ecef;background:${n.is_read ? '#fff' : '#f8f9fa'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong style="color:#1b4332;">${n.title}</strong>
                        <span style="font-size:11px;color:#6c757d;">${new Date(n.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <p style="font-size:13px;color:#495057;margin-top:6px;">${n.message}</p>
                </div>
            `).join('');
        }
    } catch(e) {
        el.innerHTML = '<div style="color:red;padding:16px;">Error loading notifications.</div>';
    }
}

/* ── Helpers ── */
function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return d; }
}

function fmtStatus(s) {
    if (!s) return '—';
    return s.replace(/_/g, ' ');
}
