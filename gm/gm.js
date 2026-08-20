var API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

let currentStatusFilter = 'PENDING_APPROVAL';
let activeReviewProgram = null;

// Initial Master Programs array (empty by default; populated live by coordinator submissions)
let baseGMPrograms = [];


function getGMDecisions() {
    try {
        const saved = localStorage.getItem('iicm_gm_decisions');
        return saved ? JSON.parse(saved) : {};
    } catch(e) {
        return {};
    }
}

function saveGMDecision(id, status, remarks, title) {
    try {
        const decisions = getGMDecisions();
        const decisionData = { status: status, remarks: remarks, date: new Date().toISOString() };
        if (id) decisions[id] = decisionData;
        if (title) decisions[title] = decisionData;
        localStorage.setItem('iicm_gm_decisions', JSON.stringify(decisions));
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth('GM');
    if (user) renderUserProfile(user);

    await syncCoordinatorCreatedPrograms();
    loadDashboardStats();
    loadProgramsTable();

    const searchInput = document.getElementById('gm-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadProgramsTable());
    }

    // Cross-tab real-time sync via Storage Event (instant update without 3s polling flicker)
    window.addEventListener('storage', async (e) => {
        if (e.key === 'iicm_coordinator_created_programs' || e.key === 'iicm_schedule_notesheets' || e.key === 'iicm_gm_decisions' || e.key === 'iicm_honorarium_data') {
            await syncCoordinatorCreatedPrograms();
            loadDashboardStats();
            loadProgramsTable(true);
            loadGMHonorariumTable();
        }
    });

    // Low frequency fallback refresh (60 seconds)
    setInterval(async () => {
        await syncCoordinatorCreatedPrograms();
        loadDashboardStats();
        loadProgramsTable(true);
        loadGMHonorariumTable();
    }, 60000);
});


async function syncCoordinatorCreatedPrograms() {
    try {
        const saved = localStorage.getItem('iicm_coordinator_created_programs');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(p => {
                    if (!baseGMPrograms.some(item => String(item.id) === String(p.id) || item.title === p.title)) {
                        baseGMPrograms.unshift({
                            id: p.id || (Date.now()),
                            title: p.title,
                            program_type_name: p.program_type_name || 'Technical Training',
                            venue_name: p.venue_name || 'IICM Campus',
                            start_date: p.start_date || '2026-08-20',
                            end_date: p.end_date || '2026-08-25',
                            duration_days: p.duration_days || 5,
                            budget: p.budget || 500000,
                            coordinator_name: 'Program Coordinator',
                            status: p.status || 'PENDING_APPROVAL',
                            target_participants_count: p.target_participants_count || 30,
                            target_companies: p.target_companies || 'CIL Subsidiaries',
                            objective: p.objective || 'Executive training objective.',
                            description: p.description || 'Program created by Program Coordinator.'
                        });
                    }
                });
            }
        }
    } catch(e) {
        console.error("Error syncing coordinator created programs:", e);
    }
}

function showSection(sectionName) {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));

    const navMap = {
        'pending': 'nav-pending',
        'approved': 'nav-approved',
        'rejected': 'nav-rejected',
        'honorarium': 'nav-honorarium',
        'notifications': 'nav-notifications'
    };

    const activeNav = document.getElementById(navMap[sectionName]);
    if (activeNav) activeNav.classList.add('active');

    if (sectionName === 'notifications') {
        document.getElementById('section-notifications').classList.add('active');
        loadNotifications();
    } else if (sectionName === 'honorarium') {
        document.getElementById('section-honorarium').classList.add('active');
        loadGMHonorariumTable();
    } else {
        document.getElementById('section-programs').classList.add('active');
        const filterMap = {
            'pending': 'PENDING_APPROVAL',
            'approved': 'APPROVED',
            'rejected': 'REJECTED'
        };
        currentStatusFilter = filterMap[sectionName] || 'PENDING_APPROVAL';

        const labelMap = {
            'PENDING_APPROVAL': 'PENDING GM APPROVAL',
            'APPROVED': 'APPROVED PROGRAMS',
            'REJECTED': 'REJECTED PROGRAMS'
        };
        const labelNode = document.getElementById('current-filter-label');
        if (labelNode) labelNode.innerText = labelMap[currentStatusFilter] || currentStatusFilter;

        loadProgramsTable();
    }
}

