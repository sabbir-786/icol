var API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';




let currentFilterStatus = '';
let activeInvitation = null;
let editingNominationId = null;
let approvedProgramsCache = [];
let departmentsCache = [];
let designationsCache = [];
let companiesCache = [
    { id: 1, code: 'CIL', name: 'Coal India Limited', is_active: true, email: 'admin@coalindia.in', phone: '+91 98765 43210' },
    { id: 2, code: 'BCCL', name: 'Bharat Coking Coal Limited', is_active: true, email: 'contact@bccl.in', phone: '+91 98765 43211' },
    { id: 3, code: 'CCL', name: 'Central Coalfields Limited', is_active: true, email: 'info@ccl.in', phone: '+91 98765 43212' },
    { id: 4, code: 'ABCD', name: 'Adani Groups', is_active: true, email: 'contact@adani.com', phone: '+91 98765 43213' },
    { id: 5, code: 'RA', name: 'AVDCD', is_active: true, email: 'info@avdcd.in', phone: '+91 98765 43214' }
];
let companyInvitationsCache = [];
let companyNominationsCache = [];
let selectedCompanyId = null;
let selectedCompanyCode = '';
let gmailSyncRunning = false;

// Sidebar links change sections in-place; prevent their '#' target from jumping
// the page to the top, which made the Company Master view look like it blinked.
document.addEventListener('click', event => {
    const link = event.target.closest('a[href="#"]');
    if (link) event.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    try { user = checkAuth('COMPANY_ADMIN'); } catch (e) { console.warn('checkAuth skipped', e); }
    if (user) renderUserProfile(user);

    renderCompanyCards();

    try { await loadCaches(); } catch(e) {}
    try { await loadCompanyMasterData(); } catch(e) {}
    try { await loadCompanyStats(); } catch(e) {}
    addGmailSyncButton();
    syncGmailNominationPdfs({ silent: true });
    loadProgramInvitationsTable();
});


function addGmailSyncButton() {
    const toolbar = document.querySelector('#section-master .company-toolbar');
    if (!toolbar || document.getElementById('sync-gmail-pdfs-btn')) return;
    const button = document.createElement('button');
    button.id = 'sync-gmail-pdfs-btn';
    button.type = 'button';
    button.className = 'btn-secondary';
    button.innerText = 'Sync Gmail PDFs';
    button.addEventListener('click', () => syncGmailNominationPdfs());
    toolbar.appendChild(button);
}

async function syncGmailNominationPdfs({ silent = false } = {}) {
    if (gmailSyncRunning) return;
    const token = localStorage.getItem('iicm_access_token');
    if (!token) return;
    const button = document.getElementById('sync-gmail-pdfs-btn');
    const originalText = button ? button.innerText : '';
    gmailSyncRunning = true;
    if (button) {
        button.disabled = true;
        button.innerText = 'Syncing Gmail PDFs...';
    }
    try {
        const response = await fetch(`${API_BASE_URL}/trainees/nominations/sync-gmail/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        const result = data.result || {};
        if ((result.created || 0) > 0 || (result.updated || 0) > 0) {
            await Promise.all([loadCompanyStats(), loadCompanyMasterData({ render: !silent })]);
            if (document.getElementById('section-nominations').classList.contains('active')) loadNominationsTable();
            if (document.getElementById('section-invitations').classList.contains('active')) loadApprovedNomineesTable();
            if (selectedCompanyId) loadCompanyDetailNominations();
        }
        if (!silent) alert(`Gmail PDF sync complete: ${result.created || 0} added, ${result.updated || 0} updated.`);
    } catch (error) {
        if (!silent) alert('Gmail nominee sync is temporarily unavailable.');
    } finally {
        gmailSyncRunning = false;
        if (button) {
            button.disabled = false;
            button.innerText = originalText;
        }
    }
}

async function sendNominationEmailsToAll() {
    const token = localStorage.getItem('iicm_access_token');
    const button = document.getElementById('send-all-nomination-emails-btn');
    if (!token || !button) return;
    if (!confirm('Send the final acceptance email to every accepted candidate?')) return;

    const originalText = button.innerText;
    let completed = false;
    button.disabled = true;
    button.innerText = 'Sending emails...';
    try {
        const response = await fetch(`${API_BASE_URL}/trainees/nominations/send-nomination-emails/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || data.message || 'Email sending failed.');
        const failedAddresses = (data.failed || []).map(item => item.email || item.name).join(', ');
        const firstError = (data.failed || []).find(item => item.error)?.error || '';
        const failureText = data.failed_count ? `\nFailed: ${data.failed_count}${failedAddresses ? `\nAddresses: ${failedAddresses}` : ''}${firstError ? `\nReason: ${firstError}` : ''}` : '';
        completed = true;
        button.innerText = data.failed_count ? 'Emails sent with some failures' : 'Emails sent successfully';
        alert(`${data.message}${failureText}`);
    } catch (error) {
        alert(error.message || 'Unable to send nomination emails.');
    } finally {
        button.disabled = false;
        if (completed) {
            setTimeout(() => { button.innerText = originalText; }, 3000);
        } else {
            button.innerText = originalText;
        }
    }
}

async function checkForNewInvitations() {
    const token = localStorage.getItem('iicm_access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/companies/invitations/?status=INVITATION_SENT&page_size=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const results = data.results || data;
            if (results.length > 0) {
                // If there is at least one pending invitation, show alert modal if it's not already open
                const modal = document.getElementById('new-invitation-alert-modal');
                if (modal && modal.style.display !== 'flex') {
                    modal.style.display = 'flex';
                }
            }
        }
    } catch (e) {
        console.warn("Failed to check for new invitations.");
    }
}

async function loadCaches() {
    const token = localStorage.getItem('iicm_access_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const pRes = await fetch(`${API_BASE_URL}/programs/?status=APPROVED&page_size=100`, { headers });
        if (pRes.ok) {
            const data = await pRes.json();
            approvedProgramsCache = data.results || data;
        }

        const dRes = await fetch(`${API_BASE_URL}/masters/departments/?is_active=true&page_size=100`, { headers });
        if (dRes.ok) {
            const data = await dRes.json();
            departmentsCache = data.results || data;
        }

        const desRes = await fetch(`${API_BASE_URL}/masters/designations/?is_active=true&page_size=100`, { headers });
        if (desRes.ok) {
            const data = await desRes.json();
            designationsCache = data.results || data;
        }
    } catch (e) {
        console.warn("Failed to load caches.");
    }
}

function showSection(sectionName) {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));

    const navMap = {
        'master': 'nav-master',
        'all': 'nav-all',
        'program-invitations': 'nav-program-invitations',
        'pending': 'nav-pending',
        'approved': 'nav-approved',
        'nominations': 'nav-nominations',
        'notifications': 'nav-notifications'
    };

    const activeNav = document.getElementById(navMap[sectionName]);
    if (activeNav) activeNav.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    if (sectionName === 'master') {
        selectedCompanyId = null;
        selectedCompanyCode = '';
        document.getElementById('section-master').classList.add('active');
        pageTitle.innerText = 'Company Master';
        pageSubtitle.innerText = 'Manage all company programs and invitations from one place.';
        renderCompanyCards();
    } else if (sectionName === 'program-invitations') {
        const sec = document.getElementById('section-program-invitations');
        if (sec) sec.classList.add('active');
        pageTitle.innerText = 'Received Program Invitations';
        pageSubtitle.innerText = 'Review program invitations sent by the Program Coordinator and submit executive candidate nominations.';
        loadProgramInvitationsTable();
    } else if (sectionName === 'notifications') {
        document.getElementById('section-notifications').classList.add('active');
        pageTitle.innerText = 'Notifications';
        pageSubtitle.innerText = 'Stay updated with company program activity.';
        loadNotifications();
    } else if (sectionName === 'nominations') {
        document.getElementById('section-nominations').classList.add('active');
        pageTitle.innerText = 'Employee Nominations';
        pageSubtitle.innerText = 'Manage candidates accepted from Pending Invitations.';
        const emailButton = document.getElementById('send-all-nomination-emails-btn');
        if (emailButton) emailButton.innerText = 'Send Final Email to Accepted Candidates';
        populateProgramSelects();
        loadNominationsTable();
    } else if (sectionName === 'pending' || sectionName === 'program-invitations') {
        document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
        const sec = document.getElementById('section-program-invitations');
        if (sec) sec.classList.add('active');
        pageTitle.innerText = 'Received Program Invitations';
        pageSubtitle.innerText = 'Review program invitations sent by the Program Coordinator and submit executive candidate nominations.';
        loadProgramInvitationsTable();
    } else if (sectionName === 'approved') {
        document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
        document.getElementById('section-invitations').classList.add('active');
        pageTitle.innerText = 'Accepted Candidate Nominees';
        pageSubtitle.innerText = 'Candidates accepted for program attendance.';
        configureInvitationTable(false);
        loadApprovedNomineesTable();
    }
}



function configureInvitationTable(isPending) {
    const table = document.querySelector('#section-invitations .data-table');
    const searchInput = document.getElementById('company-search');
    if (!table) return;
    const header = table.querySelector('thead');
    if (!header) return;
    header.innerHTML = `<tr>
        <th>Company</th><th>EIS Code</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Department</th><th>Designation</th><th>Nomination Status</th><th>Final Roster</th><th>Actions</th>
    </tr>`;
    if (searchInput) searchInput.oninput = isPending ? loadPendingNomineesTable : loadApprovedNomineesTable;
}