async function fetchAPIPrograms() {
    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/programs/?page_size=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.results || data;
        }
    } catch(e) {}
    return [];
}

async function getAllUnifiedPrograms() {

    const apiPrograms = await fetchAPIPrograms();
    const decisions = getGMDecisions();

    // Load schedule notesheets and coordinator created programs submitted from Programme Coordinator
    let schedNotesheets = [];
    try {
        const savedSched = localStorage.getItem('iicm_schedule_notesheets');
        if (savedSched) schedNotesheets = JSON.parse(savedSched);
    } catch(e) {}

    let coordProgs = [];
    try {
        const savedCoord = localStorage.getItem('iicm_coordinator_created_programs');
        if (savedCoord) coordProgs = JSON.parse(savedCoord);
    } catch(e) {}

    // Combine schedule notesheets, coordinator created programs and baseGMPrograms
    const localCombined = [...schedNotesheets, ...coordProgs, ...baseGMPrograms];

    // Merge API programs with local items, applying GM decisions
    const all = [...apiPrograms];
    localCombined.forEach(p => {
        if (!all.some(a => String(a.id) === String(p.id) || a.title === p.title)) {
            all.unshift(p);
        }
    });


    // Apply any saved GM decisions
    return all.map(p => {
        const dec = decisions[p.id] || decisions[p.title];
        if (dec) {
            return Object.assign({}, p, {
                status: dec.status,
                gm_remarks: dec.remarks
            });
        }
        return p;
    });
}


async function loadDashboardStats() {
    const allPrograms = await getAllUnifiedPrograms();
    
    let pendingCnt = allPrograms.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'PENDING' || p.status === 'SUBMITTED' || p.status === 'PROPOSED' || p.status === 'DRAFT').length;
    let appCnt = allPrograms.filter(p => p.status === 'APPROVED').length;
    let rejCnt = allPrograms.filter(p => p.status === 'REJECTED').length;

    if (document.getElementById('stat-pending')) document.getElementById('stat-pending').innerText = pendingCnt;
    if (document.getElementById('stat-approved')) document.getElementById('stat-approved').innerText = appCnt;
    if (document.getElementById('stat-rejected')) document.getElementById('stat-rejected').innerText = rejCnt;

    try {
        const savedHon = localStorage.getItem('iicm_honorarium_data');
        const honList = savedHon ? JSON.parse(savedHon) : [];
        const honPendingCnt = honList.filter(i => i.gm_status === 'PENDING').length;
        if (document.getElementById('stat-hon-pending-main')) document.getElementById('stat-hon-pending-main').innerText = honPendingCnt;
    } catch(e) {}
}

/* ═════════════════════════════════════════════════════════════════════
   GM HONORARIUM SANCTION & APPROVAL MODULE
   ═════════════════════════════════════════════════════════════════════ */
let currentGMHonFilter = 'ALL';

// Payment Release Note workflow: Coordinator -> GM -> Finance.
function _paymentReleaseNotes() {
    try { return JSON.parse(localStorage.getItem('iicm_payment_release_notes') || '[]'); } catch (e) { return []; }
}

function _savePaymentReleaseNotes(notes) {
    localStorage.setItem('iicm_payment_release_notes', JSON.stringify(notes));
}