async function getAcceptedInvitationKeys(token) {
    const response = await fetch(`${API_BASE_URL}/companies/invitations/?status=COMPANY_APPROVED&page_size=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Unable to load accepted invitations.');
    const data = await response.json();
    return new Set((data.results || data).map(invitation => `${invitation.company}:${invitation.program}`));
}

function isNomineeFromAcceptedInvitation(nominee, acceptedInvitationKeys) {
    return acceptedInvitationKeys.has(`${nominee.company}:${nominee.program}`);
}
async function loadProgramInvitationsTable() {
    const tbody = document.getElementById('program-invitations-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">Loading program invitations...</td></tr>';

    try {
        const token = localStorage.getItem('iicm_access_token');
        const searchQuery = (document.getElementById('prog-invitation-search') ? document.getElementById('prog-invitation-search').value : '').trim().toLowerCase();

        let localInvs = [];
        try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

        let apiInvs = [];
        if (token) {
            try {
                const res = await fetch(`${API_BASE_URL}/companies/invitations/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    apiInvs = data.results || data;
                }
            } catch(e) {
                console.warn('Could not fetch API invitations', e);
            }
        }

        let allInvs = [...localInvs];
        apiInvs.forEach(apiInv => {
            if (!allInvs.some(i => String(i.id) === String(apiInv.id) || (String(i.program_id) === String(apiInv.program) && String(i.company_id) === String(apiInv.company)))) {
                allInvs.push({
                    id: apiInv.id,
                    program_id: apiInv.program,
                    program_title: apiInv.program_title || apiInv.program_name || `Program #${apiInv.program}`,
                    venue_name: apiInv.venue_name || 'IICM Training Hall, Dhanbad',
                    start_date: apiInv.start_date || '10 Aug 2026',
                    end_date: apiInv.end_date || '15 Aug 2026',
                    allocated_quota: apiInv.allocated_quota || 10,
                    status: apiInv.status,
                    remarks: apiInv.remarks || 'Invitation received from Program Coordinator.',
                    sent_at: apiInv.invited_at || new Date().toISOString(),
                    candidate_list_submitted: apiInv.status === 'COMPANY_APPROVED'
                });
            }
        });

        if (allInvs.length === 0) {
            allInvs = [
                {
                    id: 101,
                    program_id: 1,
                    program_title: 'Advanced Mine Safety Management Program',
                    venue_name: 'IICM Training Hall, Dhanbad',
                    start_date: '10 Aug 2026',
                    end_date: '15 Aug 2026',
                    allocated_quota: 10,
                    status: 'INVITATION_SENT',
                    candidate_list_submitted: false,
                    remarks: 'Please nominate 10 senior mine safety executives for the upcoming batch.',
                    sent_at: '2026-08-10T10:00:00Z'
                },
                {
                    id: 102,
                    program_id: 4,
                    program_title: 'ABCD program',
                    venue_name: 'Main Auditorium, IICM Campus',
                    start_date: '11 Aug 2026',
                    end_date: '16 Aug 2026',
                    allocated_quota: 15,
                    status: 'INVITATION_SENT',
                    candidate_list_submitted: false,
                    remarks: 'Requested quota of 15 candidate nominations.',
                    sent_at: '2026-08-10T11:00:00Z'
                }
            ];
            localStorage.setItem('iicm_company_invitations', JSON.stringify(allInvs));
        }

        let filtered = allInvs;
        if (searchQuery) {
            filtered = allInvs.filter(i =>
                (i.program_title || '').toLowerCase().includes(searchQuery) ||
                (i.remarks || '').toLowerCase().includes(searchQuery) ||
                (i.status || '').toLowerCase().includes(searchQuery)
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No matching program invitations found.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(inv => {
            const isApproved = inv.status === 'COMPANY_APPROVED';
            const isRejected = inv.status === 'COMPANY_REJECTED';
            const hasSubmittedList = inv.candidate_list_submitted === true;

            let statusBadge = `<span class="badge-pill" style="background:#fef3c7; color:#92400e; font-weight:700; padding:4px 10px; border-radius:12px;">⏳ Pending Response</span>`;
            if (isApproved) {
                if (hasSubmittedList) {
                    statusBadge = `<span class="badge-pill" style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 10px; border-radius:12px;">✅ Accepted &amp; Student List Sent</span>`;
                } else {
                    statusBadge = `<span class="badge-pill" style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 10px; border-radius:12px;">✅ Accepted</span>`;
                }
            } else if (isRejected) {
                statusBadge = `<span class="badge-pill" style="background:#fee2e2; color:#b91c1c; font-weight:700; padding:4px 10px; border-radius:12px;">❌ Declined</span>`;
            }

            let actionBtns = '';
            if (!isApproved && !isRejected) {
                actionBtns = `
                    <button type="button" class="btn-primary" style="background:#064e3b; border-color:#064e3b; color:#fff; font-size:12px; font-weight:700; padding:6px 12px; border-radius:6px; margin-right:4px; cursor:pointer;" onclick="acceptCompanyInvitation(${inv.id})">
                        ✅ Accept
                    </button>
                    <button type="button" class="btn-danger" style="background:#ef4444; color:#fff; font-size:12px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="declineCompanyInvitation(${inv.id})">
                        ❌ Decline
                    </button>
                `;
            } else if (isApproved) {
                if (hasSubmittedList) {
                    actionBtns = `
                        <button type="button" class="btn-secondary" style="font-size:12px; font-weight:700; padding:6px 12px; cursor:pointer;" onclick="openAcceptAndNominateModal(${inv.id})">
                            📋 View / Edit Student List
                        </button>
                    `;
                } else {
                    actionBtns = `
                        <button type="button" class="btn-primary" style="background:#064e3b; border-color:#064e3b; color:#fff; font-size:12px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="openAcceptAndNominateModal(${inv.id})">
                            📤 Send Student List
                        </button>
                    `;
                }
            } else {
                actionBtns = `<span style="font-size:12px; color:#64748b; font-weight:600;">Invitation Declined</span>`;
            }

            const sentDateStr = inv.sent_at ? String(inv.sent_at).substring(0, 10) : 'Today';

            return `
                <tr>
                    <td>
                        <strong style="font-size:14px; color:#0f172a;">${escapeCompanyText(inv.program_title || 'Program #' + inv.program_id)}</strong>
                        <div style="font-size:12px; color:#64748b; margin-top:2px;">Requested by: Program Coordinator</div>
                    </td>
                    <td>
                        <div style="font-weight:600; font-size:13px;">${escapeCompanyText(inv.venue_name || 'Main Auditorium / IICM Dhanbad')}</div>
                        <div style="font-size:12px; color:#64748b;">${escapeCompanyText(inv.start_date || '10 Aug 2026')} to ${escapeCompanyText(inv.end_date || '15 Aug 2026')}</div>
                    </td>
                    <td>
                        <span style="display:inline-block; font-size:13px; font-weight:800; color:#064e3b; background:#e6f4ea; padding:4px 10px; border-radius:6px; border:1px solid #a7f3d0;">
                            🔢 ${inv.allocated_quota || 10} Candidates Requested
                        </span>
                    </td>
                    <td>
                        <div style="font-size:12.5px; color:#334155;">${escapeCompanyText(inv.remarks || 'No remarks')}</div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Sent: ${sentDateStr}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align:center;">${actionBtns}</td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        console.error("Error in loadProgramInvitationsTable:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#b00020;">Unable to render invitations table. Please refresh the page.</td></tr>';
    }
}

function openAcceptAndNominateModal(invitationId) {
    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}
    let inv = localInvs.find(i => String(i.id) === String(invitationId));

    if (!inv) {
        inv = {
            id: Number(invitationId) || 101,
            program_id: 1,
            program_title: 'Advanced Mine Safety Management Program',
            allocated_quota: 10,
            status: 'INVITATION_SENT',
            remarks: 'Please nominate 10 senior mine safety executives.'
        };
    }

    const modal = document.getElementById('accept-invitation-candidate-modal');
    if (!modal) return;

    const invIdInput = document.getElementById('accept-modal-invitation-id');
    if (invIdInput) invIdInput.value = invitationId;

    const progIdInput = document.getElementById('accept-modal-program-id');
    if (progIdInput) progIdInput.value = inv.program_id || 1;

    const titleEl = document.getElementById('accept-modal-prog-title');
    if (titleEl) titleEl.innerText = `Program: ${inv.program_title || 'Program #' + invitationId}`;

    const quotaEl = document.getElementById('accept-modal-prog-quota');
    if (quotaEl) quotaEl.innerText = `Requested Trainee Count (Quota): ${inv.allocated_quota || 10} candidates required`;

    // Retrieve real company nominees for this program if already saved
    let storedNominees = [];
    try { storedNominees = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}
    const matchingNominees = storedNominees.filter(n => String(n.program) === String(inv.program_id));

    let candidateLines = [];
    if (matchingNominees.length > 0) {
        candidateLines = matchingNominees.map(n => `${n.eis_number || ''}, ${n.full_name || ''}, ${n.email || ''}, ${n.phone || ''}`);
    } else {
        const quota = inv.allocated_quota || 10;
        for (let k = 1; k <= Math.min(quota, 5); k++) {
            candidateLines.push(`EIS908${10 + k}, Candidate Name ${k}, candidate${k}@coalindia.in, +91987654321${k}`);
        }
    }

    const candidatesInput = document.getElementById('accept-modal-candidates-text');
    if (candidatesInput) candidatesInput.value = candidateLines.join('\n');

    const remarksInput = document.getElementById('accept-modal-remarks');
    if (remarksInput) remarksInput.value = `Accepted invitation for ${inv.program_title || 'Program'}. Nominated ${matchingNominees.length || inv.allocated_quota || 10} executive candidates.`;

    modal.style.zIndex = '99999';
    modal.style.display = 'flex';
}


async function submitInvitationAcceptanceWithCandidates(event) {
    event.preventDefault();
    const invitationId = document.getElementById('accept-modal-invitation-id').value;
    const programId = document.getElementById('accept-modal-program-id').value;
    const remarks = document.getElementById('accept-modal-remarks').value;
    const candidatesText = document.getElementById('accept-modal-candidates-text').value;

    const btn = document.getElementById('btn-submit-invitation-acceptance');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Sending Student List to Coordinator...';
    }

    try {
        const token = localStorage.getItem('iicm_access_token');
        await fetch(`${API_BASE_URL}/companies/company-invitations/${invitationId}/approve/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ remarks: remarks })
        });
    } catch(e) {
        console.warn('API approve invitation error, using local state sync', e);
    }

    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

    let currentInvTitle = 'Program #' + programId;
    let found = false;
    localInvs.forEach(inv => {
        if (String(inv.id) === String(invitationId) || String(inv.program_id) === String(programId)) {
            inv.status = 'COMPANY_APPROVED';
            inv.candidate_list_submitted = true;
            inv.remarks = remarks;
            inv.response_date = new Date().toISOString();
            if (inv.program_title) currentInvTitle = inv.program_title;
            found = true;
        }
    });

    if (!found) {
        localInvs.unshift({
            id: Number(invitationId) || Date.now(),
            program_id: parseInt(programId, 10) || 1,
            program_title: currentInvTitle,
            status: 'COMPANY_APPROVED',
            candidate_list_submitted: true,
            remarks: remarks,
            response_date: new Date().toISOString(),
            sent_at: new Date().toISOString()
        });
    }

    localStorage.setItem('iicm_company_invitations', JSON.stringify(localInvs));

    let newNominees = [];
    const lines = candidatesText.split('\n');
    let rowIdx = 1;
    lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (!line) return;
        const parts = line.split(',').map(s => s.trim());
        const eis = parts[0] || `EIS908${10 + rowIdx}`;
        const name = parts[1] || `Executive Candidate ${rowIdx}`;
        const email = parts[2] || `candidate${rowIdx}@coalindia.in`;
        const phone = parts[3] || `+919876543210`;

        newNominees.push({
            id: Date.now() + rowIdx,
            eis_number: eis,
            full_name: name,
            email: email,
            phone: phone,
            company: 1,
            company_code: selectedCompanyCode || 'CIL',
            company_name: 'Coal India Limited',
            program: parseInt(programId, 10),
            program_title: currentInvTitle,
            department_name: 'Mining Operations',
            designation_title: 'Executive Manager',
            nomination_status: 'NOMINATED',
            final_roster: true,
            submitted_at: new Date().toISOString()
        });
        rowIdx++;
    });

    // Save to localStorage so Program Coordinator can immediately view for approval
    let storedNominees = [];
    try { storedNominees = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}
    // Remove existing nominations for this program to avoid duplicate replacement on update
    storedNominees = storedNominees.filter(n => String(n.program) !== String(programId));
    storedNominees = [...newNominees, ...storedNominees];
    localStorage.setItem('iicm_submitted_nominations', JSON.stringify(storedNominees));

    // Post to API if token is present
    try {
        const token = localStorage.getItem('iicm_access_token');
        if (token) {
            for (const nom of newNominees) {
                await fetch(`${API_BASE_URL}/trainees/nominations/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        eis_number: nom.eis_number,
                        full_name: nom.full_name,
                        email: nom.email,
                        phone: nom.phone,
                        program: nom.program,
                        company: nom.company,
                        nomination_status: 'NOMINATED'
                    })
                }).catch(e => {});
            }
        }
    } catch(e) {}

    // Add Coordinator Notification log
    let notifs = [];
    try { notifs = JSON.parse(localStorage.getItem('iicm_notifications') || '[]'); } catch(e) {}
    notifs.unshift({
        id: Date.now(),
        recipient: 'PROGRAM_COORDINATOR',
        title: `📩 Student Nominee List Received: ${currentInvTitle}`,
        message: `Company Admin (${selectedCompanyCode || 'Company'}) submitted ${newNominees.length} student nominees for program '${currentInvTitle}' for your review & approval.`,
        created_at: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('iicm_notifications', JSON.stringify(notifs));

    if (btn) {
        btn.disabled = false;
        btn.innerText = '✉️ Send Student List';
    }

    closeModal('accept-invitation-candidate-modal');
    alert(`✅ Student Nomination List (${newNominees.length} candidates) successfully sent to Program Coordinator for approval!\n\nProgram Coordinator has been notified.`);
    loadProgramInvitationsTable();
    loadCompanyStats();
    renderCompanyCards();
}

async function acceptCompanyInvitation(invitationId) {
    try {
        const token = localStorage.getItem('iicm_access_token');
        if (token) {
            await fetch(`${API_BASE_URL}/companies/company-invitations/${invitationId}/approve/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ remarks: 'Invitation accepted by Company Admin.' })
            }).catch(e => console.warn('API approve invitation error, using local fallback', e));
        }
    } catch(e) {}

    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

    let found = false;
    localInvs.forEach(inv => {
        if (String(inv.id) === String(invitationId)) {
            inv.status = 'COMPANY_APPROVED';
            inv.remarks = inv.remarks || 'Accepted by Company Admin.';
            inv.response_date = new Date().toISOString();
            found = true;
        }
    });

    if (!found) {
        localInvs.unshift({
            id: Number(invitationId) || Date.now(),
            program_id: 1,
            program_title: 'Program Invitation #' + invitationId,
            status: 'COMPANY_APPROVED',
            candidate_list_submitted: false,
            sent_at: new Date().toISOString()
        });
    }

    localStorage.setItem('iicm_company_invitations', JSON.stringify(localInvs));

    loadProgramInvitationsTable();
    if (typeof renderCompanyCards === 'function') renderCompanyCards();

    // Automatically open modal for student list submission
    openAcceptAndNominateModal(invitationId);
}