function getGMHonorariumList() {
    try {
        const saved = localStorage.getItem('iicm_honorarium_data');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
        {
            id: 101,
            bill_ref: 'HON-2026-801',
            bill_date: '2026-08-04',
            faculty_name: 'Dr. Priya Sharma',
            faculty_eis: 'EIS-2026-FAC-991',
            session_title: 'Statutory Mine Safety Audit & Environmental Norms',
            program_title: 'Mine Safety Management Program',
            duration_hours: 4,
            basis_label: '4 hrs @ ₹2,500/hr',
            gross_amount: 10000,
            tds_amount: 1000,
            net_payable: 9000,
            gm_status: 'PENDING',
            payment_status: 'PENDING'
        },
        {
            id: 102,
            bill_ref: 'HON-2026-802',
            bill_date: '2026-08-05',
            faculty_name: 'Dr. Priya Sharma',
            faculty_eis: 'EIS-2026-FAC-991',
            session_title: 'Digital Mining & Autonomous Fleet Monitoring',
            program_title: 'Digital Transformation Workshop',
            duration_hours: 4,
            basis_label: '1 session @ ₹12,000/sess',
            gross_amount: 12000,
            tds_amount: 1200,
            net_payable: 10800,
            gm_status: 'APPROVED',
            payment_status: 'PENDING'
        }
    ];
}

function filterGMHonTable(filter) {
    currentGMHonFilter = filter;
    loadGMHonorariumTable();
}

function loadGMPaymentReleaseNotes() {
    const tbody = document.getElementById('gm-hon-table-body');
    if (!tbody) return false;
    const notes = _paymentReleaseNotes().filter(n => n.status === 'PENDING_GM' || n.status === 'RETURNED_TO_GM');
    if (!notes.length) return false;
    tbody.innerHTML = notes.map(n => `<tr><td style="padding:14px"><strong>${n.refNo}</strong><div style="font-size:11px;color:#64748b">${new Date(n.submittedAt).toLocaleDateString('en-IN')}</div></td><td style="padding:14px"><strong>Payment Release Note</strong><div style="font-size:11px;color:#64748b">Coordinator submission</div></td><td style="padding:14px">${n.programTitle}</td><td style="padding:14px">Honorarium &amp; expenditure</td><td style="padding:14px"><strong>₹ ${(n.grandTotal || 0).toLocaleString('en-IN')}</strong></td><td style="padding:14px"><span style="background:${n.status==='RETURNED_TO_GM'?'#fee2e2':'#fef3c7'};color:${n.status==='RETURNED_TO_GM'?'#b91c1c':'#b45309'};padding:5px 10px;border-radius:4px;font-size:11px;font-weight:700">${n.status==='RETURNED_TO_GM'?'FINANCE RETURNED':'PENDING GM REVIEW'}</span><div style="font-size:11px;margin-top:4px">${n.finance_remarks||''}</div></td><td style="padding:14px;text-align:right"><button class="btn-filter" style="background:#16a34a;color:#fff;padding:7px 10px" onclick="approvePaymentReleaseByGM(${n.id})">Approve &amp; Send Finance</button> <button class="btn-filter" style="background:#dc2626;color:#fff;padding:7px 10px" onclick="rejectPaymentReleaseByGM(${n.id})">Reject</button></td></tr>`).join('');
    return true;
}

function approvePaymentReleaseByGM(id) {
    const notes = _paymentReleaseNotes(); const note = notes.find(n => String(n.id) === String(id));
    if (!note) return;
    note.status = 'PENDING_FINANCE'; note.gm_approved_at = new Date().toISOString(); note.gm_remarks = 'Approved and forwarded to Finance Officer.';
    note.workflow = note.workflow || []; note.workflow.push({ actor: 'General Manager', action: 'Approved and forwarded to Finance', at: note.gm_approved_at });
    _savePaymentReleaseNotes(notes); loadGMHonorariumTable(); alert('Approved by GM and forwarded to Finance Officer.');
}

function rejectPaymentReleaseByGM(id) {
    const notes = _paymentReleaseNotes(); const note = notes.find(n => String(n.id) === String(id));
    if (!note) return;
    note.status = 'RETURNED_TO_COORDINATOR'; note.gm_remarks = prompt('GM rejection remarks:') || 'Returned by GM for correction.'; note.gm_rejected_at = new Date().toISOString();
    note.workflow = note.workflow || []; note.workflow.push({ actor: 'General Manager', action: note.gm_remarks, at: note.gm_rejected_at });
    _savePaymentReleaseNotes(notes); loadGMHonorariumTable();
}