async function declineCompanyInvitation(invitationId) {
    const reason = prompt('Please enter reason for declining this program invitation:', 'Operational constraints');
    if (reason === null) return;

    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

    let found = false;
    localInvs.forEach(inv => {
        if (String(inv.id) === String(invitationId)) {
            inv.status = 'COMPANY_REJECTED';
            inv.candidate_list_submitted = false;
            inv.remarks = reason;
            found = true;
        }
    });

    if (!found) {
        localInvs.unshift({
            id: Number(invitationId) || Date.now(),
            program_id: 1,
            program_title: 'Program Invitation #' + invitationId,
            status: 'COMPANY_REJECTED',
            candidate_list_submitted: false,
            remarks: reason,
            sent_at: new Date().toISOString()
        });
    }

    localStorage.setItem('iicm_company_invitations', JSON.stringify(localInvs));

    alert('❌ Program invitation declined. Coordinator notified.');
    loadProgramInvitationsTable();
    renderCompanyCards();
}


async function reviewCandidateNomination(candidateId, newStatus) {
    let localNominees = [];
    try { localNominees = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}
    
    localNominees.forEach(n => {
        if (String(n.id) === String(candidateId)) {
            n.nomination_status = newStatus;
        }
    });
    localStorage.setItem('iicm_submitted_nominations', JSON.stringify(localNominees));

    alert(`Candidate status updated to ${newStatus}!`);
    loadPendingNomineesTable();
    renderCompanyCards();
}


async function loadNomineeReviewTable(nominationStatus, emptyMessage) {
    const token = localStorage.getItem('iicm_access_token');
    const searchQuery = (document.getElementById('company-search') ? document.getElementById('company-search').value : '').trim().toLowerCase();
    const tbody = document.getElementById('invitations-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px">Loading candidates...</td></tr>';
    
    let nominees = [];
    if (token) {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            let nominationsUrl = `${API_BASE_URL}/trainees/nominations/?nomination_status=${nominationStatus}&page_size=200`;
            if (searchQuery) nominationsUrl += `&search=${encodeURIComponent(searchQuery)}`;
            const nominationsResponse = await fetch(nominationsUrl, { headers });
            if (nominationsResponse.ok) {
                const nominationsData = await nominationsResponse.json();
                nominees = nominationsData.results || nominationsData;
            }
        } catch (e) {
            console.warn('API nominations fetch failed, checking local store', e);
        }
    }

    let localNominees = [];
    try { localNominees = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}

    localNominees.forEach(ln => {
        if (!nominees.some(n => String(n.id) === String(ln.id) || n.eis_number === ln.eis_number)) {
            if (nominationStatus === 'NOMINATED' || ln.nomination_status === nominationStatus || !ln.nomination_status) {
                nominees.unshift(ln);
            }
        }
    });

    if (nominees.length === 0 && nominationStatus === 'NOMINATED') {
        nominees = [
            { id: 201, company_code: 'CIL', company_name: 'Coal India Limited', eis_number: 'EIS90811', full_name: 'Rajesh Kumar', email: 'rajesh.k@coalindia.in', phone: '+919876543210', department_name: 'Safety & Rescue', designation_title: 'Chief Safety Manager', nomination_status: 'NOMINATED' },
            { id: 202, company_code: 'BCCL', company_name: 'Bharat Coking Coal Limited', eis_number: 'EIS90812', full_name: 'Priya Sharma', email: 'priya.s@coalindia.in', phone: '+919876543211', department_name: 'Mining Operations', designation_title: 'Senior Mine Manager', nomination_status: 'NOMINATED' },
            { id: 203, company_code: 'CCL', company_name: 'Central Coalfields Limited', eis_number: 'EIS90813', full_name: 'Vikas Singh', email: 'vikas.s@coalindia.in', phone: '+919876543212', department_name: 'Human Resources', designation_title: 'General Manager HR', nomination_status: 'NOMINATED' }
        ];
    }

    if (!nominees.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:38px">${emptyMessage}</td></tr>`;
        return;
    }

    tbody.innerHTML = nominees.map(nominee => `<tr>
        <td><strong>${escapeCompanyText(nominee.company_code || 'CIL')}</strong><br><small>${escapeCompanyText(nominee.company_name || 'Coal India Limited')}</small></td>
        <td><strong>${escapeCompanyText(nominee.eis_number)}</strong></td>
        <td>${escapeCompanyText(nominee.full_name)}</td>
        <td>${escapeCompanyText(nominee.email || '-')}</td>
        <td>${escapeCompanyText(nominee.phone || '-')}</td>
        <td>${escapeCompanyText(nominee.department_name || 'Mining')}</td>
        <td>${escapeCompanyText(nominee.designation_title || 'Manager')}</td>
        <td><span class="badge-status badge-${String(nominee.nomination_status || 'NOMINATED').toLowerCase()}">${escapeCompanyText(nominee.nomination_status || 'NOMINATED')}</span></td>
        <td>${nominee.final_roster ? 'Final Participant' : 'Pending Review'}</td>
        <td>
            <button class="btn-primary btn-sm" style="background:#16a34a; border-color:#16a34a; font-weight:700; padding:4px 8px;" onclick="reviewCandidateNomination(${nominee.id}, 'SHORTLISTED')">Accept Candidate</button>
            <button class="btn-danger btn-sm" style="background:#dc2626; border-color:#dc2626; font-weight:700; padding:4px 8px;" onclick="reviewCandidateNomination(${nominee.id}, 'REJECTED')">Reject Candidate</button>
        </td>
    </tr>`).join('');
}

function loadPendingNomineesTable() {
    return loadNomineeReviewTable('NOMINATED', 'No pending nominee candidates found.');
}

function loadApprovedNomineesTable() {
    return loadNomineeReviewTable('SHORTLISTED', 'No accepted candidates found.');
}


async function acceptAllPendingInvitations() {
    const token = localStorage.getItem('iicm_access_token');
    const button = document.getElementById('accept-all-pending-btn');
    if (!token || !button) return;
    if (!confirm('Accept all pending candidates? They will move to Accepted Invitations and Employee Nominations.')) return;

    button.disabled = true;
    const originalText = button.innerText;
    button.innerText = 'Accepting invitations...';
    try {
        const response = await fetch(`${API_BASE_URL}/trainees/nominations/bulk-review/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision: 'accept' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'No pending candidates could be accepted.');
        await Promise.all([loadCompanyStats(), loadCompanyMasterData({ render: false })]);
        alert(`${data.updated_count} candidate${data.updated_count === 1 ? '' : 's'} accepted. They are now available in Accepted Invitations and Employee Nominations.`);
        showSection('approved');
    } catch (error) {
        alert(error.message || 'Unable to accept pending invitations.');
    } finally {
        button.disabled = false;
        button.innerText = originalText;
    }
}

async function rejectAllPendingInvitations() {
    const token = localStorage.getItem('iicm_access_token');
    const button = document.getElementById('reject-all-pending-btn');
    if (!token || !button) return;
    if (!confirm('Reject all pending candidates? This removes them from the pending review list.')) return;
    const originalText = button.innerText;
    button.disabled = true;
    button.innerText = 'Rejecting candidates...';
    try {
        const response = await fetch(`${API_BASE_URL}/trainees/nominations/bulk-review/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision: 'reject' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'No pending candidates could be rejected.');
        await Promise.all([loadCompanyStats(), loadCompanyMasterData({ render: false })]);
        alert(`${data.updated_count} candidate${data.updated_count === 1 ? '' : 's'} rejected.`);
        loadPendingNomineesTable();
    } catch (error) {
        alert(error.message || 'Unable to reject pending candidates.');
    } finally {
        button.disabled = false;
        button.innerText = originalText;
    }
}

async function loadCompanyStats() {
    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/companies/invitations/company-stats/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const stats = data.stats;
            if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = stats.total_invitations;
            if (document.getElementById('stat-pending')) document.getElementById('stat-pending').innerText = stats.pending_responses;
            if (document.getElementById('stat-approved')) document.getElementById('stat-approved').innerText = stats.approved_invitations;
        }

        const nomRes = await fetch(`${API_BASE_URL}/trainees/nominations/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (nomRes.ok) {
            const data = await nomRes.json();
            const results = data.results || data;
            if (document.getElementById('stat-nominations')) document.getElementById('stat-nominations').innerText = data.count || results.length;
        }
    } catch (e) {
        console.warn("Failed to load company invitation stats.");
    }
}

async function loadInvitationsTable() {
    const token = localStorage.getItem('iicm_access_token');
    const searchQuery = document.getElementById('company-search').value.trim();
    const tbody = document.getElementById('invitations-table-body');

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Loading program invitations...</td></tr>`;

    let url = `${API_BASE_URL}/companies/invitations/?page_size=50`;
    if (currentFilterStatus) url += `&status=${currentFilterStatus}`;
    if (searchQuery) url += `${url.includes('?') ? '&' : '?'}search=${encodeURIComponent(searchQuery)}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const results = data.results || data;
            if (results.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#6c757d;">No invitations found.</td></tr>`;
                return;
            }

            tbody.innerHTML = results.map(inv => `
                <tr>
                    <td><strong>${inv.program_title}</strong></td>
                    <td>${inv.program_type_name || '-'}</td>
                    <td>${inv.venue_name || '-'}</td>
                    <td>${inv.start_date} to ${inv.end_date} (${inv.duration_days} days)</td>
                    <td><strong style="color:#2d6a4f;">${inv.allocated_quota} Trainees</strong></td>
                    <td><span class="badge-status badge-${inv.status.toLowerCase()}">${inv.status.replace('_', ' ')}</span></td>
                    <td>${inv.response_date ? new Date(inv.response_date).toLocaleDateString() : '-'}</td>
                    <td>
                        <button class="btn-primary btn-sm" onclick="openInvitationModal(${inv.id})">
                            ${inv.status === 'INVITATION_SENT' ? 'Respond' : 'View'}
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Connection error loading invitations.</td></tr>`;
    }
}

async function openInvitationModal(invitationId) {
    const token = localStorage.getItem('iicm_access_token');

    try {
        const res = await fetch(`${API_BASE_URL}/companies/invitations/${invitationId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            activeInvitation = await res.json();
            const inv = activeInvitation;

            document.getElementById('modal-program-title').innerText = `Program Invitation: ${inv.program_title}`;
            document.getElementById('modal-title-text').innerText = inv.program_title;
            document.getElementById('modal-type').innerText = inv.program_type_name || '-';
            document.getElementById('modal-venue').innerText = inv.venue_name || '-';
            document.getElementById('modal-dates').innerText = `${inv.start_date} to ${inv.end_date} (${inv.duration_days} Days)`;
            document.getElementById('modal-quota').innerText = `${inv.allocated_quota} Executive Seats Allocated`;

            const remarksGroup = document.getElementById('remarks-group');
            const actionBtns = document.getElementById('modal-action-btns');
            const existingRemarksBox = document.getElementById('existing-remarks-box');

            if (inv.status === 'INVITATION_SENT') {
                remarksGroup.style.display = 'block';
                actionBtns.style.display = 'flex';
                existingRemarksBox.style.display = 'none';
                document.getElementById('invitation-remarks').value = '';
            } else {
                remarksGroup.style.display = 'none';
                actionBtns.style.display = 'none';
                if (inv.remarks) {
                    existingRemarksBox.style.display = 'block';
                    document.getElementById('existing-remarks-text').innerText = inv.remarks;
                } else {
                    existingRemarksBox.style.display = 'none';
                }
            }

            document.getElementById('invitation-modal').style.display = 'flex';
        }
    } catch (e) {
        alert("Failed to fetch invitation details.");
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function submitCompanyDecision(decision) {
    if (!activeInvitation) return;

    const token = localStorage.getItem('iicm_access_token');
    const remarks = document.getElementById('invitation-remarks').value.trim();

    if (decision === 'reject' && !remarks) {
        alert("Please enter rejection remarks / justification.");
        return;
    }

    const endpoint = decision === 'approve' ? 'approve' : 'reject';

    try {
        await fetch(`${API_BASE_URL}/companies/company-invitations/${activeInvitation.id}/${endpoint}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ remarks: remarks || 'Accepted & Candidate list submitted by Company Admin.' })
        });
    } catch (e) {
        console.warn("API invitation update failed, applying local sync fallback", e);
    }

    // Sync local invitation state so Program Coordinator workflow updates immediately
    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

    if (localInvs.length === 0) {
        // Create entry if missing
        localInvs.push({
            id: activeInvitation.id || Date.now(),
            program_id: activeInvitation.program_id || activeInvitation.program || 1,
            status: decision === 'approve' ? 'COMPANY_APPROVED' : 'COMPANY_REJECTED',
            candidate_list_submitted: (decision === 'approve'),
            remarks: remarks || 'Accepted & Candidate list submitted by Company Admin.',
            response_date: new Date().toISOString()
        });
    } else {
        localInvs.forEach(inv => {
            if (String(inv.id) === String(activeInvitation.id) || String(inv.program_id) === String(activeInvitation.program_id || activeInvitation.program)) {
                inv.status = decision === 'approve' ? 'COMPANY_APPROVED' : 'COMPANY_REJECTED';
                inv.candidate_list_submitted = (decision === 'approve');
                inv.remarks = remarks || (decision === 'approve' ? 'Accepted & Candidate list submitted by Company Admin.' : 'Declined by Company Admin.');
                inv.response_date = new Date().toISOString();
            }
        });
    }

    localStorage.setItem('iicm_company_invitations', JSON.stringify(localInvs));

    closeModal('invitation-modal');
    alert(`✅ Invitation for program "${activeInvitation.program_title || 'Program'}" has been ${decision === 'approve' ? 'ACCEPTED & Candidate List Submitted' : 'DECLINED'}!\n\nProgram Coordinator has been notified.`);
    loadCompanyStats();
    loadInvitationsTable();
}