function loadGMHonorariumTable() {
    const tbody = document.getElementById('gm-hon-table-body');
    if (!tbody) return;

    if (loadGMPaymentReleaseNotes()) return;

    const list = getGMHonorariumList();
    const searchVal = (document.getElementById('gm-hon-search') ? document.getElementById('gm-hon-search').value.trim().toLowerCase() : '');

    let filtered = list;
    if (currentGMHonFilter === 'PENDING') {
        filtered = list.filter(i => i.gm_status === 'PENDING');
    } else if (currentGMHonFilter === 'APPROVED') {
        filtered = list.filter(i => i.gm_status === 'APPROVED');
    }

    if (searchVal) {
        filtered = filtered.filter(i =>
            (i.faculty_name || '').toLowerCase().includes(searchVal) ||
            (i.bill_ref || '').toLowerCase().includes(searchVal) ||
            (i.session_title || '').toLowerCase().includes(searchVal)
        );
    }

    // Stats calculations for GM
    const pendingCnt = list.filter(i => i.gm_status === 'PENDING').length;
    const approvedCnt = list.filter(i => i.gm_status === 'APPROVED').length;
    const pendingAmtSum = list.filter(i => i.gm_status === 'PENDING').reduce((acc, curr) => acc + (curr.net_payable || 0), 0);

    if (document.getElementById('gm-stat-hon-pending')) document.getElementById('gm-stat-hon-pending').innerText = pendingCnt;
    if (document.getElementById('gm-stat-hon-approved')) document.getElementById('gm-stat-hon-approved').innerText = approvedCnt;
    if (document.getElementById('gm-stat-hon-amount')) document.getElementById('gm-stat-hon-amount').innerText = `₹ ${pendingAmtSum.toLocaleString('en-IN')}`;
    if (document.getElementById('stat-hon-pending-main')) document.getElementById('stat-hon-pending-main').innerText = pendingCnt;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">No honorarium bill records found under filter: <strong>${currentGMHonFilter}</strong>.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(i => {
        let statusBadge = `<span style="background:#fef3c7; color:#b45309; font-weight:700; padding:5px 10px; border-radius:4px; font-size:11.5px;">🟡 PENDING GM SANCTION</span>`;
        if (i.gm_status === 'APPROVED') {
            statusBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:700; padding:5px 10px; border-radius:4px; font-size:11.5px;">🟢 SANCTIONED BY GM</span>`;
        }

        const basisText = i.basis_label || (i.basis === 'session' ? `${i.qty || 1} session @ ₹${i.rate_per_unit || i.gross_amount}/sess` : (i.basis === 'day' ? `${i.qty || 1} days @ ₹${i.rate_per_unit}/day` : `${i.duration_hours || 4} hrs @ ₹${i.rate_per_hour || 2500}/hr`));

        let actionBtn = '';
        if (i.gm_status === 'PENDING') {
            actionBtn = `
                <button type="button" class="btn-filter" style="background:#16a34a; color:#fff; font-size:12px; font-weight:800; padding:7px 14px; border-radius:6px; cursor:pointer;" onclick="sanctionGMHonorarium(${i.id})">
                    🟢 Grant GM Sanction
                </button>
            `;
        } else {
            actionBtn = `
                <span style="color:#15803d; font-weight:700; font-size:12.5px; display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                    ✅ Sanctioned &amp; Dispatched
                </span>
            `;
        }

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:14px 16px;">
                    <strong style="color:#064e3b; font-size:14px;">${i.bill_ref}</strong>
                    <div style="font-size:12px; color:#64748b;">Date: ${i.bill_date}</div>
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:14px;">${i.faculty_name}</strong>
                    <div style="font-size:12px; color:#64748b;">${i.faculty_eis || 'EIS-2026-FAC'}</div>
                </td>
                <td style="padding:14px 16px;">
                    <div style="font-weight:700; color:#334155; font-size:13px;">${i.session_title}</div>
                    <div style="font-size:12px; color:#64748b;">Program: ${i.program_title}</div>
                </td>
                <td style="padding:14px 16px; font-weight:600; color:#0284c7; font-size:12.5px;">
                    ${basisText}
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#064e3b; font-size:15px;">₹ ${(i.net_payable || 0).toLocaleString('en-IN')}</strong>
                    <div style="font-size:11px; color:#64748b;">Gross: ₹${(i.gross_amount||0).toLocaleString('en-IN')} | TDS: ₹${(i.tds_amount||0).toLocaleString('en-IN')}</div>
                </td>
                <td style="padding:14px 16px;">
                    ${statusBadge}
                </td>
                <td style="padding:14px 16px; text-align:right;">
                    ${actionBtn}
                </td>
            </tr>
        `;
    }).join('');
}

function sanctionGMHonorarium(id) {
    try {
        let saved = localStorage.getItem('iicm_honorarium_data');
        let list = saved ? JSON.parse(saved) : (typeof sampleHonorariumData !== 'undefined' ? sampleHonorariumData : getGMHonorariumList());
        const item = list.find(i => String(i.id) === String(id));
        if (item) {
            item.gm_status = 'APPROVED';
            item.finance_status = 'VERIFIED';
            item.gm_approved_at = new Date().toISOString();
            localStorage.setItem('iicm_honorarium_data', JSON.stringify(list));
            loadGMHonorariumTable();
            alert(`🟢 Executive Financial & Administrative Sanction Granted by GM for "${item.bill_ref}"!\n\nFaculty: ${item.faculty_name}\nNet Payable: ₹${(item.net_payable || 0).toLocaleString('en-IN')}\n\nProgram Coordinator can now release payment.`);
        }
    } catch(e) {
        console.error("Error sanctioning honorarium bill by GM:", e);
    }
}

async function loadProgramsTable(isBackgroundRefresh = false) {
    const searchQueryNode = document.getElementById('gm-search');
    const searchQuery = searchQueryNode ? searchQueryNode.value.trim().toLowerCase() : '';
    const tbody = document.getElementById('gm-table-body');

    if (!tbody) return;
    if (!isBackgroundRefresh && tbody.innerHTML.trim() === '') {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">Loading submitted note sheets...</td></tr>`;
    }

    const allPrograms = await getAllUnifiedPrograms();

    // Filter by Status
    let filtered = allPrograms.filter(p => {
        if (currentStatusFilter === 'PENDING_APPROVAL') {
            return p.status === 'PENDING_APPROVAL' || p.status === 'PENDING' || p.status === 'SUBMITTED' || p.status === 'PROPOSED' || p.status === 'DRAFT';
        }
        return p.status === currentStatusFilter;
    });

    // Apply Search
    if (searchQuery) {
        filtered = filtered.filter(p =>
            (p.title || '').toLowerCase().includes(searchQuery) ||
            (p.coordinator_name || '').toLowerCase().includes(searchQuery) ||
            (p.venue_name || '').toLowerCase().includes(searchQuery)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#64748b; font-size:15px;">No note sheets found under status: <strong>${currentStatusFilter.replace('_', ' ')}</strong>.</td></tr>`;
        return;
    }

    const newHtml = filtered.map(p => {
        const budgetFormatted = Number(p.budget || 500000).toLocaleString('en-IN');
        let statusBadge = `<span class="badge-status badge-pending_approval">🟡 PENDING GM REVIEW</span>`;
        if (p.status === 'APPROVED') {
            statusBadge = `<span class="badge-status badge-approved">🟢 APPROVED BY GM</span>`;
        } else if (p.status === 'REJECTED') {
            statusBadge = `<span class="badge-status badge-rejected">🔴 REJECTED BY GM</span>`;
        }

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:16px 18px;"><strong style="font-size:15px; color:#0f172a;">${p.title}</strong></td>
                <td style="padding:16px 18px;"><span style="background:#e2e8f0; font-weight:700; padding:4px 8px; border-radius:4px; font-size:12px;">${p.program_type_name || p.program_type || 'Technical'}</span></td>
                <td style="padding:16px 18px; color:#334155;">📍 ${p.venue_name || 'IICM Campus'}</td>
                <td style="padding:16px 18px; font-weight:600; color:#334155;">${p.start_date || '2026-08-18'} to ${p.end_date || '2026-08-22'}</td>
                <td style="padding:16px 18px;"><strong style="color:#064e3b; font-size:15px;">₹ ${budgetFormatted}</strong></td>
                <td style="padding:16px 18px; color:#475569;">👤 ${p.coordinator_name || 'Program Coordinator'}</td>
                <td style="padding:16px 18px;">${statusBadge}</td>
                <td style="padding:16px 18px; text-align:right;">
                    <button class="btn-primary" onclick="openReviewModal('${p.id}')">
                        🔍 ${p.status === 'APPROVED' || p.status === 'REJECTED' ? 'View Note Sheet' : 'Review & Approve'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (tbody.innerHTML !== newHtml) {
        tbody.innerHTML = newHtml;
    }

}

async function openReviewModal(programId) {
    const allPrograms = await getAllUnifiedPrograms();
    activeReviewProgram = allPrograms.find(p => String(p.id) === String(programId));

    if (!activeReviewProgram) {
        alert("Program details not found.");
        return;
    }

    const p = activeReviewProgram;
    const refNo = `IICM/NS-2026/08-${p.id}`;
    const formattedBudget = `₹ ${Number(p.budget || 500000).toLocaleString('en-IN')}`;

    // Fill Header & Subject
    if (document.getElementById('modal-ref-no')) document.getElementById('modal-ref-no').innerText = refNo;
    if (document.getElementById('modal-program-title')) document.getElementById('modal-program-title').innerText = p.title;
    if (document.getElementById('modal-subject-title')) document.getElementById('modal-subject-title').innerText = `"${p.title}"`;
    if (document.getElementById('modal-budget-headline')) document.getElementById('modal-budget-headline').innerText = formattedBudget;

    // Fill View Readouts
    document.getElementById('modal-type').innerText = p.program_type_name || p.program_type || 'Technical Training';
    document.getElementById('modal-venue').innerText = p.venue_name || 'IICM Campus';
    document.getElementById('modal-dates').innerText = `${p.start_date} to ${p.end_date} (${p.duration_days || 5} days)`;
    document.getElementById('modal-budget').innerText = formattedBudget;
    document.getElementById('modal-participants').innerText = `${p.target_participants_count || 35} Executive Trainees`;
    document.getElementById('modal-companies').innerText = p.target_companies || 'ALL CIL Subsidiaries';
    document.getElementById('modal-objective').innerText = p.objective || 'Advanced Executive Training & Operations';
    document.getElementById('modal-description').innerText = p.description || 'Program created for executive development at IICM Campus.';

    // Fill Edit Inputs
    if (document.getElementById('edit-ns-title')) document.getElementById('edit-ns-title').value = p.title || '';
    if (document.getElementById('edit-ns-type')) document.getElementById('edit-ns-type').value = p.program_type_name || p.program_type || 'MDP';
    if (document.getElementById('edit-ns-venue')) document.getElementById('edit-ns-venue').value = p.venue_name || 'Main Auditorium, IICM Campus';
    if (document.getElementById('edit-ns-start')) document.getElementById('edit-ns-start').value = p.start_date || '2026-08-18';
    if (document.getElementById('edit-ns-end')) document.getElementById('edit-ns-end').value = p.end_date || '2026-08-29';
    if (document.getElementById('edit-ns-budget')) document.getElementById('edit-ns-budget').value = p.budget || 500000;
    if (document.getElementById('edit-ns-objective')) document.getElementById('edit-ns-objective').value = p.objective || '';
    if (document.getElementById('edit-ns-description')) document.getElementById('edit-ns-description').value = p.description || '';

    // Status Badge
    const badgeNode = document.getElementById('modal-status-badge');
    const stampNode = document.getElementById('gm-sanction-stamp');
    if (p.status === 'APPROVED') {
        if (badgeNode) badgeNode.outerHTML = `<span id="modal-status-badge" class="badge-status badge-approved">🟢 APPROVED BY GM</span>`;
        if (stampNode) stampNode.innerText = `Status: ✅ SANCTIONED & APPROVED (${p.gm_remarks || 'Budget Sanctioned'})`;
    } else if (p.status === 'REJECTED') {
        if (badgeNode) badgeNode.outerHTML = `<span id="modal-status-badge" class="badge-status badge-rejected">🔴 REJECTED BY GM</span>`;
        if (stampNode) stampNode.innerText = `Status: ❌ REJECTED (${p.gm_remarks || 'Requisition Declined'})`;
    } else {
        if (badgeNode) badgeNode.outerHTML = `<span id="modal-status-badge" class="badge-status badge-pending_approval">🟡 PENDING GM REVIEW</span>`;
        if (stampNode) stampNode.innerText = `Status: Executive Review Active`;
    }

    // Existing GM Remarks readout
    const existingRemarksBox = document.getElementById('existing-remarks-box');
    const existingRemarksText = document.getElementById('existing-remarks-text');
    if (p.gm_remarks) {
        existingRemarksBox.style.display = 'block';
        existingRemarksText.innerText = p.gm_remarks;
    } else {
        existingRemarksBox.style.display = 'none';
    }

    // Reset remarks input
    if (document.getElementById('gm-remarks')) document.getElementById('gm-remarks').value = '';

    // Ensure View Mode is Active & Edit Mode is Hidden
    toggleEditNoteSheet(false);

    const modal = document.getElementById('review-modal');
    if (modal) modal.style.display = 'flex';
}

function toggleEditNoteSheet(showEdit) {
    const viewDiv = document.getElementById('notesheet-view-mode');
    const editDiv = document.getElementById('notesheet-edit-mode');
    if (showEdit) {
        if (viewDiv) viewDiv.style.display = 'none';
        if (editDiv) editDiv.style.display = 'block';
    } else {
        if (viewDiv) viewDiv.style.display = 'block';
        if (editDiv) editDiv.style.display = 'none';
    }
}

async function saveNoteSheetEdits() {
    if (!activeReviewProgram) return;

    const token = localStorage.getItem('iicm_access_token');
    const newTitle = document.getElementById('edit-ns-title').value.trim();
    const newType = document.getElementById('edit-ns-type').value.trim();
    const newVenue = document.getElementById('edit-ns-venue').value.trim();
    const newStart = document.getElementById('edit-ns-start').value;
    const newEnd = document.getElementById('edit-ns-end').value;
    const newBudget = parseFloat(document.getElementById('edit-ns-budget').value) || activeReviewProgram.budget;
    const newObjective = document.getElementById('edit-ns-objective').value.trim();
    const newDesc = document.getElementById('edit-ns-description').value.trim();

    if (!newTitle) {
        alert("Please enter program title.");
        return;
    }

    // Update active program
    activeReviewProgram.title = newTitle;
    activeReviewProgram.program_type_name = newType;
    activeReviewProgram.venue_name = newVenue;
    activeReviewProgram.start_date = newStart;
    activeReviewProgram.end_date = newEnd;
    activeReviewProgram.budget = newBudget;
    activeReviewProgram.objective = newObjective;
    activeReviewProgram.description = newDesc;

    // Call API
    try {
        await fetch(`${API_BASE_URL}/programs/${activeReviewProgram.id}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: newTitle,
                start_date: newStart,
                end_date: newEnd,
                budget: newBudget,
                objective: newObjective,
                description: newDesc
            })
        });
    } catch(e) {}

    // Refresh view readouts
    const formattedBudget = `₹ ${Number(newBudget).toLocaleString('en-IN')}`;
    document.getElementById('modal-program-title').innerText = newTitle;
    document.getElementById('modal-subject-title').innerText = `"${newTitle}"`;
    document.getElementById('modal-budget-headline').innerText = formattedBudget;
    document.getElementById('modal-type').innerText = newType;
    document.getElementById('modal-venue').innerText = newVenue;
    document.getElementById('modal-dates').innerText = `${newStart} to ${newEnd}`;
    document.getElementById('modal-budget').innerText = formattedBudget;
    document.getElementById('modal-objective').innerText = newObjective;
    document.getElementById('modal-description').innerText = newDesc;

    toggleEditNoteSheet(false);
    await loadDashboardStats();
    await loadProgramsTable();
    alert(`✅ Note Sheet specifications for "${newTitle}" updated successfully!`);
}

function printNoteSheetDocument() {
    window.print();
}

function closeModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.style.display = 'none';
}

async function submitDecision(action) {
    if (!activeReviewProgram) return;

    const remarksNode = document.getElementById('gm-remarks');
    const rawRemarks = remarksNode ? remarksNode.value.trim() : '';
    const newStatus = (action === 'approve') ? 'APPROVED' : 'REJECTED';
    const defaultRemarks = action === 'approve' ? 'Approved & Administrative Financial Sanction Granted by GM Academics.' : 'Requisition Declined by GM Academics.';
    const finalRemarks = rawRemarks || defaultRemarks;

    const token = localStorage.getItem('iicm_access_token');
    const endpoint = (action === 'approve') ? 'approve-note-sheet' : 'reject-note-sheet';

    // 1. Always save GM decision locally
    saveGMDecision(activeReviewProgram.id, newStatus, finalRemarks, activeReviewProgram.title);

    // Update schedule notesheet status if matching
    try {
        let scheds = JSON.parse(localStorage.getItem('iicm_schedule_notesheets') || '[]');
        let updatedS = false;
        scheds = scheds.map(s => {
            if (String(s.id) === String(activeReviewProgram.id) || s.title === activeReviewProgram.title) {
                s.status = newStatus;
                s.gm_remarks = finalRemarks;
                updatedS = true;
            }
            return s;
        });
        if (updatedS) localStorage.setItem('iicm_schedule_notesheets', JSON.stringify(scheds));
    } catch(e) {}

    // Update coordinator created programs status if matching
    try {
        let progs = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]');
        let updatedP = false;
        progs = progs.map(p => {
            if (String(p.id) === String(activeReviewProgram.id) || p.title === activeReviewProgram.title) {
                p.status = newStatus;
                p.gm_remarks = finalRemarks;
                updatedP = true;
            }
            return p;
        });
        if (updatedP) localStorage.setItem('iicm_coordinator_created_programs', JSON.stringify(progs));
    } catch(e) {}

    // 2. Dispatch to Backend API if numeric ID

    if (typeof activeReviewProgram.id === 'number' || !isNaN(Number(activeReviewProgram.id))) {
        try {
            await fetch(`${API_BASE_URL}/programs/${activeReviewProgram.id}/${endpoint}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ remarks: finalRemarks })
            });
        } catch(e) {}
    }

    // 3. Close Modal Smoothly
    closeModal();


    // 3. Instantly Switch view to target tab (Approved or Rejected) & Refresh Table & Stats
    showSection(action === 'approve' ? 'approved' : 'rejected');
    await loadDashboardStats();
    await loadProgramsTable();
}

function loadNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    container.innerHTML = `
        <div style="background:#eff6ff; border-left:4px solid #2563eb; padding:16px; border-radius:10px; margin-bottom:14px;">
            <strong style="color:#1d4ed8; font-size:15px;">📋 New Executive Note Sheet Submitted:</strong>
            <p style="margin:6px 0 0 0; font-size:13.5px; color:#334155;">Program Coordinator submitted "Digital Transformation &amp; Industry 4.0 Workshop" for GM approval. Budget: ₹ 4,80,000.</p>
        </div>
        <div style="background:#f0fdf4; border-left:4px solid #16a34a; padding:16px; border-radius:10px;">
            <strong style="color:#15803d; font-size:15px;">🟢 Program Sanctioned &amp; Approved:</strong>
            <p style="margin:6px 0 0 0; font-size:13.5px; color:#334155;">"Executive Leadership &amp; Operational Excellence Program" was approved on 04 August 2026. Faculty assignments unlocked.</p>
        </div>
    `;
}