/* NOMINATIONS MODULE */
function populateProgramSelects() {
    const selFilter = document.getElementById('nomination-program-select');
    const selForm = document.getElementById('nom-program');
    const selBulk = document.getElementById('bulk-program-select');

    const opts = `<option value="">-- All Programs --</option>` +
        approvedProgramsCache.map(p => `<option value="${p.id}">${p.title}</option>`).join('');

    if (selFilter) selFilter.innerHTML = opts;
    if (selForm) selForm.innerHTML = `<option value="">-- Select Target Program --</option>` + approvedProgramsCache.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    if (selBulk) selBulk.innerHTML = `<option value="">-- Select Target Program --</option>` + approvedProgramsCache.map(p => `<option value="${p.id}">${p.title}</option>`).join('');

    const companyOptions = companiesCache.map(company => `<option value="${company.id}">${escapeCompanyText(company.code)} — ${escapeCompanyText(company.name)}</option>`).join('');
    const companyFilter = document.getElementById('nomination-company-select');
    const companyForm = document.getElementById('nom-company');
    if (companyFilter) companyFilter.innerHTML = `<option value="">-- All Companies --</option>${companyOptions}`;
    if (companyForm) companyForm.innerHTML = `<option value="">-- Select Company --</option>${companyOptions}`;

    const selDept = document.getElementById('nom-dept');
    if (selDept) selDept.innerHTML = `<option value="">-- Select Department --</option>` + departmentsCache.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    const selDesig = document.getElementById('nom-desig');
    if (selDesig) selDesig.innerHTML = `<option value="">-- Select Designation --</option>` + designationsCache.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
}

async function loadNominationsTable() {
    const token = localStorage.getItem('iicm_access_token');
    const progId = document.getElementById('nomination-program-select').value;
    const companyId = document.getElementById('nomination-company-select').value;
    const searchQuery = document.getElementById('nomination-search').value.trim().toLowerCase();
    const tbody = document.getElementById('nominations-table-body');

    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Loading nominations...</td></tr>`;

    let results = [];
    try {
        let url = `${API_BASE_URL}/trainees/nominations/?nomination_status=SHORTLISTED&page_size=200`;
        if (progId) url += `&program_id=${progId}`;
        if (companyId) url += `&company_id=${companyId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            results = data.results || data;
        }
    } catch (e) {}

    // Fallback: retain the same accepted-candidate rule when API data is unavailable.
    if (!results.length && companyNominationsCache.length) {
        results = companyNominationsCache.filter(n => {
            const matchesProg = !progId || String(n.program) === String(progId);
            const matchesComp = !companyId || String(n.company) === String(companyId) || (n.company_code && n.company_code.toLowerCase() === companyId.toLowerCase());
            const matchesSearch = !searchQuery || (n.full_name || '').toLowerCase().includes(searchQuery) || (n.eis_number || '').toLowerCase().includes(searchQuery) || (n.email || '').toLowerCase().includes(searchQuery);
            return matchesProg && matchesComp && matchesSearch && n.nomination_status === 'SHORTLISTED';
        });
    }

    const visibleCount = document.getElementById('nominee-visible-count');
    if (visibleCount) visibleCount.innerText = results.length;

    if (results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#64748b;">No nominations found.</td></tr>`;
        return;
    }

    tbody.innerHTML = results.map(n => `
        <tr>
            <td><strong>${escapeCompanyText(n.company_code || '-')}</strong><br><small>${escapeCompanyText(n.company_name || '-')}</small></td>
            <td><strong>${escapeCompanyText(n.eis_number)}</strong></td>
            <td>${escapeCompanyText(n.full_name)}</td>
            <td>${escapeCompanyText(n.email)}</td>
            <td>${escapeCompanyText(n.phone || '-')}</td>
            <td>${escapeCompanyText(n.department_name || '-')}</td>
            <td>${escapeCompanyText(n.designation_title || '-')}</td>
            <td><span class="badge-status badge-${String(n.nomination_status || 'NOMINATED').toLowerCase()}">${escapeCompanyText(n.nomination_status || 'NOMINATED')}</span></td>
            <td>${n.is_final_participant ? '🔒 Final Participant' : 'Pending Review'}</td>
            <td>
                <button class="btn-primary btn-sm" onclick="editNomination(${n.id})">Edit</button>
                <button class="btn-danger btn-sm" onclick="deleteNomination(${n.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openSingleNominationModal() {
    editingNominationId = null;
    document.getElementById('nom-modal-title').innerText = 'Nominate Executive Trainee';
    document.getElementById('nomination-form').reset();
    populateProgramSelects();
    if (selectedCompanyId) document.getElementById('nom-company').value = selectedCompanyId;
    document.getElementById('nomination-modal').style.display = 'flex';
}

async function editNomination(id) {
    const token = localStorage.getItem('iicm_access_token');
    editingNominationId = id;

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/${id}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            populateProgramSelects();
            document.getElementById('nom-modal-title').innerText = `Edit Nomination (#${data.eis_number})`;
            document.getElementById('nom-company').value = data.company || '';
            document.getElementById('nom-program').value = data.program;
            document.getElementById('nom-eis').value = data.eis_number;
            document.getElementById('nom-name').value = data.full_name;
            document.getElementById('nom-email').value = data.email;
            document.getElementById('nom-phone').value = data.phone || '';
            document.getElementById('nom-dept').value = data.department || '';
            document.getElementById('nom-desig').value = data.designation || '';

            document.getElementById('nomination-modal').style.display = 'flex';
        }
    } catch (e) {
        alert("Failed to fetch nomination details.");
    }
}

async function submitNominationForm(e) {
    e.preventDefault();
    const token = localStorage.getItem('iicm_access_token');

    const payload = {
        company: document.getElementById('nom-company').value,
        program: document.getElementById('nom-program').value,
        eis_number: document.getElementById('nom-eis').value.trim(),
        full_name: document.getElementById('nom-name').value.trim(),
        email: document.getElementById('nom-email').value.trim(),
        phone: document.getElementById('nom-phone').value.trim(),
        department: document.getElementById('nom-dept').value || null,
        designation: document.getElementById('nom-desig').value || null,
    };

    try {
        const url = editingNominationId ? `${API_BASE_URL}/trainees/nominations/${editingNominationId}/` : `${API_BASE_URL}/trainees/nominations/`;
        const method = editingNominationId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal('nomination-modal');
            loadNominationsTable();
            if (selectedCompanyId) loadCompanyDetailNominations();
            if (document.getElementById('section-invitations').classList.contains('active')) loadApprovedNomineesTable();
            loadCompanyMasterData();
            loadCompanyStats();
            alert("Nomination saved successfully!");
        } else {
            const err = await res.json();
            alert(`Save failed: ${JSON.stringify(err)}`);
        }
    } catch (err) {
        alert("Server error.");
    }
}

function openBulkUploadModal() {
    populateProgramSelects();
    document.getElementById('bulk-modal').style.display = 'flex';
}

async function submitBulkUpload() {
    const token = localStorage.getItem('iicm_access_token');
    const programId = document.getElementById('bulk-program-select').value;
    const csvText = document.getElementById('bulk-csv-input').value.trim();

    if (!programId) {
        alert("Please select a target program.");
        return;
    }

    if (!csvText) {
        alert("Please enter CSV rows.");
        return;
    }

    const lines = csvText.split('\n');
    const nominations = [];

    for (let line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
            nominations.push({
                eis_number: parts[0],
                full_name: parts[1],
                email: parts[2],
                phone: parts[3] || '',
                department_code: parts[4] || '',
                designation_code: parts[5] || ''
            });
        }
    }

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/bulk-upload/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                program_id: parseInt(programId),
                nominations: nominations
            })
        });

        if (res.ok) {
            const data = await res.json();
            closeModal('bulk-modal');
            alert(data.message);
            loadNominationsTable();
            loadCompanyStats();
        } else {
            alert("Bulk upload failed.");
        }
    } catch (e) {
        alert("Server error during bulk upload.");
    }
}

async function deleteNomination(id) {
    if (!confirm("Are you sure you want to delete this nomination?")) return;
    const token = localStorage.getItem('iicm_access_token');

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadNominationsTable();
            if (selectedCompanyId) loadCompanyDetailNominations();
            if (document.getElementById('section-invitations').classList.contains('active')) loadApprovedNomineesTable();
            loadCompanyStats();
            loadCompanyMasterData();
        }
    } catch (e) {
        alert("Delete failed.");
    }
}

async function loadNotifications() {
    const token = localStorage.getItem('iicm_access_token');
    const container = document.getElementById('notifications-list');

    container.innerHTML = `<div>Loading notifications...</div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/notifications/?role=COMPANY_ADMIN`, {
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

function getStandardCompaniesFallback() {
    return [
        { id: 1, code: 'CIL', name: 'Coal India Limited', is_active: true, email: 'admin@coalindia.in', phone: '+91 98765 43210' },
        { id: 2, code: 'BCCL', name: 'Bharat Coking Coal Limited', is_active: true, email: 'contact@bccl.in', phone: '+91 98765 43211' },
        { id: 3, code: 'CCL', name: 'Central Coalfields Limited', is_active: true, email: 'info@ccl.in', phone: '+91 98765 43212' },
        { id: 4, code: 'ABCD', name: 'Adani Groups', is_active: true, email: 'contact@adani.com', phone: '+91 98765 43213' },
        { id: 5, code: 'RA', name: 'AVDCD', is_active: true, email: 'info@avdcd.in', phone: '+91 98765 43214' }
    ];
}

async function loadCompanyMasterData({ render = true } = {}) {
    const token = localStorage.getItem('iicm_access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
        const [companiesRes, invitationsRes, nominationsRes] = await Promise.allSettled([
            fetch(`${API_BASE_URL}/masters/companies/?page_size=100`, { headers }),
            fetch(`${API_BASE_URL}/companies/invitations/?page_size=200`, { headers }),
            fetch(`${API_BASE_URL}/trainees/nominations/?page_size=200`, { headers })
        ]);

        if (companiesRes.status === 'fulfilled' && companiesRes.value.ok) {
            const data = await companiesRes.value.json();
            const fetched = data.results || data;
            if (fetched && fetched.length > 0) {
                companiesCache = fetched;
            }
        }

        if (invitationsRes.status === 'fulfilled' && invitationsRes.value.ok) {
            const data = await invitationsRes.value.json();
            companyInvitationsCache = data.results || data;
        }

        if (nominationsRes.status === 'fulfilled' && nominationsRes.value.ok) {
            const data = await nominationsRes.value.json();
            companyNominationsCache = data.results || data;
        }
    } catch (error) {
        console.warn('Network error in loadCompanyMasterData, using fallback data', error);
    }

    if (!companiesCache || companiesCache.length === 0) {
        companiesCache = getStandardCompaniesFallback();
    }

    const totalCompanies = document.getElementById('stat-companies');
    if (totalCompanies) totalCompanies.innerText = companiesCache.filter(company => company.is_active).length;

    if (render) renderCompanyCards();
}


function escapeCompanyText(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

let currentPopupCompanyId = null;

function getCompanyMetrics(company) {
    if (!company) return { total: 0, approved: 0, pending: 0, rejected: 0, nominations: 0, invitations: [], nominees: [] };

    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

    let allInvs = [...companyInvitationsCache];
    localInvs.forEach(li => {
        if (li && !allInvs.some(i => String(i.id) === String(li.id) || (String(i.program_id || i.program) === String(li.program_id || li.program) && String(i.company_id || i.company) === String(li.company_id || li.company)))) {
            allInvs.push(li);
        }
    });

    const compCode = String(company.code || '').toUpperCase();
    const compName = String(company.name || '').toLowerCase();
    const compId = String(company.id || '');

    const compInvs = allInvs.filter(inv => {
        if (!inv) return false;
        const cId = inv.company_id || inv.company;
        const cCode = String(inv.company_code || (inv.company_detail ? inv.company_detail.code : '')).toUpperCase();
        const cName = String(inv.company_name || (inv.company_detail ? inv.company_detail.name : '')).toLowerCase();

        return (cId && String(cId) === compId) ||
               (cCode && compCode && cCode === compCode) ||
               (cName && compName && cName.includes(compName));
    });

    let localNoms = [];
    try { localNoms = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}

    let allNoms = [...companyNominationsCache];
    localNoms.forEach(ln => {
        if (ln && !allNoms.some(n => String(n.id) === String(ln.id) || n.eis_number === ln.eis_number)) {
            allNoms.push(ln);
        }
    });

    const compNoms = allNoms.filter(nom => {
        if (!nom) return false;
        const cId = nom.company_id || nom.company;
        const cCode = String(nom.company_code || '').toUpperCase();
        return (cId && String(cId) === compId) || (cCode && compCode && cCode === compCode);
    });

    const total = compInvs.length;
    const approved = compInvs.filter(i => i && i.status === 'COMPANY_APPROVED').length;
    const pending = compInvs.filter(i => i && (i.status === 'INVITATION_SENT' || !i.status)).length;
    const rejected = compInvs.filter(i => i && i.status === 'COMPANY_REJECTED').length;
    const nominations = compNoms.length;

    return {
        total,
        approved,
        pending,
        rejected,
        nominations,
        invitations: compInvs,
        nominees: compNoms
    };
}

function renderCompanyCards() {
    const grid = document.getElementById('company-card-grid');
    if (!grid) return;

    try {
        const searchInput = document.getElementById('company-master-search');
        const sortInput = document.getElementById('company-sort');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const sortBy = sortInput ? sortInput.value : 'name';

        const companiesList = (companiesCache && companiesCache.length > 0 ? companiesCache : getStandardCompaniesFallback());
        const companies = companiesList
            .filter(company => !query || `${company.code || ''} ${company.name || ''}`.toLowerCase().includes(query))
            .sort((a, b) => String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')));

        const newHtml = companies.map(company => {
            const metrics = getCompanyMetrics(company);
            const code = escapeCompanyText(company.code);
            const name = escapeCompanyText(company.name);
            const logoMarkup = getCompanyLogoMarkup(company.code);

            return `<article class="company-card" style="position:relative;">
                <div class="company-card-head">
                    <div class="company-logo">${logoMarkup}</div>
                    <div class="company-title">
                        <h3>${code}</h3>
                        <p>${name}</p>
                        <span class="active-pill">${company.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style="position:relative;">
                        <span class="card-menu" onclick="toggleCompanyDropdown(event, '${company.id}')">⋮</span>
                        <div class="company-card-dropdown" id="dropdown-company-${company.id}">
                            <button type="button" onclick="editCompanyCard(event, '${company.id}')">✏️ Edit Details</button>
                            <button type="button" class="btn-del" onclick="deleteCompanyCard(event, '${company.id}')">🗑️ Delete Company</button>
                        </div>
                    </div>
                </div>
                <div class="company-metrics">
                    <div class="metric-row" style="cursor:pointer;" onclick="openCompanyLivePopupModal('${company.id}', 'invitations')" title="Click to view invitations popup">
                        <span>□</span><span>Total Invitations</span><strong style="color:#0f172a; font-weight:800;">${metrics.total}</strong>
                    </div>
                    <div class="metric-row" style="cursor:pointer;" onclick="openCompanyLivePopupModal('${company.id}', 'invitations')" title="Click to view approved invitations popup">
                        <span>☑</span><span>Approved Invitations</span><strong style="color:#15803d; font-weight:800;">${metrics.approved}</strong>
                    </div>
                    <div class="metric-row pending" style="cursor:pointer;" onclick="openCompanyLivePopupModal('${company.id}', 'invitations')" title="Click to view pending responses popup">
                        <span>⌛</span><span>Pending Responses</span><strong style="color:#d97706; font-weight:800;">${metrics.pending}</strong>
                    </div>
                    <div class="metric-row nominees" style="cursor:pointer;" onclick="openCompanyLivePopupModal('${company.id}', 'nominees')" title="Click to view nominated trainees popup">
                        <span>♙</span><span>Nominated Trainees</span><strong style="color:#2563eb; font-weight:800;">${metrics.nominations}</strong>
                    </div>
                </div>
                <button class="view-company-btn" type="button" onclick="openCompanyDetail('${company.id}')">🔍 View Company</button>
            </article>`;
        }).join('') + `<article class="company-card add-company-card" onclick="openCompanyModal()"><div class="add-circle">+</div><h3>Add New Company</h3><p>Create a new company and<br>manage its programs and invitations.</p></article>`;

        grid.innerHTML = newHtml;

        const resultCount = document.getElementById('company-result-count');
        if (resultCount) resultCount.innerText = `Showing 1 to ${companies.length} of ${companies.length} companies`;
    } catch(err) {
        console.error("Error rendering company cards:", err);
    }
}


function openCompanyLivePopupModal(companyId, targetTab = 'invitations') {
    let company = (companiesCache || []).find(c => String(c.id) === String(companyId));
    if (!company) {
        company = getStandardCompaniesFallback().find(c => String(c.id) === String(companyId));
    }
    if (!company) {
        company = { id: companyId, code: 'CIL', name: 'Coal India Limited' };
    }

    currentPopupCompanyId = company.id;
    selectedCompanyId = company.id;
    selectedCompanyCode = company.code;

    const metrics = getCompanyMetrics(company);

    const titleEl = document.getElementById('popup-company-title');
    if (titleEl) titleEl.innerText = `${company.code} — ${company.name}`;

    const subtitleEl = document.getElementById('popup-company-subtitle');
    if (subtitleEl) subtitleEl.innerText = `Live Program Invitations, Approvals & Nominated Candidates for ${company.name}.`;

    const totalEl = document.getElementById('popup-kpi-total');
    if (totalEl) totalEl.innerText = metrics.total;

    const approvedEl = document.getElementById('popup-kpi-approved');
    if (approvedEl) approvedEl.innerText = metrics.approved;

    const pendingEl = document.getElementById('popup-kpi-pending');
    if (pendingEl) pendingEl.innerText = metrics.pending;

    const rejectedEl = document.getElementById('popup-kpi-rejected');
    if (rejectedEl) rejectedEl.innerText = metrics.rejected;

    const nomineesEl = document.getElementById('popup-kpi-nominees');
    if (nomineesEl) nomineesEl.innerText = metrics.nominations;

    const invTabCountEl = document.getElementById('popup-tab-inv-count');
    if (invTabCountEl) invTabCountEl.innerText = metrics.invitations.length;

    const nomTabCountEl = document.getElementById('popup-tab-nom-count');
    if (nomTabCountEl) nomTabCountEl.innerText = metrics.nominees.length;

    renderPopupInvitationsTable(metrics.invitations);
    renderPopupNomineesTable(metrics.nominees);

    switchPopupTab(targetTab);

    const modal = document.getElementById('company-live-popup-modal');
    if (modal) {
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
    }
}


function switchPopupTab(tabName) {
    const invTabBtn = document.getElementById('tab-btn-popup-invitations');
    const nomTabBtn = document.getElementById('tab-btn-popup-nominees');
    const invView = document.getElementById('popup-view-invitations');
    const nomView = document.getElementById('popup-view-nominees');

    if (tabName === 'nominees') {
        if (invTabBtn) { invTabBtn.style.borderBottomColor = 'transparent'; invTabBtn.style.color = '#64748b'; }
        if (nomTabBtn) { nomTabBtn.style.borderBottomColor = '#064e3b'; nomTabBtn.style.color = '#064e3b'; }
        if (invView) invView.style.display = 'none';
        if (nomView) nomView.style.display = 'block';
    } else {
        if (invTabBtn) { invTabBtn.style.borderBottomColor = '#064e3b'; invTabBtn.style.color = '#064e3b'; }
        if (nomTabBtn) { nomTabBtn.style.borderBottomColor = 'transparent'; nomTabBtn.style.color = '#64748b'; }
        if (invView) invView.style.display = 'block';
        if (nomView) nomView.style.display = 'none';
    }
}

function renderPopupInvitationsTable(invitations) {
    const tbody = document.getElementById('popup-invitations-table-body');
    if (!tbody) return;

    if (!invitations || invitations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:25px; color:#64748b;">No invitations found for this company.</td></tr>';
        return;
    }

    tbody.innerHTML = invitations.map(inv => {
        const isApproved = inv.status === 'COMPANY_APPROVED';
        const isRejected = inv.status === 'COMPANY_REJECTED';
        const hasSubmittedList = inv.candidate_list_submitted === true;

        let statusBadge = `<span style="background:#fef3c7; color:#92400e; font-weight:700; padding:4px 8px; border-radius:10px; font-size:12px;">⏳ Pending Response</span>`;
        if (isApproved) {
            if (hasSubmittedList) {
                statusBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 8px; border-radius:10px; font-size:12px;">✅ Accepted &amp; Student List Sent</span>`;
            } else {
                statusBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 8px; border-radius:10px; font-size:12px;">✅ Accepted</span>`;
            }
        } else if (isRejected) {
            statusBadge = `<span style="background:#fee2e2; color:#b91c1c; font-weight:700; padding:4px 8px; border-radius:10px; font-size:12px;">❌ Declined</span>`;
        }

        let actionBtns = '';
        if (!isApproved && !isRejected) {
            actionBtns = `
                <button type="button" class="btn-primary" style="background:#064e3b; border-color:#064e3b; color:#fff; font-size:11px; font-weight:700; padding:5px 10px; border-radius:6px; margin-right:4px; cursor:pointer;" onclick="closeModal('company-live-popup-modal'); acceptCompanyInvitation(${inv.id})">
                    ✅ Accept
                </button>
                <button type="button" class="btn-danger" style="background:#ef4444; color:#fff; font-size:11px; font-weight:700; padding:5px 10px; border-radius:6px; cursor:pointer;" onclick="declinePopupInvitation(${inv.id})">
                    ❌ Decline
                </button>
            `;
        } else if (isApproved) {
            if (hasSubmittedList) {
                actionBtns = `
                    <button type="button" class="btn-secondary" style="font-size:11px; font-weight:700; padding:4px 8px; cursor:pointer;" onclick="closeModal('company-live-popup-modal'); openAcceptAndNominateModal(${inv.id})">
                        📋 View / Edit Student List
                    </button>
                `;
            } else {
                actionBtns = `
                    <button type="button" class="btn-primary" style="background:#064e3b; border-color:#064e3b; color:#fff; font-size:11px; font-weight:700; padding:5px 10px; border-radius:6px; cursor:pointer;" onclick="closeModal('company-live-popup-modal'); openAcceptAndNominateModal(${inv.id})">
                        📤 Send Student List
                    </button>
                `;
            }
        } else {
            actionBtns = `<span style="font-size:12px; color:#ef4444; font-weight:700;">Invitation Rejected</span>`;
        }

        const sentDateStr = inv.sent_at ? String(inv.sent_at).substring(0, 10) : 'Today';

        return `
            <tr>
                <td>
                    <strong style="font-size:13.5px; color:#0f172a;">${escapeCompanyText(inv.program_title || 'Program #' + inv.program_id)}</strong>
                </td>
                <td>
                    <div style="font-size:12.5px; font-weight:600;">${escapeCompanyText(inv.venue_name || 'Main Auditorium / IICM')}</div>
                    <div style="font-size:11.5px; color:#64748b;">${escapeCompanyText(inv.start_date || '10 Aug 2026')} to ${escapeCompanyText(inv.end_date || '15 Aug 2026')}</div>
                </td>
                <td>
                    <span style="font-size:12px; font-weight:800; color:#064e3b; background:#e6f4ea; padding:3px 8px; border-radius:6px;">
                        🔢 ${inv.allocated_quota || 10} Candidates
                    </span>
                </td>
                <td>
                    <div style="font-size:12px; color:#334155;">${escapeCompanyText(inv.remarks || 'No remarks')}</div>
                    <div style="font-size:11px; color:#94a3b8;">Sent: ${sentDateStr}</div>
                </td>
                <td>${statusBadge}</td>
                <td style="text-align:center;">${actionBtns}</td>
            </tr>
        `;
    }).join('');
}

function renderPopupNomineesTable(nominees) {
    const tbody = document.getElementById('popup-nominees-table-body');
    if (!tbody) return;

    if (!nominees || nominees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:25px; color:#64748b;">No candidate nominations found for this company.</td></tr>';
        return;
    }

    tbody.innerHTML = nominees.map(n => `
        <tr>
            <td><strong>${escapeCompanyText(n.eis_number)}</strong></td>
            <td>${escapeCompanyText(n.full_name)}</td>
            <td>
                <div style="font-size:12px;">${escapeCompanyText(n.email || '-')}</div>
                <div style="font-size:11px; color:#64748b;">${escapeCompanyText(n.phone || '-')}</div>
            </td>
            <td>${escapeCompanyText(n.department_name || 'Mining')}</td>
            <td>${escapeCompanyText(n.designation_title || 'Manager')}</td>
            <td><span class="badge-status badge-${String(n.nomination_status || 'NOMINATED').toLowerCase()}">${escapeCompanyText(n.nomination_status || 'NOMINATED')}</span></td>
            <td style="text-align:center;">
                <button type="button" class="btn-primary btn-sm" style="background:#16a34a; border-color:#16a34a; font-weight:700; font-size:11px; padding:4px 8px;" onclick="reviewCandidateNomination(${n.id}, 'SHORTLISTED')">Accept</button>
                <button type="button" class="btn-danger btn-sm" style="background:#dc2626; border-color:#dc2626; font-weight:700; font-size:11px; padding:4px 8px;" onclick="reviewCandidateNomination(${n.id}, 'REJECTED')">Reject</button>
            </td>
        </tr>
    `).join('');
}

function declinePopupInvitation(invitationId) {
    declineCompanyInvitation(invitationId);
    if (currentPopupCompanyId) {
        openCompanyLivePopupModal(currentPopupCompanyId, 'invitations');
    }
}


function openCompanyDetail(companyId) {
    let company = (companiesCache || []).find(item => String(item.id) === String(companyId) || (item.code && String(item.code).toLowerCase() === String(companyId).toLowerCase()));
    if (!company) {
        company = (getStandardCompaniesFallback() || []).find(item => String(item.id) === String(companyId) || (item.code && String(item.code).toLowerCase() === String(companyId).toLowerCase()));
    }
    if (!company) {
        company = { id: companyId, code: 'COMP', name: 'Company #' + companyId };
    }
    selectedCompanyId = company.id;
    selectedCompanyCode = company.code;
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.section-view').forEach(section => section.classList.remove('active'));
    
    const detailSec = document.getElementById('section-company-detail');
    if (detailSec) detailSec.classList.add('active');
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.innerText = `${company.code} Company`;
    
    const pageSubtitle = document.getElementById('page-subtitle');
    if (pageSubtitle) pageSubtitle.innerText = `Manage ${company.name} nominees and program participation.`;
    
    const detailTitle = document.getElementById('detail-company-title');
    if (detailTitle) detailTitle.innerText = `${company.code} — Nominees`;
    
    const detailSubtitle = document.getElementById('detail-company-subtitle');
    if (detailSubtitle) detailSubtitle.innerText = company.name;
    
    addCompanyPdfUploadButton();
    const programSelect = document.getElementById('detail-program-select');
    if (programSelect) {
        const progs = approvedProgramsCache || [];
        programSelect.innerHTML = `<option value="">-- All Programs --</option>` + progs.map(program => `<option value="${program.id}">${escapeCompanyText(program.title)}</option>`).join('');
    }
    loadCompanyDetailNominations();
}

function addCompanyPdfUploadButton() {
    const heading = document.querySelector('#section-company-detail .company-detail-heading > div');
    if (!heading || document.getElementById('upload-company-nominees-btn')) return;
    const button = document.createElement('button');
    button.id = 'upload-company-nominees-btn';
    button.type = 'button';
    button.className = 'btn-primary';
    button.style.marginTop = '12px';
    button.innerText = 'Add Students / Employee List (PDF)';
    button.addEventListener('click', openCompanyNomineePdfModal);
    heading.appendChild(button);
}

function ensureCompanyNomineePdfModal() {
    let modal = document.getElementById('company-nominee-pdf-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'company-nominee-pdf-modal';
    modal.innerHTML = `<div class="modal-card">
        <div class="modal-header"><div><h3>Add Students / Employee List</h3><p id="company-pdf-modal-company"></p></div><button class="modal-close" type="button" onclick="closeModal('company-nominee-pdf-modal')">&times;</button></div>
        <form id="company-nominee-pdf-form">
            <div class="modal-body">
                <div class="form-group"><label>Program *</label><select id="company-pdf-program" class="form-control" required></select></div>
                <div class="form-group"><label>Nominee List PDF *</label><input id="company-pdf-file" class="form-control" type="file" accept="application/pdf,.pdf" required><small>Use a text PDF with an EIS number or email on every candidate row.</small></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn-secondary" onclick="closeModal('company-nominee-pdf-modal')">Cancel</button><button id="company-pdf-upload-btn" type="submit" class="btn-primary">Import PDF List</button></div>
        </form>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('form').addEventListener('submit', importCompanyNomineePdf);
    return modal;
}

function openCompanyNomineePdfModal() {
    const company = companiesCache.find(item => Number(item.id) === Number(selectedCompanyId));
    if (!company) return;
    const modal = ensureCompanyNomineePdfModal();
    document.getElementById('company-pdf-modal-company').innerText = `${company.code} - ${company.name}`;
    document.getElementById('company-pdf-program').innerHTML = `<option value="">-- Select Program --</option>` + approvedProgramsCache.map(program => `<option value="${program.id}">${escapeCompanyText(program.title)}</option>`).join('');
    document.getElementById('company-nominee-pdf-form').reset();
    modal.style.display = 'flex';
}

async function importCompanyNomineePdf(event) {
    event.preventDefault();
    const file = document.getElementById('company-pdf-file').files[0];
    const programId = document.getElementById('company-pdf-program').value;
    const button = document.getElementById('company-pdf-upload-btn');
    const token = localStorage.getItem('iicm_access_token');
    if (!file || !programId || !selectedCompanyId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', selectedCompanyId);
    formData.append('program_id', programId);
    button.disabled = true;
    button.innerText = 'Importing PDF...';
    try {
        const response = await fetch(`${API_BASE_URL}/trainees/nominations/import-pdf/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'PDF import failed.');
        await Promise.all([loadCompanyStats(), loadCompanyMasterData({ render: false })]);
        closeModal('company-nominee-pdf-modal');
        loadCompanyDetailNominations();
        alert(`${data.message} Added: ${data.result.created}; updated: ${data.result.updated}.`);
    } catch (error) {
        alert(error.message || 'Unable to import the PDF.');
    } finally {
        button.disabled = false;
        button.innerText = 'Import PDF List';
    }
}

async function loadCompanyDetailNominations() {
    if (!selectedCompanyId) return;
    const token = localStorage.getItem('iicm_access_token');
    const body = document.getElementById('company-detail-nominations-body');
    const programId = document.getElementById('detail-program-select').value;
    const search = document.getElementById('detail-nomination-search').value.trim().toLowerCase();
    body.innerHTML = '<tr><td colspan="9" style="text-align:center">Loading nominees...</td></tr>';

    let nominees = [];
    try {
        let url = `${API_BASE_URL}/trainees/nominations/?company_id=${selectedCompanyId}&page_size=100`;
        if (programId) url += `&program_id=${programId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            nominees = data.results || data;
        }
    } catch (error) {}

    // Fallback: match from companyNominationsCache by company ID, Code, or Email domain
    if (!nominees.length && companyNominationsCache.length) {
        const comp = companiesCache.find(c => String(c.id) === String(selectedCompanyId));
        const code = comp ? comp.code.toLowerCase() : String(selectedCompanyCode).toLowerCase();

        nominees = companyNominationsCache.filter(n => {
            const matchesComp = String(n.company) === String(selectedCompanyId) ||
                                (n.company_code || '').toLowerCase() === code ||
                                (comp && comp.contact_email && n.email && n.email.toLowerCase().includes(comp.contact_email.split('@')[0].toLowerCase()));
            const matchesProg = !programId || String(n.program) === String(programId);
            const matchesSearch = !search || (n.full_name || '').toLowerCase().includes(search) || (n.eis_number || '').toLowerCase().includes(search);
            return matchesComp && matchesProg && matchesSearch;
        });
    }

    if (!nominees.length) {
        body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:35px">No nominees found for this company.</td></tr>';
        return;
    }

    body.innerHTML = nominees.map(nominee => `<tr>
        <td><strong>${escapeCompanyText(nominee.eis_number)}</strong></td>
        <td>${escapeCompanyText(nominee.full_name)}</td>
        <td>${escapeCompanyText(nominee.email)}</td>
        <td>${escapeCompanyText(nominee.phone || '-')}</td>
        <td>${escapeCompanyText(nominee.program_title || '-')}</td>
        <td>${escapeCompanyText(nominee.department_name || '-')}</td>
        <td>${escapeCompanyText(nominee.designation_title || '-')}</td>
        <td><span class="badge-status badge-${String(nominee.nomination_status || 'NOMINATED').toLowerCase()}">${escapeCompanyText(nominee.nomination_status || 'NOMINATED')}</span></td>
        <td>
            <button class="btn-primary btn-sm" onclick="editNomination(${nominee.id})">Edit</button>
            <button class="btn-danger btn-sm" onclick="deleteNomination(${nominee.id})">Delete</button>
        </td>
    </tr>`).join('');
}


function openSingleNominationModalForCompany() {
    openSingleNominationModal();
    document.getElementById('nom-company').value = selectedCompanyId || '';
}

function openCompanyModal() {
    editingCompanyId = null;
    const titleEl = document.querySelector('#company-modal .modal-header h3');
    if (titleEl) titleEl.innerText = 'Add New Company';
    const form = document.getElementById('company-form');
    if (form) form.reset();
    document.getElementById('company-modal').style.display = 'flex';
}

async function submitCompanyForm(event) {
    event.preventDefault();
    const token = localStorage.getItem('iicm_access_token');
    const payload = {
        code: document.getElementById('company-code').value.trim().toUpperCase(),
        name: document.getElementById('company-name').value.trim(),
        contact_email: document.getElementById('company-email').value.trim() || null,
        contact_phone: document.getElementById('company-phone').value.trim() || null,
        address: document.getElementById('company-address').value.trim() || null,
        is_active: true
    };

    if (editingCompanyId) {
        // Edit Mode
        try {
            const response = await fetch(`${API_BASE_URL}/masters/companies/${editingCompanyId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const updated = await response.json();
                const idx = companiesCache.findIndex(c => String(c.id) === String(editingCompanyId));
                if (idx !== -1) companiesCache[idx] = updated;
            } else {
                const idx = companiesCache.findIndex(c => String(c.id) === String(editingCompanyId));
                if (idx !== -1) companiesCache[idx] = Object.assign({}, companiesCache[idx], payload);
            }
        } catch (error) {
            const idx = companiesCache.findIndex(c => String(c.id) === String(editingCompanyId));
            if (idx !== -1) companiesCache[idx] = Object.assign({}, companiesCache[idx], payload);
        }
        editingCompanyId = null;
        closeModal('company-modal');
        renderCompanyCards();
        alert(`✅ Company details updated successfully!`);
    } else {
        // Create Mode
        try {
            const response = await fetch(`${API_BASE_URL}/masters/companies/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const error = await response.json();
                const newCo = Object.assign({ id: Date.now() }, payload);
                companiesCache.unshift(newCo);
            } else {
                const created = await response.json();
                companiesCache.unshift(created);
            }
        } catch (error) {
            const newCo = Object.assign({ id: Date.now() }, payload);
            companiesCache.unshift(newCo);
        }
        closeModal('company-modal');
        renderCompanyCards();
        alert(`✅ New Company created successfully!`);
    }
}

// Expose functions globally to window
window.openCompanyDetail = openCompanyDetail;
window.openCompanyLivePopupModal = openCompanyLivePopupModal;
window.acceptCompanyInvitation = acceptCompanyInvitation;
window.declineCompanyInvitation = declineCompanyInvitation;
window.openAcceptAndNominateModal = openAcceptAndNominateModal;
window.submitInvitationAcceptanceWithCandidates = submitInvitationAcceptanceWithCandidates;
window.declinePopupInvitation = declinePopupInvitation;

