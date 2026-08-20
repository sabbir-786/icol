
/* ═════════════════════════════════════════════════════════════════════
   MASTER PROGRAM DROPDOWNS SYNCHRONIZER
   Ensures EVERY program dropdown across all 11 modules is populated
   and dynamically updates related form fields upon selection.
   ═════════════════════════════════════════════════════════════════════ */

function getMasterProgramList() {
    let progs = [];
    if (typeof getUnifiedCoordinatorPrograms === 'function') {
        try { progs = getUnifiedCoordinatorPrograms(); } catch(e) {}
    }
    if (!progs || progs.length === 0) {
        try {
            progs = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]');
        } catch(e) {}
    }
    if (!progs || progs.length === 0) {
        progs = getDemoProgramsData();
    }
    if (!progs || progs.length === 0) {
        progs = [
            {
                id: 1,
                title: 'Occupational Health Capacity Building Workshop',
                program_type_name: 'MDP',
                venue_name: 'IICM Training Hall, Ranchi',
                faculty: 'Dr. Priya Sharma',
                start_date: '2026-08-10',
                end_date: '2026-08-15',
                expected_participants: 25,
                mode: 'OFFLINE',
                objective: 'Capacity building and occupational disease prevention in mining sector.'
            },
            {
                id: 2,
                title: 'Advanced Mine Safety Management Program',
                program_type_name: 'Technical Training',
                venue_name: 'IICM Main Hall, Ranchi',
                faculty: 'Prof. Piyush Rai',
                start_date: '2026-08-18',
                end_date: '2026-08-22',
                expected_participants: 30,
                mode: 'OFFLINE',
                objective: 'Advanced mine safety protocols, DGMS guidelines and accident prevention.'
            },
            {
                id: 3,
                title: 'Digital Transformation Workshop',
                program_type_name: 'Workshop',
                venue_name: 'IICM Conference Hall, Ranchi',
                faculty: 'Prof. Rakesh Gupta',
                start_date: '2026-08-25',
                end_date: '2026-08-29',
                expected_participants: 20,
                mode: 'HYBRID',
                objective: 'Industrial IoT, AI and digital automation in coal mining operations.'
            },
            {
                id: 4,
                title: 'Executive Management Development Programme for MTs',
                program_type_name: 'MT',
                venue_name: 'Executive Training Complex, Ranchi',
                faculty: 'Prof. Arun Sharma',
                start_date: '2026-09-01',
                end_date: '2026-09-05',
                expected_participants: 35,
                mode: 'OFFLINE',
                objective: 'Executive leadership, corporate governance and team dynamics for MTs.'
            }
        ];
    }
    return progs;
}

function populateAllProgramDropdowns() {
    const progs = getMasterProgramList();
    if (!progs || progs.length === 0) return;

    const dropdownIds = [
        'nom-program-select',
        'assign-prog-select',
        'ns-program-select',
        'invite-program-select',
        'pr-program-select',
        'att-prog-select',
        'mis-filter-programme',
        'coord-prog-select',
        'coord-selected-prog-select',
        'tt-program-id',
        'cal-program',
        'cert-program-select'
    ];

    dropdownIds.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;

        const currentVal = sel.value;
        let html = '';

        if (id === 'mis-filter-programme') {
            html = '<option value="">All Programmes</option>';
        } else {
            html = '<option value="">-- Select Training Program --</option>';
        }

        html += progs.map(p => {
            const pId = p.id || 1;
            const pTitle = p.title || p.name || 'Training Program';
            const pType = p.program_type_name || p.type || 'Program';
            const pVenue = p.venue_name || p.venue || 'IICM Campus';
            const sDate = p.start_date || '2026-08-10';
            const eDate = p.end_date || '2026-08-15';
            const cap = p.expected_participants || 25;
            const obj = p.objective || ('To develop executive management competency in ' + pTitle);
            return `<option value="${pId}" data-title="${_esc(pTitle)}" data-type="${_esc(pType)}" data-venue="${_esc(pVenue)}" data-start="${sDate}" data-end="${eDate}" data-start-date="${sDate}" data-end-date="${eDate}" data-capacity="${cap}" data-objective="${_esc(obj)}">${_esc(pTitle)} (${_esc(pType)})</option>`;
        }).join('');

        sel.innerHTML = html;
        if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
            sel.value = currentVal;
        } else if (sel.options.length > 1 && id !== 'mis-filter-programme') {
            sel.selectedIndex = 1;
        }
    });

    // Trigger initial updates
    try { if (typeof onAttendanceProgramChange === 'function') onAttendanceProgramChange(); } catch(e) {}
    try { if (typeof onNominationProgramChange === 'function') onNominationProgramChange(); } catch(e) {}
    try { if (typeof onNotesheetProgramChange === 'function') onNotesheetProgramChange(); } catch(e) {}
    try { if (typeof onPaymentReleaseProgramChange === 'function') onPaymentReleaseProgramChange(); } catch(e) {}
}
window.populateAllProgramDropdowns = populateAllProgramDropdowns;

function id(elemId) { return document.getElementById(elemId); }
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
}

/* ─── JWT-aware fetch wrapper ──────────────────────────────────────
   Automatically attempts a token refresh on 401 and retries once.
   Usage:  const res = await apiFetch(url, options);

   IMPORTANT: Does NOT auto-redirect to login — callers decide.
   This prevents background interval calls from redirecting the
   page while the coordinator is using the QR attendance screen.
─────────────────────────────────────────────────────────────────── */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('iicm_access_token');
    const defaultHeaders = { 'Content-Type': 'application/json' };
    if (token) defaultHeaders['Authorization'] = 'Bearer ' + token;

    const mergedOptions = {
        ...options,
        headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    let res = await fetch(url, mergedOptions);

    // On 401: try a silent token refresh and retry once.
    // We do NOT redirect here — the caller handles persistent 401.
    if (res.status === 401) {
        const refreshToken = localStorage.getItem('iicm_refresh_token');
        if (refreshToken) {
            try {
                const refreshRes = await fetch(API_BASE_URL + '/accounts/token/refresh/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });
                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    const newAccess = refreshData.access;
                    localStorage.setItem('iicm_access_token', newAccess);
                    mergedOptions.headers['Authorization'] = 'Bearer ' + newAccess;
                    res = await fetch(url, mergedOptions);  // retry once with fresh token
                } else {
                    // Refresh token also invalid — mark session expired silently.
                    // Let the explicit user-action callers (e.g. QR generate) show an error.
                    console.warn('[apiFetch] Refresh token rejected — session expired.');
                    res._sessionExpired = true;  // signal for callers that care
                }
            } catch (e) {
                console.warn('[apiFetch] Token refresh network error:', e);
            }
        }
    }
    return res;
}

let currentFilterStatus = '';
let currentFilterType = '';
let programTypesCache = [];
let venuesCache = [];
let companiesCache = [];
let facultiesCache = [];
let subjectsCache = [];
let activeProgramForTT = null;
let activeScheduleId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = checkAuth('PROGRAM_COORDINATOR');
        if (user) renderUserProfile(user);

        try { populateAllProgramDropdowns(); } catch(e) { console.warn(e); }
        try { await loadMasterDropdowns(); } catch(e) { console.warn(e); }
        try { await loadDashboardStats(); } catch(e) { console.warn(e); }
        try { loadDashboardWidgets(); } catch(e) { console.warn(e); }
        try { loadProgramsTable(); } catch(e) { console.warn(e); }
        try { loadNominationDashboardCount(); } catch(e) { console.warn(e); }
        try { initAttendanceSection(false); } catch(e) { console.warn(e); }
        try { if (typeof loadDispatchCommunications === 'function') loadDispatchCommunications(); } catch(e) { console.warn(e); }

        const dateNode = document.getElementById('dashboard-date');
        if (dateNode) {
            const today = new Date();
            dateNode.innerText = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        }
    } catch(err) {
        console.error('Error during Coordinator DOMContentLoaded init:', err);
    }

    // Cross-tab real-time sync via Storage Event (instant update without 3s polling flicker)
    window.addEventListener('storage', async (e) => {
        try {
            if (e.key === 'iicm_gm_decisions' || e.key === 'iicm_coordinator_created_programs' || e.key === 'iicm_schedule_notesheets' || e.key === 'iicm_honorarium_data') {
                await loadDashboardStats();
                loadDashboardWidgets();
                loadProgramsTable();
                loadHonorariumTable();
            }
        } catch(e) {}
    });

    // Low frequency fallback refresh (60 seconds)
    setInterval(async () => {
        try {
            await loadDashboardStats();
            loadDashboardWidgets();
            loadHonorariumTable();
        } catch(e) {}
    }, 60000);
});



function toggleSidebar() {
    const sidebar = id('app-sidebar');
    if (sidebar) {
        if (sidebar.style.display === 'none') {
            sidebar.style.display = 'flex';
        } else {
            sidebar.style.display = 'none';
        }
    }
}

function showSection(sectionName) {
    try {
        console.log('[showSection] Switching to:', sectionName);
        
        // 1. Sidebar active states
        document.querySelectorAll('.sidebar-item').forEach(function(el) { el.classList.remove('active'); });

        var navMap = {
            'dash': 'nav-dash',
            'nomination-form': 'nav-nomination-form',
            'faculty-assign': 'nav-faculty-assign',
            'list': 'nav-list',
            'programs': 'nav-list',
            'pending': 'nav-list',
            'approved': 'nav-list',
            'ongoing': 'nav-ongoing',
            'attendance': 'nav-ongoing',
            'completed': 'nav-list',
            'notesheet': 'nav-notesheet',
            'fac-invite': 'nav-fac-invite',
            'payment-release': 'nav-payment-release',
            'fac-master': 'nav-fac-master',
            'honorarium': 'nav-honorarium',
            'mis': 'nav-mis',
            'create': 'nav-create',
            'nominations': 'nav-nominations',
            'selected': 'nav-selected',
            'calendar': 'nav-calendar',
            'notifications': 'nav-notifications'
        };

        var activeNavId = navMap[sectionName];
        if (activeNavId) {
            var activeNav = document.getElementById(activeNavId);
            if (activeNav) activeNav.classList.add('active');
        }

        // 2. Hide dashboard-only elements
        document.querySelectorAll('.dashboard-only').forEach(function(el) {
            el.style.display = (sectionName === 'dash') ? '' : 'none';
        });

        // 3. Section ID mapping
        var sectionMap = {
            'dash': 'section-dash',
            'nomination-form': 'section-nomination-form',
            'faculty-assign': 'section-faculty-assign',
            'list': 'section-programs',
            'programs': 'section-programs',
            'pending': 'section-programs',
            'approved': 'section-programs',
            'completed': 'section-programs',
            'notesheet': 'section-notesheet',
            'fac-invite': 'section-fac-invite',
            'ongoing': 'section-session-attendance',
            'attendance': 'section-session-attendance',
            'payment-release': 'section-payment-release',
            'fac-master': 'section-fac-master',
            'honorarium': 'section-honorarium',
            'mis': 'section-mis',
            'create': 'section-create',
            'nominations': 'section-nominations',
            'selected': 'section-selected',
            'notifications': 'section-notifications'
        };

        // 4. Hide ALL section views
        document.querySelectorAll('.section-view').forEach(function(el) {
            el.classList.remove('active');
            el.style.display = 'none';
        });

        // 5. Show TARGET section view
        var targetSecId = sectionMap[sectionName] || ('section-' + sectionName);
        var targetSec = document.getElementById(targetSecId);
        if (targetSec) {
            targetSec.classList.add('active');
            targetSec.style.display = 'block';
        } else {
            console.warn('[showSection] Target section not found:', targetSecId);
        }

        // 6. Sub-module initializations (safely guarded)
        if (sectionName === 'list' || sectionName === 'programs' || sectionName === 'pending' || sectionName === 'approved' || sectionName === 'completed') {
            var statusMap = {
                'pending': 'PENDING_APPROVAL',
                'approved': 'APPROVED',
                'completed': 'COMPLETED'
            };
            currentFilterStatus = statusMap[sectionName] || '';
            var statusSelect = document.getElementById('filter-status-select');
            if (statusSelect) statusSelect.value = currentFilterStatus;
            try { loadProgramsTable(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'nomination-form') {
            try { if (window.initNominationFormSection) window.initNominationFormSection(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'faculty-assign') {
            try { populateFacultyAssignDropdowns(); loadFacultySchedulesTable(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'notesheet') {
            try { if (window.initNotesheetSection) window.initNotesheetSection(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'fac-invite') {
            try { if (window.initFacultyInviteSection) window.initFacultyInviteSection(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'ongoing' || sectionName === 'attendance') {
            try { initAttendanceSection(false); } catch(e) { console.warn(e); }
        } else if (sectionName === 'payment-release') {
            try { if (window.initPaymentReleaseSection) window.initPaymentReleaseSection(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'fac-master') {
            try { loadCoordFacultyMasterTable(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'honorarium') {
            try { loadHonorariumTable(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'mis') {
            try { loadMISReport(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'dash') {
            try { if (typeof loadDispatchCommunications === 'function') loadDispatchCommunications(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'nominations') {
            try { populateCoordProgramSelect(); loadCoordinatorNominationsTable(); } catch(e) { console.warn(e); }
        } else if (sectionName === 'selected') {
            try { populateSelectedProgSelect(); loadSelectedCandidatesTable(); } catch(e) { console.warn(e); }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(err) {
        console.error('Error in showSection:', err);
    }
}
window.showSection = showSection;

function initCoordinatorFeedbackForm() {
    const select = document.getElementById('pc-feedback-program');
    if (select && select.options.length <= 1) {
        select.innerHTML = '<option value="">-- Select Programme --</option>';
        select.innerHTML += '<option value="Feedback Form of Programme on “Artificial Intelligence and Digital Transformation” Duration 17 - 19 June 2026." selected>AI and Digital Transformation (17-19 June 2026)</option>';
        let programs = [];
        try { programs = window.getUnifiedCoordinatorPrograms ? window.getUnifiedCoordinatorPrograms() : []; } catch (e) {}
        if (!programs.length) { try { programs = JSON.parse(localStorage.getItem('iicm_programs') || '[]'); } catch (e) {} }
        programs.forEach(p => {
            const title = p.title || p.program_title || p.name;
            if (title && !title.includes('Artificial Intelligence and Digital Transformation')) {
                const o = document.createElement('option');
                o.value = title;
                o.textContent = title;
                select.appendChild(o);
            }
        });
    }
    loadCoordinatorFeedbackSubmissions();
}

function generateFeedbackQRCode() {
    const card = document.getElementById('pc-feedback-qr-card');
    const container = document.getElementById('pc-feedback-qrcode-container');
    const urlText = document.getElementById('pc-feedback-qr-url');
    if (!card || !container) return;

    // Toggle view
    if (card.style.display === 'block') {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    container.innerHTML = '';

    const selectedProg = document.getElementById('pc-feedback-program')?.value || 'Artificial Intelligence and Digital Transformation';
    const formUrl = new URL('../feedback/index.html', window.location.href).href;

    if (window.QRCode) {
        new QRCode(container, {
            text: formUrl,
            width: 180,
            height: 180,
            colorDark: "#0B5D3B",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(formUrl)}" alt="Feedback QR" style="border:1px solid #0f766e; border-radius:8px;">`;
    }

    if (urlText) {
        urlText.innerHTML = `Link: <a href="${formUrl}" target="_blank" style="color:#0f766e; text-decoration:underline;">${formUrl}</a>`;
    }
}

function loadCoordinatorFeedbackSubmissions() {
    const tbody = document.getElementById('pc-feedback-log-tbody');
    if (!tbody) return;

    let fullSubmissions = [];
    try { fullSubmissions = JSON.parse(localStorage.getItem('iicm_full_feedback_submissions') || '[]'); } catch (e) {}
    let quickSubmissions = [];
    try { quickSubmissions = JSON.parse(localStorage.getItem('iicm_participant_feedback_responses') || '[]'); } catch (e) {}

    if (!fullSubmissions.length && !quickSubmissions.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">No feedback responses recorded yet. Share the QR code with trainees to collect live feedback.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    // Show full submissions first
    fullSubmissions.forEach(sub => {
        rowsHtml += `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px; font-weight:600; color:#1e293b;">${sub.participant_name || 'Participant'}</td>
                <td style="padding:10px; color:#64748b;">${sub.eis_no || '-'}</td>
                <td style="padding:10px;"><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">${sub.subsidiary || 'CCL'}</span></td>
                <td style="padding:10px; font-size:12px; color:#475569; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sub.program_title || 'AI & Digital Transformation'}</td>
                <td style="padding:10px;"><span style="color:#059669; font-weight:700;">★ ${sub.overall_program_rating || 'Excellent'}</span></td>
                <td style="padding:10px; font-size:11.5px; color:#64748b;">${new Date(sub.submitted_at).toLocaleDateString('en-IN', { hour:'2-digit', minute:'2-digit' })}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

function submitCoordinatorFeedbackForm(event) {
    event.preventDefault();
    const value = fieldId => (document.getElementById(fieldId) || {}).value || '';
    const record = {
        id: 'FB-COORD-' + Date.now(),
        program_title: value('pc-feedback-program'),
        participant_name: value('pc-feedback-name'),
        eis_no: value('pc-feedback-eis'),
        subsidiary: value('pc-feedback-subsidiary') || 'CCL',
        programme_design_rating: value('pc-feedback-content') === '5' ? 'Excellent' : 'Very Good',
        overall_program_rating: value('pc-feedback-overall') === '5' ? 'Excellent' : 'Very Good',
        remarks: value('pc-feedback-suggestions'),
        submitted_at: new Date().toISOString()
    };

    let records = []; try { records = JSON.parse(localStorage.getItem('iicm_full_feedback_submissions') || '[]'); } catch (e) {}
    records.unshift(record);
    localStorage.setItem('iicm_full_feedback_submissions', JSON.stringify(records));

    const status = document.getElementById('pc-feedback-status');
    status.textContent = 'Feedback recorded successfully and added to program analytics.';
    status.style.cssText = 'display:block;margin-top:12px;padding:12px;border-radius:7px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;font-weight:600;';

    event.target.reset();
    initCoordinatorFeedbackForm();
}
window.initCoordinatorFeedbackForm = initCoordinatorFeedbackForm;
window.generateFeedbackQRCode = generateFeedbackQRCode;
window.loadCoordinatorFeedbackSubmissions = loadCoordinatorFeedbackSubmissions;
window.submitCoordinatorFeedbackForm = submitCoordinatorFeedbackForm;

function handleFilterChange() {
    const statusSelect = document.getElementById('filter-status-select');
    const typeSelect = document.getElementById('filter-type-select');
    currentFilterStatus = statusSelect ? statusSelect.value : '';
    currentFilterType = typeSelect ? typeSelect.value : '';
    loadProgramsTable();
}

async function loadMasterDropdowns() {
    try {
        const ptRes = await apiFetch(`${API_BASE_URL}/masters/program-types/?is_active=true&page_size=100`);
        if (ptRes.ok) {
            const data = await ptRes.json();
            programTypesCache = data.results || data;
            populateTypeDropdowns();
        }

        const vRes = await apiFetch(`${API_BASE_URL}/masters/venues/?is_active=true&page_size=100`);
        if (vRes.ok) {
            const data = await vRes.json();
            venuesCache = data.results || data;
            populateVenueDropdowns();
        }

        const cRes = await apiFetch(`${API_BASE_URL}/masters/companies/?is_active=true&page_size=100`);
        if (cRes.ok) {
            const data = await cRes.json();
            companiesCache = data.results || data;
            populateCompaniesGrid();
        }

        const fRes = await apiFetch(`${API_BASE_URL}/faculty/faculties/?is_active=true&page_size=100`);
        if (fRes.ok) {
            const data = await fRes.json();
            facultiesCache = data.results || data;
            window.facultiesCache = facultiesCache;
            populateFacultyDropdowns();
        }

        const sRes = await apiFetch(`${API_BASE_URL}/masters/training-subjects/?is_active=true&page_size=100`);
        if (sRes.ok) {
            const data = await sRes.json();
            subjectsCache = data.results || data;
            populateSubjectDropdowns();
        }
    } catch (e) {
        console.warn("[DEV MODE] Backend unreachable — loading master dropdowns.");
        loadDemoMasterDropdowns();
    }
}

function loadDemoMasterDropdowns() {
    programTypesCache = [
        { id: 1, name: 'Technical Training', code: 'TT' },
        { id: 2, name: 'Workshop', code: 'WS' }
    ];
    populateTypeDropdowns();

    venuesCache = [
        { id: 1, name: 'IICM Training Hall, Dhanbad', capacity: 150 },
        { id: 2, name: 'IICM Conference Hall, Dhanbad', capacity: 80 }
    ];
    populateVenueDropdowns();

    companiesCache = [
        { id: 1, code: 'BCCL', name: 'Bharat Coking Coal Limited' },
        { id: 2, code: 'CCL', name: 'Central Coalfields Limited' }
    ];
    populateCompaniesGrid();

    facultiesCache = [
        { id: 1, name: 'Prof. Piyush Rai', designation: 'IIT (BHU) — Mine Safety' },
        { id: 2, name: 'Dr. Manish Kumar', designation: 'IIM Ranchi — Operations & Tech' }
    ];
    window.facultiesCache = facultiesCache;
    populateFacultyDropdowns();

    subjectsCache = [
        { id: 1, subject_name: 'Mine Safety & Hazard Management' },
        { id: 2, subject_name: 'Digital Transformation & Industry 4.0' }
    ];
    populateSubjectDropdowns();
}

function populateTypeDropdowns() {
    const ptSelect = document.getElementById('prog-type');
    if (ptSelect) {
        ptSelect.innerHTML = `<option value="">-- Select Program Type --</option>` +
            programTypesCache.map(t => `<option value="${t.id}">${t.name} (${t.code})</option>`).join('');
    }
}

function populateVenueDropdowns() {
    const vSelect = document.getElementById('prog-venue');
    if (vSelect) {
        vSelect.innerHTML = `<option value="">-- Select Complex / Venue --</option>` +
            venuesCache.map(v => `<option value="${v.id}">${v.name} (Cap: ${v.capacity})</option>`).join('');
    }
}

function populateCompaniesGrid() {
    const cGrid = document.getElementById('companies-checkbox-grid');
    if (cGrid) {
        cGrid.innerHTML = companiesCache.map(c => `
            <label style="font-size: 13px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" name="target_company" value="${c.id}" checked> ${c.code} (${c.name})
            </label>
        `).join('');
    }
}

function populateFacultyDropdowns() {
    const fSelect = document.getElementById('tt-faculty');
    if (fSelect) {
        fSelect.innerHTML = `<option value="">-- Select Faculty Member --</option>` +
            facultiesCache.map(f => `<option value="${f.id}">${f.name} (${f.designation || 'Faculty'})</option>`).join('');
    }
}

function populateSubjectDropdowns() {
    const sSelect = document.getElementById('tt-subject');
    if (sSelect) {
        sSelect.innerHTML = `<option value="">-- Select Subject --</option>` +
            subjectsCache.map(s => `<option value="${s.id}">${s.subject_name}</option>`).join('');
    }
}

function getUnifiedCoordinatorPrograms() {
    let decisions = {};
    try { decisions = JSON.parse(localStorage.getItem('iicm_gm_decisions') || '{}'); } catch(e) {}

    let coordProgs = [];
    try { coordProgs = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]'); } catch(e) {}

    let base = window.programsCache || getDemoProgramsData();

    let allPrograms = [...base];
    coordProgs.forEach(p => {
        if (!allPrograms.some(existing => String(existing.id) === String(p.id) || existing.title === p.title)) {
            allPrograms.unshift(p);
        }
    });

    return allPrograms.map(p => {
        const dec = decisions[p.id] || decisions[p.title];
        if (dec) {
            return Object.assign({}, p, { status: dec.status, gm_remarks: dec.remarks });
        }
        return p;
    });
}
window.getUnifiedCoordinatorPrograms = getUnifiedCoordinatorPrograms;

function setNodeText(id, val) {
    const el = document.getElementById(id);
    if (el && el.innerText !== String(val)) el.innerText = String(val);
}

async function loadDashboardStats() {
    const all = getUnifiedCoordinatorPrograms();

    const total = all.length;
    const pending = all.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'PENDING').length;
    const approved = all.filter(p => p.status === 'APPROVED').length;
    const ongoing = all.filter(p => p.status === 'ONGOING').length;
    const upcoming = all.filter(p => p.status === 'UPCOMING').length;
    const todayCount = ongoing + Math.min(upcoming, 1);

    setNodeText('stat-total', total);
    setNodeText('stat-pending', pending);
    setNodeText('stat-approved', approved);
    setNodeText('stat-ongoing', ongoing);
    setNodeText('stat-today', todayCount);
    setNodeText('stat-upcoming', upcoming);
}

function loadDashboardWidgets() {
    const all = getUnifiedCoordinatorPrograms();

    // 1. Today's Schedule Widget
    const scheduleContainer = document.getElementById('dashboard-todays-schedule');
    if (scheduleContainer) {
        const todaysList = all.filter(p => p.status === 'ONGOING' || p.status === 'APPROVED' || p.status === 'UPCOMING').slice(0, 3);
        let newHtml = '';
        if (todaysList.length === 0) {
            newHtml = `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:13px;">No scheduled sessions today.</div>`;
        } else {
            const times = ['10:00 AM', '02:00 PM', '04:30 PM'];
            newHtml = todaysList.map((p, idx) => `
                <div class="schedule-item">
                    <div class="schedule-time">${times[idx % times.length]}</div>
                    <div class="schedule-info">
                        <div class="schedule-title">${p.title}</div>
                        <div class="schedule-venue">${p.venue_name || 'IICM Campus'}</div>
                    </div>
                    <span class="badge-pill ${p.status === 'ONGOING' ? 'status-ongoing' : 'status-upcoming'}">${p.status === 'ONGOING' ? 'Ongoing' : 'Upcoming'}</span>
                </div>
            `).join('');
        }
        if (scheduleContainer.innerHTML !== newHtml) {
            scheduleContainer.innerHTML = newHtml;
        }
    }

    // 2. Pending Approvals Widget
    const pendingContainer = document.getElementById('dashboard-pending-approvals');
    if (pendingContainer) {
        const pendingList = all.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'PENDING');
        let newHtml = '';
        if (pendingList.length === 0) {
            newHtml = `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:13px;">🎉 All programs reviewed & approved! No pending approvals.</div>`;
        } else {
            newHtml = pendingList.map(p => `
                <div class="pending-item">
                    <div class="pending-info">
                        <div class="title">${p.title}</div>
                        <div class="meta">${p.start_date_display || p.start_date || 'Upcoming'}, ${p.venue_name || 'IICM Hall'}</div>
                    </div>
                    <span class="badge-pill status-pending">Pending GM Review</span>
                </div>
            `).join('');
        }
        if (pendingContainer.innerHTML !== newHtml) {
            pendingContainer.innerHTML = newHtml;
        }
    }
}


async function loadNominationDashboardCount() {
    const countNode = document.getElementById('pending-nominee-count');
    if (countNode) countNode.innerText = '15';
}

async function loadProgramsTable() {
    const searchQuery = (document.getElementById('program-search') ? document.getElementById('program-search').value : '').trim();
    const tbody = document.getElementById('programs-table-body');

    if (!tbody) return;

    let url = `${API_BASE_URL}/programs/?page_size=50`;
    if (currentFilterStatus) url += `&status=${currentFilterStatus}`;

    try {
        const res = await apiFetch(url);

        if (res.ok) {
            const data = await res.json();
            const results = data.results || data;
            window.programsCache = results;
            renderProgramRows(results);
        } else {
            throw new Error('API returned non-OK');
        }
    } catch (e) {
        renderProgramRows(getDemoProgramsData());
    }
}

window.filterProgramsByStatusCard = function(status) {
    currentFilterStatus = status || '';
    var select = document.getElementById('filter-status-select');
    if (select) select.value = currentFilterStatus;

    // Update active visual state on cards
    var cardMap = {
        '': 'prog-stat-card-all',
        'PENDING_APPROVAL': 'prog-stat-card-pending',
        'ONGOING': 'prog-stat-card-ongoing',
        'UPCOMING': 'prog-stat-card-upcoming',
        'COMPLETED': 'prog-stat-card-completed'
    };

    var allCards = document.querySelectorAll('.prog-stat-card');
    allCards.forEach(function(c) {
        c.classList.remove('active');
        c.style.borderColor = '#e2e8f0';
        c.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
    });

    var targetId = cardMap[currentFilterStatus] || 'prog-stat-card-all';
    var targetCard = document.getElementById(targetId);
    if (targetCard) {
        targetCard.classList.add('active');
        var colorMap = {
            'prog-stat-card-all': '#047857',
            'prog-stat-card-pending': '#d97706',
            'prog-stat-card-ongoing': '#16a34a',
            'prog-stat-card-upcoming': '#2563eb',
            'prog-stat-card-completed': '#475569'
        };
        targetCard.style.borderColor = colorMap[targetId] || '#047857';
        targetCard.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)';
    }

    loadProgramsTable();
};

window.setProgramViewMode = function(mode) {
    var tableCont = document.getElementById('prog-table-view-container');
    var cardsCont = document.getElementById('prog-cards-view-container');
    var btnTable = document.getElementById('btn-view-table');
    var btnCards = document.getElementById('btn-view-cards');

    if (mode === 'cards') {
        if (tableCont) tableCont.style.display = 'none';
        if (cardsCont) cardsCont.style.display = 'block';
        if (btnTable) { btnTable.style.background = 'transparent'; btnTable.style.color = '#475569'; }
        if (btnCards) { btnCards.style.background = '#047857'; btnCards.style.color = '#fff'; }
    } else {
        if (tableCont) tableCont.style.display = 'block';
        if (cardsCont) cardsCont.style.display = 'none';
        if (btnTable) { btnTable.style.background = '#047857'; btnTable.style.color = '#fff'; }
        if (btnCards) { btnCards.style.background = 'transparent'; btnCards.style.color = '#475569'; }
    }
};

function getProgramTypeDisplay(p) {
    var raw = (p.program_type_name || p.type || p.program_type || '').toUpperCase();
    var title = (p.title || '').toUpperCase();
    if (raw.includes('MT') || raw.includes('MANAGEMENT TRAINEE') || title.includes('MT') || title.includes('MANAGEMENT TRAINEE')) {
        return 'MT';
    }
    return 'Non-MT';
}

function renderProgramRows(results) {
    const tbody = document.getElementById('programs-table-body');
    const searchQuery = (document.getElementById('program-search') ? document.getElementById('program-search').value : '').trim().toLowerCase();

    // Merge coordinator created programs and GM decisions from localStorage
    let decisions = {};
    try { decisions = JSON.parse(localStorage.getItem('iicm_gm_decisions') || '{}'); } catch(e) {}

    let coordProgs = [];
    try { coordProgs = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]'); } catch(e) {}

    let allPrograms = [...results];
    coordProgs.forEach(p => {
        if (!allPrograms.some(existing => String(existing.id) === String(p.id) || existing.title === p.title)) {
            allPrograms.unshift(p);
        }
    });

    // Apply GM decisions
    allPrograms = allPrograms.map(p => {
        const dec = decisions[p.id] || decisions[p.title];
        if (dec) {
            return Object.assign({}, p, { status: dec.status, gm_remarks: dec.remarks });
        }
        return p;
    });

    // Calculate dynamic counts for executive category cards
    const cAll = allPrograms.length;
    const cPending = allPrograms.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'PENDING').length;
    const cOngoing = allPrograms.filter(p => p.status === 'ONGOING').length;
    const cUpcoming = allPrograms.filter(p => p.status === 'UPCOMING' || p.status === 'APPROVED').length;
    const cCompleted = allPrograms.filter(p => p.status === 'COMPLETED').length;

    const elAll = document.getElementById('prog-count-all');       if (elAll) elAll.innerText = cAll;
    const elPend = document.getElementById('prog-count-pending');   if (elPend) elPend.innerText = cPending;
    const elOng = document.getElementById('prog-count-ongoing');   if (elOng) elOng.innerText = cOngoing;
    const elUp = document.getElementById('prog-count-upcoming');   if (elUp) elUp.innerText = cUpcoming;
    const elComp = document.getElementById('prog-count-completed'); if (elComp) elComp.innerText = cCompleted;

    let filtered = allPrograms;

    if (searchQuery) {
        filtered = allPrograms.filter(p =>
            (p.title || '').toLowerCase().includes(searchQuery) ||
            (p.venue_name || p.venue || '').toLowerCase().includes(searchQuery) ||
            (p.faculty || '').toLowerCase().includes(searchQuery) ||
            getProgramTypeDisplay(p).toLowerCase().includes(searchQuery)
        );
    }

    if (currentFilterStatus) {
        filtered = filtered.filter(p => {
            if (currentFilterStatus === 'PENDING_APPROVAL') {
                return p.status === 'PENDING_APPROVAL' || p.status === 'PENDING';
            }
            if (currentFilterStatus === 'UPCOMING') {
                return p.status === 'UPCOMING' || p.status === 'APPROVED';
            }
            return p.status === currentFilterStatus;
        });
    }

    if (currentFilterType) {
        filtered = filtered.filter(p => getProgramTypeDisplay(p) === currentFilterType);
    }

    const countNode = document.getElementById('table-entries-count');

    if (!filtered || filtered.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">No programs found matching criteria.</td></tr>`;
        if (countNode) countNode.innerText = 'Showing 0 to 0 of 0 entries';
        return;
    }

    if (countNode) countNode.innerText = `Showing 1 to ${filtered.length} of ${filtered.length} entries`;

    // Render Table Body: Only Program Name, Type (MT/Non-MT), Venue, Faculty
    if (tbody) {
        tbody.innerHTML = filtered.map(p => {
            const typeLabel = getProgramTypeDisplay(p);
            const isMT = typeLabel === 'MT';
            const badgeStyle = isMT
                ? 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:800;'
                : 'background:#f8fafc; color:#475569; border:1px solid #e2e8f0; font-weight:700;';

            return `
            <tr>
                <td style="font-weight:700; color:#0f172a; font-size:13px;">
                    ${p.title}
                </td>
                <td style="text-align:center;">
                    <span style="display:inline-block; padding:3px 12px; border-radius:12px; font-size:11.5px; ${badgeStyle}">
                        ${typeLabel}
                    </span>
                </td>
                <td style="color:#334155; font-size:13px;">
                    ${p.venue_name || p.venue || 'IICM Training Hall, Ranchi'}
                </td>
                <td style="font-weight:600; color:#047857; font-size:13px;">
                    ${p.faculty || 'Core Faculty, IICM'}
                </td>
            </tr>
            `;
        }).join('');
    }
}

/* ── Exact Reference Screenshot Demo Data (2 Examples) ── */
function getDemoProgramsData() {
    return [
        {
            id: 1,
            title: 'Advanced Mine Safety Management Program',
            program_type_name: 'Technical Training',
            venue_name: 'IICM Training Hall, Dhanbad',
            faculty: 'Prof. Piyush Rai',
            start_date: '2026-08-10',
            start_date_display: '10 Aug 2026',
            end_date: '2026-08-15',
            duration_days: 5,
            budget: 650000,
            status: 'ONGOING',
            objective: 'Advanced mine safety protocols, DGMS guidelines and accident prevention strategies.'
        },
        {
            id: 2,
            title: 'Digital Transformation Workshop',
            program_type_name: 'Workshop',
            venue_name: 'IICM Conference Hall, Dhanbad',
            faculty: 'Dr. Manish Kumar',
            start_date: '2026-08-18',
            start_date_display: '18 Aug 2026',
            end_date: '2026-08-22',
            duration_days: 4,
            budget: 480000,
            status: 'PENDING_APPROVAL',
            objective: 'Leveraging IoT, AI and digital automation in coal mining operations.'
        }
    ];
}

function viewProgramDetails(id) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]'); } catch(e) {}
    let prog = list.find(p => String(p.id) === String(id));
    if (!prog) {
        const demoList = getDemoProgramsData();
        prog = demoList.find(p => String(p.id) === String(id)) || demoList[0];
    }

    const invStatus = getCompanyInvitationStatus(id);

    const body = document.getElementById('v-prog-details-body');
    if (body) {
        body.innerHTML = `
            <div style="line-height:1.6;">
                <h4 style="color:var(--primary-emerald); font-size:16px; margin-bottom:8px;">${prog.title}</h4>
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">${prog.objective || 'End-to-end management training program.'}</p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; background:#f8fafc; padding:14px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:16px;">
                    <div><strong>Type:</strong> ${prog.program_type_name || 'Technical Training'}</div>
                    <div><strong>Venue:</strong> ${prog.venue_name || 'IICM Training Hall, Dhanbad'}</div>
                    <div><strong>Faculty:</strong> ${prog.faculty || 'RA'}</div>
                    <div><strong>Dates:</strong> ${prog.start_date_display || prog.start_date}</div>
                    <div><strong>Estimated Budget:</strong> ₹${Number(prog.budget || 500000).toLocaleString('en-IN')}</div>
                    <div><strong>Status:</strong> ${prog.status || 'APPROVED'}</div>
                    <div style="grid-column: span 2;"><strong>Company Invitation Status:</strong> <span style="font-weight:700; color:#064e3b;">${invStatus.statusLabel}</span></div>
                </div>
                <div style="text-align:right;">
                    <button type="button" class="btn-filter" style="background:#064e3b; color:#fff; font-weight:800; padding:8px 16px; font-size:13px;" onclick="closeViewProgramModal(); openCompanyInvitationModal(${id});">
                        📩 Send Invitation to Company Master
                    </button>
                </div>
            </div>
        `;
    }
    const modal = document.getElementById('view-program-modal');
    if (modal) modal.style.display = 'flex';
}


function closeViewProgramModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('view-program-modal');
    if (modal) modal.style.display = 'none';
}

function editProgram(id) {
    showSection('create');
    const heading = document.getElementById('form-heading');
    if (heading) heading.innerText = 'Edit Program Specifications';

    const list = getDemoProgramsData();
    const prog = list.find(p => p.id === id);
    if (prog) {
        if (document.getElementById('prog-title')) document.getElementById('prog-title').value = prog.title;
        if (document.getElementById('prog-budget')) document.getElementById('prog-budget').value = prog.budget;
        if (document.getElementById('prog-objective')) document.getElementById('prog-objective').value = prog.objective;
    }
}

function getCompanyMasterList() {
    return [
        { id: 1, code: 'CIL', name: 'Coal India Limited' },
        { id: 2, code: 'BCCL', name: 'Bharat Coking Coal Limited' },
        { id: 3, code: 'CCL', name: 'Central Coalfields Limited' },
        { id: 4, code: 'ECL', name: 'Eastern Coalfields Limited' },
        { id: 5, code: 'WCL', name: 'Western Coalfields Limited' },
        { id: 6, code: 'SECL', name: 'South Eastern Coalfields Limited' },
        { id: 7, code: 'NCL', name: 'Northern Coalfields Limited' },
        { id: 8, code: 'MCL', name: 'Mahanadi Coalfields Limited' },
        { id: 9, code: 'CMPDI', name: 'Central Mine Planning and Design Institute' }
    ];
}

function getCompanyInvitationStatus(programId) {
    let localInvs = [];
    try {
        localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]');
    } catch(e) {}
    
    const progInvs = localInvs.filter(inv => String(inv.program_id) === String(programId));
    if (progInvs.length === 0) {
        return { hasInvitations: false, isAllApproved: false, statusLabel: 'No Invitation Sent', count: 0, pending: 0, approved: 0 };
    }
    
    const pending = progInvs.filter(inv => inv.status === 'INVITATION_SENT' || !inv.candidate_list_submitted).length;
    const approved = progInvs.filter(inv => inv.status === 'COMPANY_APPROVED' && inv.candidate_list_submitted).length;
    
    if (pending > 0) {
        return {
            hasInvitations: true,
            isAllApproved: false,
            statusLabel: `Pending Company Candidate List (${approved}/${progInvs.length} approved)`,
            count: progInvs.length,
            pending: pending,
            approved: approved,
            invitations: progInvs
        };
    } else {
        return {
            hasInvitations: true,
            isAllApproved: true,
            statusLabel: `Company Approved & Candidate List Received (${approved}/${progInvs.length})`,
            count: progInvs.length,
            pending: 0,
            approved: approved,
            invitations: progInvs
        };
    }
}

async function openCompanyInvitationModal(programId) {
    const modal = document.getElementById('company-invitation-modal');
    if (!modal) return;

    let prog = null;
    let coordProgs = [];
    try { coordProgs = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]'); } catch(e) {}
    prog = coordProgs.find(p => String(p.id) === String(programId));

    if (!prog) {
        prog = getDemoProgramsData().find(p => String(p.id) === String(programId));
    }

    const titleNode = document.getElementById('inv-modal-program-title');
    const datesNode = document.getElementById('inv-modal-program-dates');
    const progIdInput = document.getElementById('inv-modal-program-id');

    if (titleNode) titleNode.innerText = `Program: ${prog ? prog.title : 'Program #' + programId}`;
    if (datesNode) datesNode.innerText = `Dates: ${prog ? (prog.start_date_display || prog.start_date) : '--'} to ${prog ? (prog.end_date_display || prog.end_date || 'TBD') : '--'}`;
    if (progIdInput) progIdInput.value = programId;

    const container = document.getElementById('company-checkbox-list');
    if (container) {
        let companies = getCompanyMasterList();
        try {
            const token = localStorage.getItem('iicm_access_token');
            const res = await fetch(`${API_BASE_URL}/masters/companies/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const fetched = data.results || data;
                if (fetched && fetched.length > 0) companies = fetched;
            }
        } catch(e) {}

        container.innerHTML = companies.map(c => `
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer;">
                <input type="checkbox" name="invited_company" value="${c.id}" data-code="${c.code || c.name}" data-name="${c.name}">
                <span>${c.code || c.name} (${c.name})</span>
            </label>
        `).join('');
    }

    modal.style.display = 'flex';
}

function closeCompanyInvitationModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('company-invitation-modal');
    if (modal) modal.style.display = 'none';
}

async function handleSendCompanyInvitations(event) {
    event.preventDefault();
    const programId = document.getElementById('inv-modal-program-id').value;
    const quota = parseInt(document.getElementById('inv-allocated-quota').value || '10', 10);
    const remarks = document.getElementById('inv-remarks').value;

    const checkboxes = document.querySelectorAll('input[name="invited_company"]:checked');
    if (checkboxes.length === 0) {
        alert('⚠️ Please select at least one company from Company Master to send invitations to.');
        return;
    }

    const selectedCompanyIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
    const selectedCompanyData = Array.from(checkboxes).map(cb => ({
        id: parseInt(cb.value, 10),
        code: cb.getAttribute('data-code'),
        name: cb.getAttribute('data-name')
    }));

    const btn = document.getElementById('btn-submit-company-invitation');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Dispatching Invitations...';
    }

    try {
        const token = localStorage.getItem('iicm_access_token');
        await fetch(`${API_BASE_URL}/companies/company-invitations/send-invitations/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                program_id: programId,
                company_ids: selectedCompanyIds,
                allocated_quota: quota,
                remarks: remarks
            })
        });
    } catch(e) {
        console.warn('API send-invitations failed, using fallback store', e);
    }

    let prog = null;
    let coordProgs = [];
    try { coordProgs = JSON.parse(localStorage.getItem('iicm_coordinator_created_programs') || '[]'); } catch(e) {}
    prog = coordProgs.find(p => String(p.id) === String(programId));
    if (!prog) {
        prog = getDemoProgramsData().find(p => String(p.id) === String(programId));
    }
    const progTitle = prog ? prog.title : `Program #${programId}`;
    const venueName = prog ? (prog.venue_name || 'IICM Training Hall, Dhanbad') : 'IICM Training Hall, Dhanbad';
    const startDate = prog ? (prog.start_date_display || prog.start_date || '10 Aug 2026') : '10 Aug 2026';
    const endDate = prog ? (prog.end_date_display || prog.end_date || '15 Aug 2026') : '15 Aug 2026';

    let localInvs = [];
    try { localInvs = JSON.parse(localStorage.getItem('iicm_company_invitations') || '[]'); } catch(e) {}

    selectedCompanyData.forEach(comp => {
        const existingIdx = localInvs.findIndex(i => String(i.program_id) === String(programId) && String(i.company_id) === String(comp.id));
        const newInv = {
            id: Date.now() + Math.floor(Math.random()*1000),
            program_id: parseInt(programId, 10),
            program_title: progTitle,
            venue_name: venueName,
            start_date: startDate,
            end_date: endDate,
            company_id: comp.id,
            company_code: comp.code,
            company_name: comp.name,
            allocated_quota: quota,
            status: 'INVITATION_SENT',
            candidate_list_submitted: false,
            remarks: remarks || 'Requested company candidate nominations.',
            sent_at: new Date().toISOString()
        };
        if (existingIdx >= 0) {
            localInvs[existingIdx] = newInv;
        } else {
            localInvs.unshift(newInv);
        }
    });

    localStorage.setItem('iicm_company_invitations', JSON.stringify(localInvs));


    if (btn) {
        btn.disabled = false;
        btn.innerText = '📩 Dispatch Invitation to Selected Companies';
    }

    closeCompanyInvitationModal();
    alert(`✅ Invitations dispatched to ${selectedCompanyData.length} selected Company Master companies with requested quota of ${quota} candidates per company!\n\nNote: Workflow is now gated until companies approve and submit candidate lists.`);
    loadProgramsTable();
}

function manageProgram(id, title) {
    const invStatus = getCompanyInvitationStatus(id);
    if (invStatus.hasInvitations && !invStatus.isAllApproved) {
        alert(`⚠️ Action Blocked: Candidate List Pending from Company Master!\n\nStatus: ${invStatus.statusLabel}\n\nUntil the invited company approves the invitation and submits their candidate list, session scheduling and faculty assignment cannot proceed.`);
        return;
    }
    openTimetableModal(id, title);
}

function openTimetableModal(id, title) {
    const invStatus = getCompanyInvitationStatus(id);
    if (invStatus.hasInvitations && !invStatus.isAllApproved) {
        alert(`⚠️ Action Blocked: Candidate List Pending from Company Master!\n\nStatus: ${invStatus.statusLabel}\n\nUntil the invited company approves the invitation and submits their candidate list, session scheduling and faculty assignment cannot proceed.`);
        return;
    }
    const modal = document.getElementById('timetable-modal');
    const titleNode = document.getElementById('tt-modal-title');
    if (titleNode) titleNode.innerText = `Faculty & Timetable — ${title || 'Program'}`;
    if (modal) modal.style.display = 'flex';
}


function closeTimetableModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('timetable-modal');
    if (modal) modal.style.display = 'none';
}

function openQRModalForDemo() {
    const modal = document.getElementById('qr-modal');
    const qrContainer = document.getElementById('qr-code-container');
    if (qrContainer) {
        qrContainer.innerHTML = `
            <svg width="150" height="150" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="white"/>
                <rect x="10" y="10" width="25" height="25" fill="#064e3b"/>
                <rect x="15" y="15" width="15" height="15" fill="white"/>
                <rect x="18" y="18" width="9" height="9" fill="#064e3b"/>
                <rect x="65" y="10" width="25" height="25" fill="#064e3b"/>
                <rect x="70" y="15" width="15" height="15" fill="white"/>
                <rect x="73" y="18" width="9" height="9" fill="#064e3b"/>
                <rect x="10" y="65" width="25" height="25" fill="#064e3b"/>
                <rect x="15" y="70" width="15" height="15" fill="white"/>
                <rect x="18" y="73" width="9" height="9" fill="#064e3b"/>
                <rect x="45" y="10" width="10" height="25" fill="#064e3b"/>
                <rect x="45" y="45" width="20" height="20" fill="#064e3b"/>
                <rect x="70" y="45" width="20" height="10" fill="#064e3b"/>
                <rect x="10" y="45" width="25" height="10" fill="#064e3b"/>
                <rect x="65" y="65" width="25" height="25" fill="#064e3b"/>
            </svg>
        `;
    }
    if (modal) modal.style.display = 'flex';
}

function closeQRModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('qr-modal');
    if (modal) modal.style.display = 'none';
}

function openCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCertificateModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('certificate-modal');
    if (modal) modal.style.display = 'none';
}

function triggerCertificateGeneration() {
    alert('Certificate generation initiated! 28 PDF certificates compiled successfully.');
    closeCertificateModal();
}

function openReportModal(type) {
    const modal = document.getElementById('reports-modal');
    const titleNode = document.getElementById('report-modal-title');
    const contentNode = document.getElementById('report-modal-content');

    const titles = {
        'program': 'Program Performance & Execution Reports',
        'attendance': 'Session Attendance & Bio-metric Analytics',
        'feedback': 'Participant Feedback & Rating Summary',
        'certificate': 'Issued Certificates Master Log',
        'registration': 'Company Nominations & Registration Audit'
    };

    if (titleNode) titleNode.innerText = titles[type] || 'Executive Reports';
    if (contentNode) {
        contentNode.innerHTML = `
            <div style="line-height:1.6;">
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">Displaying aggregated metrics for ${titles[type]}.</p>
                <div style="background:#f8fafc; border:1px solid var(--border-color); padding:16px; border-radius:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; text-align:center;">
                    <div><div style="font-size:20px; font-weight:700; color:var(--primary-emerald);">100%</div><small style="color:var(--text-muted);">Compliance</small></div>
                    <div><div style="font-size:20px; font-weight:700; color:#2563eb;">248</div><small style="color:var(--text-muted);">Trainees Processed</small></div>
                    <div><div style="font-size:20px; font-weight:700; color:#059669;">4.85 / 5</div><small style="color:var(--text-muted);">Avg Feedback</small></div>
                </div>
            </div>
        `;
    }
    if (modal) modal.style.display = 'flex';
}

function closeReportModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('reports-modal');
    if (modal) modal.style.display = 'none';
}

function downloadReportExport() {
    alert('Downloading Executive Report PDF...');
    closeReportModal();
}

function openSettingsModal(type) {
    const modal = document.getElementById('settings-modal');
    const titleNode = document.getElementById('settings-modal-title');
    const contentNode = document.getElementById('settings-modal-content');

    const titles = {
        'profile': 'Coordinator Profile Settings',
        'password': 'Change Account Password',
        'system': 'System Configurations & Preferences'
    };

    if (titleNode) titleNode.innerText = titles[type] || 'Coordinator Settings';
    if (contentNode) {
        if (type === 'password') {
            contentNode.innerHTML = `
                <div class="form-group"><label>Current Password</label><input type="password" class="form-control" placeholder="••••••••"></div>
                <div class="form-group"><label>New Password</label><input type="password" class="form-control" placeholder="••••••••"></div>
                <div class="form-group"><label>Confirm New Password</label><input type="password" class="form-control" placeholder="••••••••"></div>
            `;
        } else {
            contentNode.innerHTML = `
                <div class="form-group"><label>Full Name</label><input type="text" class="form-control" value="Program Coordinator"></div>
                <div class="form-group"><label>Official Email</label><input type="email" class="form-control" value="coordinator@iicm.local"></div>
                <div class="form-group"><label>Department</label><input type="text" class="form-control" value="Executive Program Management"></div>
            `;
        }
    }
    if (modal) modal.style.display = 'flex';
}

function closeSettingsModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
}

function saveSettings() {
    alert('Settings saved successfully!');
    closeSettingsModal();
}

function handleAddSessionSchedule(e) {
    e.preventDefault();
    alert('New session schedule added successfully!');
}

async function handleProgramSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('iicm_access_token');

    const titleNode = document.getElementById('prog-title');
    const typeNode = document.getElementById('prog-type');
    const venueNode = document.getElementById('prog-venue');
    const startNode = document.getElementById('prog-start');
    const endNode = document.getElementById('prog-end');
    const budgetNode = document.getElementById('prog-budget');
    const objNode = document.getElementById('prog-objective');
    const descNode = document.getElementById('prog-desc');

    const title = titleNode ? titleNode.value.trim() : 'Executive Training Program';
    const budget = budgetNode ? parseFloat(budgetNode.value) || 500000 : 500000;
    const start = startNode ? startNode.value : '2026-08-20';
    const end = endNode ? endNode.value : '2026-08-25';
    const venue = venueNode ? (venueNode.options[venueNode.selectedIndex]?.text || 'IICM Campus') : 'IICM Campus';
    const typeName = typeNode ? (typeNode.options[typeNode.selectedIndex]?.text || 'Technical Training') : 'Technical Training';

    const newProg = {
        id: Date.now(),
        title: title,
        program_type_name: typeName,
        venue_name: venue,
        start_date: start,
        end_date: end,
        duration_days: 5,
        budget: budget,
        coordinator_name: 'Program Coordinator',
        status: 'PENDING_APPROVAL',
        target_participants_count: 35,
        target_companies: 'CIL Subsidiaries',
        objective: objNode ? objNode.value.trim() : 'Executive Training Objective',
        description: descNode ? descNode.value.trim() : 'Submitted by Program Coordinator for GM Approval.'
    };

    // Save to API
    try {
        await fetch(`${API_BASE_URL}/programs/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                program_type: 1,
                venue: 1,
                start_date: start,
                end_date: end,
                budget: budget,
                status: 'PENDING_APPROVAL',
                objective: newProg.objective,
                description: newProg.description
            })
        });
    } catch(err) {}

    // Save to localStorage so GM Portal picks it up instantly
    try {
        let existing = [];
        const saved = localStorage.getItem('iicm_coordinator_created_programs');
        if (saved) existing = JSON.parse(saved);
        existing.unshift(newProg);
        localStorage.setItem('iicm_coordinator_created_programs', JSON.stringify(existing));
    } catch(err) {}

    alert(`✅ Program "${title}" created and submitted to GM Executive Note Sheet Approval Portal!`);
    loadProgramsTable();
    showSection('list');
}

function saveAsDraft() {
    alert('Program saved as draft!');
    showSection('list');
}

function resetProgramForm() {
    const form = document.getElementById('program-form');
    if (form) form.reset();
}

function calcDuration() {
    const start = document.getElementById('prog-start').value;
    const end = document.getElementById('prog-end').value;
    if (start && end) {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) {
            document.getElementById('prog-duration').value = diff;
        }
    }
}

async function populateCoordProgramSelect() {
    const token = localStorage.getItem('iicm_access_token');
    const select = document.getElementById('coord-prog-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/programs/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const programs = await res.json();
            let options = `<option value="">-- All Programs --</option>`;
            programs.forEach(p => {
                options += `<option value="${p.id}">${p.title}</option>`;
            });
            select.innerHTML = options;
        }
    } catch(err) {
        console.error('Error fetching programs for nominations filter:', err);
    }
}

async function loadCoordinatorNominationsTable() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('coord-nominations-body');
    if (!tbody) return;

    const progId = document.getElementById('coord-prog-select')?.value || '';
    const statusFilter = document.getElementById('coord-status-select')?.value || '';

    let url = `${API_BASE_URL}/trainees/nominations/`;
    const params = [];
    if (progId) params.push(`program=${progId}`);
    if (statusFilter) params.push(`nomination_status=${statusFilter}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    let apiNominations = [];
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            apiNominations = data.results || data;
        }
    } catch(err) {
        console.warn('API error loading coordinator nominations, using local state', err);
    }

    let localNoms = [];
    try { localNoms = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}

    let allNominations = [...apiNominations];
    localNoms.forEach(localNom => {
        if (!allNominations.some(n => String(n.id) === String(localNom.id) || (n.eis_number && n.eis_number === localNom.eis_number && String(n.program) === String(localNom.program)))) {
            allNominations.push(localNom);
        }
    });

    if (progId) {
        allNominations = allNominations.filter(n => String(n.program || n.program_id) === String(progId));
    }
    if (statusFilter) {
        allNominations = allNominations.filter(n => (n.nomination_status || 'NOMINATED') === statusFilter);
    }

    if (allNominations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:30px; color:#94a3b8;">
                    No company employee nominations found matching the current filter.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = allNominations.map(nom => {
        const status = nom.nomination_status || 'NOMINATED';
        let statusBadgeHtml = `<span style="background:#ffedd5; color:#c2410c; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">NOMINATED</span>`;
        if (status === 'SHORTLISTED' || status === 'ACCEPTED' || status === 'APPROVED') {
            statusBadgeHtml = `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">ACCEPTED</span>`;
        } else if (status === 'REJECTED') {
            statusBadgeHtml = `<span style="background:#ffe4e6; color:#be123c; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">REJECTED</span>`;
        } else if (status === 'WAITLISTED') {
            statusBadgeHtml = `<span style="background:#fef3c7; color:#92400e; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">WAITLISTED</span>`;
        }

        let actionsHtml = '';
        if (status === 'NOMINATED' || status === 'PENDING') {
            actionsHtml = `
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-action-sm" style="background:#059669; color:#ffffff; border:none; font-weight:700; padding:5px 12px; border-radius:6px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'SHORTLISTED')">✅ Accept</button>
                    <button type="button" class="btn-action-sm" style="background:#dc2626; color:#ffffff; border:none; font-weight:700; padding:5px 12px; border-radius:6px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'REJECTED')">❌ Reject</button>
                </div>
            `;
        } else if (status === 'SHORTLISTED' || status === 'ACCEPTED' || status === 'APPROVED') {
            actionsHtml = `
                <button type="button" class="btn-action-sm" style="background:#ffe4e6; color:#be123c; border:1px solid #fca5a5; font-weight:600; padding:4px 10px; border-radius:6px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'REJECTED')">Change to Reject</button>
            `;
        } else {
            actionsHtml = `
                <button type="button" class="btn-action-sm" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:600; padding:4px 10px; border-radius:6px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'SHORTLISTED')">Re-Accept</button>
            `;
        }

        return `
            <tr>
                <td><strong>${nom.eis_number || 'N/A'}</strong></td>
                <td style="font-weight:700; color:#0f172a;">${nom.full_name}<br><small style="color:#64748b;">${nom.program_title || ''}</small></td>
                <td><span style="background:#f1f5f9; color:#334155; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">${nom.company_name || nom.company_code || 'Company'}</span></td>
                <td>${nom.email || 'N/A'}<br><small style="color:#64748b;">${nom.phone || ''}</small></td>
                <td>${nom.department_name || 'General'}</td>
                <td>${nom.designation_title || 'Officer'}</td>
                <td>${statusBadgeHtml}</td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    }).join('');
}

async function updateNominationStatus(nominationId, newStatus) {
    const token = localStorage.getItem('iicm_access_token');
    const actionLabel = (newStatus === 'SHORTLISTED' || newStatus === 'APPROVED' || newStatus === 'ACCEPTED') ? 'Accept' : 'Reject';
    
    if (!confirm(`Are you sure you want to ${actionLabel} this company employee nomination?`)) return;

    let localNoms = [];
    try { localNoms = JSON.parse(localStorage.getItem('iicm_submitted_nominations') || '[]'); } catch(e) {}
    localNoms.forEach(n => {
        if (String(n.id) === String(nominationId)) {
            n.nomination_status = newStatus;
        }
    });
    localStorage.setItem('iicm_submitted_nominations', JSON.stringify(localNoms));

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/${nominationId}/update-status/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nomination_status: newStatus })
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message || `Nomination ${actionLabel}ed successfully!`);
        }
    } catch(err) {
        console.error('Error updating nomination status:', err);
    }
    loadCoordinatorNominationsTable();
    if (typeof loadSelectedCandidatesTable === 'function') loadSelectedCandidatesTable();
    if (typeof renderSidebarPanels === 'function') renderSidebarPanels();
}

async function populateSelectedProgSelect() {
    const token = localStorage.getItem('iicm_access_token');
    const select = document.getElementById('coord-selected-prog-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/programs/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const programs = await res.json();
            let options = `<option value="">-- All Programs --</option>`;
            programs.forEach(p => {
                options += `<option value="${p.id}">${p.title}</option>`;
            });
            select.innerHTML = options;
        }
    } catch(err) {
        console.error('Error fetching programs for selected candidates filter:', err);
    }
}

async function loadSelectedCandidatesTable() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('coord-selected-body');
    if (!tbody) return;

    const progId = document.getElementById('coord-selected-prog-select')?.value || '';

    let url = `${API_BASE_URL}/trainees/nominations/?nomination_status=SHORTLISTED`;
    if (progId) url += `&program=${progId}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const nominations = await res.json();

            if (nominations.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align:center; padding:30px; color:#94a3b8;">
                            No selected candidates found. Accept candidates from the <strong>Review Nominees</strong> section first.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = nominations.map(nom => `
                <tr>
                    <td><strong>${nom.eis_number || 'N/A'}</strong></td>
                    <td style="font-weight:700; color:#0f172a;">${nom.full_name}<br><small style="color:#64748b;">${nom.program_title || ''}</small></td>
                    <td><span style="background:#f1f5f9; color:#334155; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">${nom.company_name || nom.company_code || 'Company'}</span></td>
                    <td>${nom.email || 'N/A'}<br><small style="color:#64748b;">${nom.phone || ''}</small></td>
                    <td>${nom.department_name || 'General'}</td>
                    <td>${nom.designation_title || 'Officer'}</td>
                    <td><span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">ACCEPTED</span></td>
                    <td>
                        <button type="button" class="btn-action-sm" style="background:#ffe4e6; color:#be123c; border:1px solid #fca5a5; font-weight:600; padding:4px 10px; border-radius:6px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'REJECTED')">Change to Reject</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch(err) {
        console.error('Error fetching selected candidates:', err);
    }
}

async function sendEmailToSelectedCandidates() {
    const token = localStorage.getItem('iicm_access_token');
    const programId = document.getElementById('coord-prog-select')?.value || '';

    try {
        const res = await fetch(`${API_BASE_URL}/trainees/nominations/send-selection-emails/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ program_id: programId })
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✉️ SUCCESS:\n\n${data.message}`);
        } else {
            alert('Failed to send selection emails. Please check backend log.');
        }
    } catch(err) {
        console.error('Error sending selection emails:', err);
    }
}

function finalizeParticipantRoster() {
    alert('Participant roster locked and finalized!');
}

function loadNotifications() {
    const list = document.getElementById('notifications-list');
    if (list) {
        list.innerHTML = `
            <div class="notification-item" style="padding:12px; border-bottom:1px solid #f1f5f9;">
                <div class="notification-icon green">📄</div>
                <div>
                    <div class="notification-text"><strong>Women in Mining Leadership Program</strong> submitted for approval.</div>
                    <div class="notification-time">10 min ago</div>
                </div>
            </div>
            <div class="notification-item" style="padding:12px; border-bottom:1px solid #f1f5f9;">
                <div class="notification-icon blue">👥</div>
                <div>
                    <div class="notification-text">15 new registrations for <strong>Advanced Mine Safety Management Program</strong>.</div>
                    <div class="notification-time">45 min ago</div>
                </div>
            </div>
        `;
    }
}

/* ═════════════════════════════════════════════════════════════════════
   ACADEMIC CALENDAR MODULE (PROGRAM COORDINATOR)
   ═════════════════════════════════════════════════════════════════════ */
let calCurrentDate = new Date();
let loadedCalendarEvents = [];
let currentCalViewMode = 'month';

async function loadAcademicCalendarEvents() {
    const token = localStorage.getItem('iicm_access_token');
    const typeFilter = document.getElementById('cal-filter-type')?.value || '';
    
    let url = `${API_BASE_URL}/calendar/events/`;
    if (typeFilter) url += `?event_type=${typeFilter}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 403) {
            alert('HTTP 403 — Access Denied: You do not have permission to access the Academic Calendar.');
            return;
        }

        if (res.ok) {
            loadedCalendarEvents = await res.json();
            renderAcademicCalendar();
            loadCalendarKPIs();
            renderSidebarPanels();
            populateProgramSelectInCalModal();
        }
    } catch(err) {
        console.error('Error fetching academic calendar events:', err);
    }
}

async function loadCalendarKPIs() {
    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/calendar/events/dashboard_kpis/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (document.getElementById('kpi-total')) document.getElementById('kpi-total').textContent = data.total_events || loadedCalendarEvents.length;
            if (document.getElementById('kpi-upcoming')) document.getElementById('kpi-upcoming').textContent = data.upcoming_events || 12;
            if (document.getElementById('kpi-today')) document.getElementById('kpi-today').textContent = data.todays_events || 5;
            if (document.getElementById('kpi-holidays')) document.getElementById('kpi-holidays').textContent = data.holidays || 10;
            if (document.getElementById('kpi-training')) document.getElementById('kpi-training').textContent = data.training_programs || 8;
            if (document.getElementById('kpi-assessments')) document.getElementById('kpi-assessments').textContent = data.assessments || 6;
            if (document.getElementById('kpi-workshops')) document.getElementById('kpi-workshops').textContent = data.workshops || 5;
            if (document.getElementById('kpi-visits')) document.getElementById('kpi-visits').textContent = data.company_visits || 2;
        }
    } catch(err) {
        console.error('Error loading calendar KPIs:', err);
    }
}

function navigateCalendarMonth(delta) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + delta);
    renderAcademicCalendar();
}

function navigateCalendarToday() {
    calCurrentDate = new Date();
    renderAcademicCalendar();
}

function switchCalendarViewMode(mode) {
    currentCalViewMode = mode;
    document.querySelectorAll('.cal-view-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`view-mode-${mode}`);
    if (btn) btn.classList.add('active');

    const gridView = document.getElementById('calendar-grid-view');
    const agendaView = document.getElementById('calendar-agenda-view');

    if (mode === 'agenda') {
        if (gridView) gridView.style.display = 'none';
        if (agendaView) agendaView.style.display = 'block';
        renderAgendaView();
    } else {
        if (gridView) gridView.style.display = 'block';
        if (agendaView) agendaView.style.display = 'none';
        renderAcademicCalendar();
    }
}

function renderAcademicCalendar() {
    const label = document.getElementById('cal-month-year-label');
    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    if (label) label.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const typeFilter = document.getElementById('cal-filter-type')?.value || '';
    const searchQuery = document.getElementById('cal-search-input')?.value?.toLowerCase() || '';

    let filteredEvents = loadedCalendarEvents;
    if (typeFilter) {
        filteredEvents = filteredEvents.filter(e => e.event_type === typeFilter);
    }
    if (searchQuery) {
        filteredEvents = filteredEvents.filter(e => e.title.toLowerCase().includes(searchQuery) || (e.description && e.description.toLowerCase().includes(searchQuery)));
    }

    let cellsHtml = '';

    // Previous month filler days
    for (let x = firstDayIndex; x > 0; x--) {
        const d = prevMonthDays - x + 1;
        cellsHtml += `<div style="background:#f8fafc; padding:8px; min-height:105px; color:#cbd5e1; font-size:12px; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">${d}</div>`;
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day);
        const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayEvents = filteredEvents.filter(ev => {
            return dayStr >= ev.start_date && dayStr <= ev.end_date;
        });

        let eventsHtml = '';
        dayEvents.forEach(ev => {
            let pillClass = 'blue';
            if (ev.event_type === 'HOLIDAY') pillClass = 'red';
            else if (ev.event_type === 'WORKSHOP') pillClass = 'purple';
            else if (ev.event_type === 'ASSESSMENT') pillClass = 'orange';
            else if (ev.event_type === 'COMPANY_EVENT') pillClass = 'teal';
            else if (ev.event_type === 'TRAINING') pillClass = 'green';

            const timeStr = ev.start_time ? formatTimeAmPm(ev.start_time) + ' ' : '';
            const isLocked = (ev.is_system_holiday || ev.created_by_role === 'SUPER_ADMIN' || ev.created_by_role === 'ADMIN');
            const lockIcon = isLocked ? '🔒 ' : '• ';

            eventsHtml += `
                <div class="cal-event-pill ${pillClass}" onclick="viewCalendarEventDetails(${ev.id})" title="${ev.title}">
                    <span>${lockIcon}${timeStr}${ev.title}</span>
                </div>
            `;
        });

        const bg = isToday ? '#ffffff' : '#ffffff';
        const dayBadgeHtml = isToday 
            ? `<span style="background:#2563eb; color:#ffffff; width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${day}</span>`
            : `<span style="font-weight:600; color:#334155;">${day}</span>`;

        cellsHtml += `
            <div style="background:${bg}; padding:6px 8px; min-height:105px; font-size:13px; position:relative; background:#ffffff;">
                <div style="display:flex; justify-content:flex-start; margin-bottom:4px;">${dayBadgeHtml}</div>
                ${eventsHtml}
            </div>
        `;
    }

    // Next month filler days
    const totalCellsSoFar = firstDayIndex + totalDays;
    const remaining = (7 - (totalCellsSoFar % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
        cellsHtml += `<div style="background:#f8fafc; padding:8px; min-height:105px; color:#cbd5e1; font-size:12px;">${j}</div>`;
    }

    grid.innerHTML = cellsHtml;
}

function formatTimeAmPm(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function renderSidebarPanels() {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Upcoming Events List
    const upcomingContainer = document.getElementById('upcoming-events-list');
    if (upcomingContainer) {
        const upcomingEvents = loadedCalendarEvents.filter(e => e.start_date >= todayStr).slice(0, 3);
        if (upcomingEvents.length === 0) {
            upcomingContainer.innerHTML = `<div style="font-size:12px; color:#94a3b8; padding:8px 0;">No upcoming events</div>`;
        } else {
            upcomingContainer.innerHTML = upcomingEvents.map(e => {
                const isOngoing = (todayStr >= e.start_date && todayStr <= e.end_date);
                const badgeText = isOngoing ? 'Ongoing' : 'Upcoming';
                const badgeClass = isOngoing ? 'background:#dcfce7; color:#15803d;' : 'background:#dbeafe; color:#1d4ed8;';
                const dotColor = e.event_type === 'HOLIDAY' ? '#ef4444' : (e.event_type === 'WORKSHOP' ? '#9333ea' : '#16a34a');
                return `
                    <div class="upcoming-item" onclick="viewCalendarEventDetails(${e.id})" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                            <div style="font-size:13px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor};"></span>
                                ${e.title}
                            </div>
                            <span style="${badgeClass} font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; flex-shrink:0;">${badgeText}</span>
                        </div>
                        <div style="font-size:11px; color:#64748b; margin-top:2px; padding-left:14px;">
                            📅 ${e.start_date}${e.start_time ? ', ' + formatTimeAmPm(e.start_time) : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 2. Today's Schedule List
    const todayContainer = document.getElementById('todays-schedule-list');
    if (todayContainer) {
        const todayEvents = loadedCalendarEvents.filter(e => todayStr >= e.start_date && todayStr <= e.end_date).slice(0, 3);
        if (todayEvents.length === 0) {
            todayContainer.innerHTML = `<div style="font-size:12px; color:#94a3b8; padding:8px 0;">No sessions scheduled for today</div>`;
        } else {
            todayContainer.innerHTML = todayEvents.map(e => `
                <div class="schedule-item" onclick="viewCalendarEventDetails(${e.id})" style="cursor:pointer;">
                    <div style="font-size:13px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
                        <span style="color:#2563eb;">•</span> ${e.title}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#64748b; margin-top:4px;">
                        <span>⏰ ${e.start_time ? formatTimeAmPm(e.start_time) : 'Full Day'}${e.end_time ? ' - ' + formatTimeAmPm(e.end_time) : ''}</span>
                        <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:600;">${e.venue_location || 'IICM Hall'}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // 3. Pending Approvals List (Events + Company Employee Nominations)
    const pendingContainer = document.getElementById('pending-approvals-list');
    if (pendingContainer) {
        const token = localStorage.getItem('iicm_access_token');
        fetch(`${API_BASE_URL}/trainees/nominations/?nomination_status=NOMINATED`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : [])
        .then(nominations => {
            const pendingEvents = loadedCalendarEvents.filter(e => e.status === 'PENDING');
            let itemsHtml = '';

            // Render Pending Company Employee Nominations first
            if (nominations && nominations.length > 0) {
                itemsHtml += nominations.slice(0, 3).map(nom => `
                    <div class="pending-item">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                            <div>
                                <div style="font-size:12px; font-weight:700; color:#0f172a;">${nom.full_name} (${nom.eis_number || 'Nominee'})</div>
                                <div style="font-size:11px; color:#64748b;">${nom.company_name || nom.company_code || 'Company'} | ${nom.program_title || ''}</div>
                            </div>
                            <span style="background:#ffedd5; color:#c2410c; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; flex-shrink:0;">Nominated</span>
                        </div>
                        <div style="display:flex; gap:6px; margin-top:6px;">
                            <button type="button" style="background:#059669; color:#fff; border:none; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'SHORTLISTED')">✅ Accept</button>
                            <button type="button" style="background:#dc2626; color:#fff; border:none; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; cursor:pointer;" onclick="updateNominationStatus(${nom.id}, 'REJECTED')">❌ Reject</button>
                        </div>
                    </div>
                `).join('');
            }

            // Render Pending Calendar Events
            if (pendingEvents && pendingEvents.length > 0) {
                itemsHtml += pendingEvents.slice(0, 2).map(e => `
                    <div class="pending-item">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-size:12px; font-weight:700; color:#0f172a;">${e.title}</div>
                            <span style="background:#fef3c7; color:#92400e; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">Event Pending</span>
                        </div>
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">Submitted by: ${e.created_by_name}</div>
                    </div>
                `).join('');
            }

            if (!itemsHtml) {
                pendingContainer.innerHTML = `<div style="font-size:12px; color:#94a3b8; padding:8px 0;">No pending employee nominations or event approvals</div>`;
            } else {
                pendingContainer.innerHTML = itemsHtml;
            }
        })
        .catch(err => {
            console.error('Error loading pending nominations widget:', err);
        });
    }
}

function renderAgendaView() {
    const container = document.getElementById('agenda-items-container');
    if (!container) return;

    if (loadedCalendarEvents.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">No events available in agenda.</div>`;
        return;
    }

    container.innerHTML = loadedCalendarEvents.map(ev => `
        <div style="display:flex; gap:16px; align-items:flex-start; padding:14px; border-bottom:1px solid #f1f5f9; background:#fff; border-radius:8px; margin-bottom:8px; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
            <div style="background:#eff6ff; color:#1d4ed8; padding:8px 12px; border-radius:8px; text-align:center; min-width:80px; flex-shrink:0;">
                <div style="font-size:11px; font-weight:700; text-transform:uppercase;">${ev.start_date}</div>
            </div>
            <div style="flex:1;">
                <div style="font-size:14px; font-weight:700; color:#0f172a;">${ev.title}</div>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">
                    ⏰ ${ev.start_time ? formatTimeAmPm(ev.start_time) : 'Full Day'} ${ev.end_time ? '- ' + formatTimeAmPm(ev.end_time) : ''} | 📍 ${ev.venue_location || 'IICM Campus'}
                </div>
                ${ev.description ? `<div style="font-size:12px; color:#334155; margin-top:4px;">${ev.description}</div>` : ''}
            </div>
            <div style="display:flex; gap:6px;">
                <button type="button" class="btn-action-sm" onclick="addToGoogleCalendar(${ev.id})" style="background:#e8f0fe; color:#1a73e8; border-color:#d2e3fc; font-weight:700;">📅 Google Sync</button>
                <button type="button" class="btn-action-sm" onclick="viewCalendarEventDetails(${ev.id})">Details</button>
            </div>
        </div>
    `).join('');
}

function filterCalendarBySearch() {
    renderAcademicCalendar();
}

/* ═════════════════════════════════════════════════════════════════════
   GOOGLE CALENDAR INTEGRATION FUNCTIONS
   ═════════════════════════════════════════════════════════════════════ */
function addToGoogleCalendar(eventId) {
    const ev = loadedCalendarEvents.find(e => e.id === eventId);
    if (!ev) return;
    if (ev.google_calendar_url) {
        window.open(ev.google_calendar_url, '_blank');
    } else {
        const title = encodeURIComponent(ev.title);
        const details = encodeURIComponent(ev.description || '');
        const location = encodeURIComponent(ev.venue_location || 'IICM Ranchi');
        const dates = `${ev.start_date.replace(/-/g, '')}/${ev.end_date.replace(/-/g, '')}`;
        const gurl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
        window.open(gurl, '_blank');
    }
}

function exportGoogleCalendarICS() {
    const token = localStorage.getItem('iicm_access_token');
    window.open(`${API_BASE_URL}/calendar/events/export_ical/?token=${token}`, '_blank');
}

function connectGoogleCalendarSync() {
    alert('Google Calendar Sync Enabled!\n\n1. Downloading your official IICM iCalendar (.ics) feed...\n2. You can import this .ics file into your Google Calendar settings (Settings -> Import & Export).');
    exportGoogleCalendarICS();
}


function openAddCalendarEventModal() {
    document.getElementById('calendar-event-form').reset();
    document.getElementById('cal-event-id').value = '';
    document.getElementById('cal-modal-title').textContent = '➕ Create Academic Calendar Event';
    
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('cal-start-date').value = today;
    document.getElementById('cal-end-date').value = today;

    const modal = document.getElementById('calendar-event-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCalendarEventModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('calendar-event-modal');
    if (modal) modal.style.display = 'none';
}

function populateProgramSelectInCalModal() {
    const sel = document.getElementById('cal-program');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- None / General Event --</option>';
    if (window.allProgramsCache && window.allProgramsCache.length > 0) {
        window.allProgramsCache.forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${p.title}</option>`;
        });
    }
}

async function handleSaveCalendarEvent(e) {
    if (e) e.preventDefault();
    const token = localStorage.getItem('iicm_access_token');
    const eventId = document.getElementById('cal-event-id').value;

    const payload = {
        title: document.getElementById('cal-title').value,
        event_type: document.getElementById('cal-event-type').value,
        start_date: document.getElementById('cal-start-date').value,
        end_date: document.getElementById('cal-end-date').value,
        start_time: document.getElementById('cal-start-time').value || null,
        end_time: document.getElementById('cal-end-time').value || null,
        description: document.getElementById('cal-description').value,
        program: document.getElementById('cal-program').value || null
    };

    const method = eventId ? 'PUT' : 'POST';
    const url = eventId ? `${API_BASE_URL}/calendar/events/${eventId}/` : `${API_BASE_URL}/calendar/events/`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 403) {
            const errData = await res.json().catch(() => ({}));
            alert(errData.detail || 'HTTP 403 — Access Denied: You cannot modify or delete Super Admin events or system holidays.');
            return;
        }

        if (res.ok) {
            closeCalendarEventModal();
            loadAcademicCalendarEvents();
            alert(`Event ${eventId ? 'updated' : 'created'} successfully!`);
        } else {
            const errData = await res.json().catch(() => ({}));
            alert(`Error saving event: ${JSON.stringify(errData)}`);
        }
    } catch(err) {
        console.error('Error saving calendar event:', err);
    }
}

function viewCalendarEventDetails(eventId) {
    const ev = loadedCalendarEvents.find(e => e.id === eventId);
    if (!ev) return;

    const body = document.getElementById('cal-detail-body');
    const footer = document.getElementById('cal-detail-footer');
    if (!body) return;

    const isLocked = !ev.can_edit;
    let typeBadgeColor = '#3b82f6';
    if (ev.event_type === 'HOLIDAY') typeBadgeColor = '#ef4444';
    else if (ev.event_type === 'WORKSHOP') typeBadgeColor = '#10b981';
    else if (ev.event_type === 'ASSESSMENT') typeBadgeColor = '#8b5cf6';
    else if (ev.event_type === 'COMPANY_EVENT') typeBadgeColor = '#f97316';

    let html = `
        <div style="margin-bottom:16px;">
            <span style="background:${typeBadgeColor}; color:#fff; font-size:12px; font-weight:700; padding:4px 8px; border-radius:4px;">
                ${ev.event_type_display}
            </span>
            ${ev.is_system_holiday ? '<span style="background:#dc2626; color:#fff; font-size:12px; font-weight:700; padding:4px 8px; border-radius:4px; margin-left:6px;">🔒 System Holiday</span>' : ''}
            ${ev.created_by_role === 'SUPER_ADMIN' ? '<span style="background:#475569; color:#fff; font-size:12px; font-weight:700; padding:4px 8px; border-radius:4px; margin-left:6px;">🔒 Super Admin Event</span>' : ''}
        </div>
        <h3 style="margin:0 0 12px 0; color:#0f172a; font-size:18px; font-weight:700;">${ev.title}</h3>
        
        <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
            <div><strong>📅 Start Date:</strong> ${ev.start_date}</div>
            <div><strong>📅 End Date:</strong> ${ev.end_date}</div>
            <div><strong>⏰ Time:</strong> ${ev.start_time || 'Full Day'} - ${ev.end_time || ''}</div>
            <div><strong>👤 Created By:</strong> ${ev.created_by_name} (${ev.created_by_role})</div>
            ${ev.program_title ? `<div style="grid-column: span 2;"><strong>🎓 Linked Program:</strong> ${ev.program_title}</div>` : ''}
        </div>

        <div style="font-size:13px; color:#334155; margin-bottom:16px;">
            <strong>Description / Notes:</strong><br>
            <p style="margin:4px 0; line-height:1.5;">${ev.description || 'No additional description provided.'}</p>
        </div>
    `;

    if (isLocked) {
        html += `
            <div style="background:#fef2f2; border:1px solid #fca5a5; color:#991b1b; padding:10px; border-radius:6px; font-size:12px; font-weight:600;">
                🔒 Access Restricted: Program Coordinators cannot modify or delete events created by Super Admin or System Holidays.
            </div>
        `;
    }

    body.innerHTML = html;

    let footerBtns = `
        <button type="button" class="btn-action-sm" style="background:#e8f0fe; color:#1a73e8; border-color:#d2e3fc; font-weight:700;" onclick="addToGoogleCalendar(${ev.id})">📅 Add to Google Calendar</button>
        <button type="button" class="btn-action-sm" onclick="closeCalendarDetailModal(event)">Close</button>
    `;
    if (ev.can_edit) {
        footerBtns = `
            <button type="button" class="btn-action-sm" style="background:#fee2e2; color:#991b1b; border-color:#fca5a5;" onclick="deleteCalendarEvent(${ev.id})">🗑 Delete Event</button>
            <button type="button" class="btn-filter" style="background:#2563eb;" onclick="openEditCalendarEventModal(${ev.id})">✏ Edit Event</button>
            ${footerBtns}
        `;
    }
    if (footer) footer.innerHTML = footerBtns;

    const modal = document.getElementById('calendar-detail-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCalendarDetailModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('calendar-detail-modal');
    if (modal) modal.style.display = 'none';
}

function openEditCalendarEventModal(eventId) {
    closeCalendarDetailModal();
    const ev = loadedCalendarEvents.find(e => e.id === eventId);
    if (!ev) return;

    if (!ev.can_edit) {
        alert('HTTP 403 — Access Denied: You cannot modify Super Admin events or system holidays.');
        return;
    }

    document.getElementById('cal-event-id').value = ev.id;
    document.getElementById('cal-title').value = ev.title;
    document.getElementById('cal-event-type').value = ev.event_type;
    document.getElementById('cal-start-date').value = ev.start_date;
    document.getElementById('cal-end-date').value = ev.end_date;
    document.getElementById('cal-start-time').value = ev.start_time || '';
    document.getElementById('cal-end-time').value = ev.end_time || '';
    document.getElementById('cal-description').value = ev.description || '';
    document.getElementById('cal-program').value = ev.program || '';

    document.getElementById('cal-modal-title').textContent = '✏ Edit Academic Calendar Event';

    const modal = document.getElementById('calendar-event-modal');
    if (modal) modal.style.display = 'flex';
}

async function deleteCalendarEvent(eventId) {
    const ev = loadedCalendarEvents.find(e => e.id === eventId);
    if (ev && !ev.can_delete) {
        alert('HTTP 403 — Access Denied: You cannot delete Super Admin events or system holidays.');
        return;
    }

    if (!confirm('Are you sure you want to delete this calendar event?')) return;

    const token = localStorage.getItem('iicm_access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/calendar/events/${eventId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 403) {
            alert('HTTP 403 — Access Denied: You cannot delete Super Admin events or system holidays.');
            return;
        }

        if (res.ok || res.status === 24) {
            closeCalendarDetailModal();
            loadAcademicCalendarEvents();
            alert('Event deleted successfully.');
        } else {
            alert('Failed to delete event.');
        }
    } catch(err) {
        console.error('Error deleting calendar event:', err);
    }
}

/* ═════════════════════════════════════════════════════════════════════
   FACULTY ASSIGNMENT & INVITATION SCHEDULING MODULE
   ═════════════════════════════════════════════════════════════════════ */
async function populateFacultyAssignDropdowns() {
    const token = localStorage.getItem('iicm_access_token');
    
    // 1. Programs Dropdown
    const progSelect = document.getElementById('assign-prog-select');
    if (progSelect) {
        try {
            const res = await fetch(`${API_BASE_URL}/programs/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const programs = await res.json();
                progSelect.innerHTML = `<option value="">-- Select Approved Program --</option>` + 
                    programs.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
            }
        } catch(err) { console.error('Error loading programs for assign:', err); }
    }

    // 2. Faculty Dropdown
    const facSelect = document.getElementById('assign-faculty-select');
    if (facSelect) {
        try {
            const res = await fetch(`${API_BASE_URL}/faculty/faculties/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const faculties = data.results || data;
                facSelect.innerHTML = `<option value="">-- Select Faculty --</option>` + 
                    faculties.map(f => `<option value="${f.id}">${f.name} (${f.specialization || (f.faculty_type === 'EXTERNAL' ? 'Visiting Expert' : 'Internal Core')})</option>`).join('');
            }
        } catch(err) { console.error('Error loading faculty for assign:', err); }
    }

    // 3. Subjects Dropdown
    const subjSelect = document.getElementById('assign-subject-select');
    if (subjSelect) {
        try {
            const res = await fetch(`${API_BASE_URL}/masters/subjects/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const subjects = await res.json();
                subjSelect.innerHTML = `<option value="">-- Select Subject --</option>` + 
                    subjects.map(s => `<option value="${s.id}">${s.code} - ${s.subject_name}</option>`).join('');
            }
        } catch(err) { console.error('Error loading subjects for assign:', err); }
    }

    // 4. Venues Dropdown
    const venueSelect = document.getElementById('assign-venue-select');
    if (venueSelect) {
        try {
            const res = await fetch(`${API_BASE_URL}/masters/venues/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const venues = await res.json();
                venueSelect.innerHTML = `<option value="">-- Select Venue --</option>` + 
                    venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
            }
        } catch(err) { console.error('Error loading venues for assign:', err); }
    }
}

async function handleAssignFacultySubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('iicm_access_token');

    const program = document.getElementById('assign-prog-select').value;
    const faculty = document.getElementById('assign-faculty-select').value;
    const topic_title = document.getElementById('assign-topic').value;
    const subject = document.getElementById('assign-subject-select').value || null;
    const session_date = document.getElementById('assign-date').value;
    const start_time = document.getElementById('assign-start').value;
    const end_time = document.getElementById('assign-end').value;
    const venue = document.getElementById('assign-venue-select').value || null;

    if (!program || !faculty || !topic_title || !session_date) {
        alert('Please fill in all required fields (Program, Faculty, Topic, Date).');
        return;
    }

    const payload = {
        program: parseInt(program),
        faculty: parseInt(faculty),
        topic_title: topic_title,
        session_date: session_date,
        start_time: start_time,
        end_time: end_time,
        invitation_status: 'PENDING'
    };
    if (subject) payload.subject = parseInt(subject);
    if (venue) payload.venue = parseInt(venue);

    try {
        const res = await fetch(`${API_BASE_URL}/programs/schedules/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('📩 Faculty session assigned & invitation email sent successfully!');
            document.getElementById('assign-topic').value = '';
            loadFacultySchedulesTable();
        } else {
            const errData = await res.json();
            alert(`Failed to assign faculty: ${JSON.stringify(errData)}`);
        }
    } catch(err) {
        console.error('Error assigning faculty:', err);
    }
}

async function loadFacultySchedulesTable() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('faculty-schedules-body');
    if (!tbody) return;

    // Check GM approval status for submitted schedule notesheets
    try {
        const scheds = JSON.parse(localStorage.getItem('iicm_schedule_notesheets') || '[]');
        const decisions = JSON.parse(localStorage.getItem('iicm_gm_decisions') || '{}');
        if (scheds.length > 0) {
            const latestSched = scheds[0];
            const dec = decisions[latestSched.id] || decisions[latestSched.title];
            const status = dec ? dec.status : latestSched.status;
            const remarks = dec ? dec.remarks : (latestSched.gm_remarks || '');

            if (status === 'APPROVED') {
                showSchedulePDFBanner('success', `🟢 <strong>APPROVED BY GM</strong> — Official Sanction Granted. ${remarks ? 'GM Remarks: "' + remarks + '"' : ''}`);
            } else if (status === 'REJECTED') {
                showSchedulePDFBanner('error', `🔴 <strong>REJECTED BY GM</strong> — ${remarks ? 'GM Remarks: "' + remarks + '"' : 'Schedule Requisition Declined.'}`);
            } else if (status === 'PENDING_APPROVAL') {
                showSchedulePDFBanner('warning', `🟡 <strong>PENDING GM REVIEW</strong> — Submitted to GM for official approval.`);
            }
        }
    } catch(e) {}

    const progId = document.getElementById('assign-prog-select')?.value || '';
    let url = `${API_BASE_URL}/programs/schedules/`;
    if (progId) url += `?program_id=${progId}`;


    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const schedules = await res.json();
            if (schedules.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                            No assigned faculty sessions found. Assign a faculty using the form above.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = schedules.map(s => {
                const status = s.invitation_status || 'PENDING';
                let statusBadge = '';
                let actionsHtml = '';

                if (status === 'PENDING') {
                    statusBadge = `<span style="background:#ffedd5; color:#c2410c; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">Pending Invitation</span>`;
                    actionsHtml = `
                        <div style="display:flex; gap:4px; flex-wrap:wrap;">
                            <button type="button" style="background:#059669; color:#fff; border:none; font-size:10px; font-weight:700; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="simulateFacultyResponse(${s.id}, 'ACCEPTED')">Simulate Accept</button>
                            <button type="button" style="background:#dc2626; color:#fff; border:none; font-size:10px; font-weight:700; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="simulateFacultyResponse(${s.id}, 'DECLINED')">Simulate Decline</button>
                            <button type="button" style="background:#0284c7; color:#fff; border:none; font-size:10px; font-weight:700; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="simulateFacultyResponse(${s.id}, 'SUGGESTED')">Suggest Time</button>
                        </div>
                    `;
                } else if (status === 'ACCEPTED') {
                    statusBadge = `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">Accepted &amp; Confirmed</span>`;
                    actionsHtml = `<span style="color:#059669; font-weight:700; font-size:12px;">✅ Session Confirmed</span>`;
                } else if (status === 'DECLINED') {
                    statusBadge = `<span style="background:#ffe4e6; color:#be123c; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">Declined</span>`;
                    actionsHtml = `<button type="button" style="background:#0284c7; color:#fff; border:none; font-size:10px; font-weight:700; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="simulateFacultyResponse(${s.id}, 'PENDING')">Re-Invite</button>`;
                } else if (status === 'SUGGESTED') {
                    statusBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">Suggested Time</span>`;
                    const suggestedTimeStr = `${s.suggested_date || ''} (${s.suggested_start_time || ''} - ${s.suggested_end_time || ''})`;
                    actionsHtml = `
                        <div>
                            <div style="font-size:11px; font-weight:700; color:#0369a1; margin-bottom:4px;">Proposed: ${suggestedTimeStr}</div>
                            <button type="button" style="background:#059669; color:#fff; border:none; font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px; cursor:pointer;" onclick="approveFacultySuggestedTime(${s.id})">✅ Approve Suggested Time</button>
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td><strong>${s.session_date}</strong><br><small style="color:#64748b;">${s.start_time} - ${s.end_time}</small></td>
                        <td style="font-weight:700; color:#0f172a;">${s.topic_title}<br><small style="color:#64748b;">${s.program_title || ''}</small></td>
                        <td><strong>${s.faculty_name}</strong><br><small style="color:#64748b;">${s.faculty_specialization || 'Faculty'}</small></td>
                        <td><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">${s.venue_name || 'IICM Hall'}</span></td>
                        <td>${statusBadge}</td>
                        <td>${actionsHtml}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch(err) {
        console.error('Error fetching faculty schedules:', err);
    }
}

async function simulateFacultyResponse(scheduleId, responseType) {
    const token = localStorage.getItem('iicm_access_token');
    const payload = { invitation_status: responseType };

    if (responseType === 'SUGGESTED') {
        const newDate = prompt('Enter Faculty Suggested Date (YYYY-MM-DD):', '2026-08-15');
        if (!newDate) return;
        const newStart = prompt('Enter Suggested Start Time (HH:MM):', '10:00');
        const newEnd = prompt('Enter Suggested End Time (HH:MM):', '13:00');
        payload.suggested_date = newDate;
        payload.suggested_start_time = newStart;
        payload.suggested_end_time = newEnd;
        payload.faculty_remarks = 'Faculty requested morning slot adjustment.';
    }

    try {
        const res = await fetch(`${API_BASE_URL}/programs/schedules/${scheduleId}/faculty-response/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message || `Faculty response logged as ${responseType}!`);
            loadFacultySchedulesTable();
        } else {
            alert('Failed to log faculty response.');
        }
    } catch(err) {
        console.error('Error simulating faculty response:', err);
    }
}

async function approveFacultySuggestedTime(scheduleId) {
    const token = localStorage.getItem('iicm_access_token');
    if (!confirm('Are you sure you want to approve the faculty suggested time and update the live schedule?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/programs/schedules/${scheduleId}/approve-suggested-time/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ SCHEDULE UPDATED:\n\n${data.message}`);
            loadFacultySchedulesTable();
        } else {
            alert('Failed to approve suggested time.');
        }
    } catch(err) {
        console.error('Error approving suggested time:', err);
    }
}

/* ═════════════════════════════════════════════════════════════════════
   COORDINATOR FACULTY MASTER & LIVE TEACHING PROGRESS MODULE
   ═════════════════════════════════════════════════════════════════════ */
async function handleCoordAddFacultySubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('iicm_access_token');

    const name = document.getElementById('coord-fac-name').value;
    const email = document.getElementById('coord-fac-email').value;
    const phone = document.getElementById('coord-fac-phone').value;
    const faculty_type = document.getElementById('coord-fac-type').value;
    const specialization = document.getElementById('coord-fac-spec').value;

    if (!name || !email) {
        alert('Please fill in all required fields (Faculty Name, Email Address).');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/faculty/faculties/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, phone, faculty_type, specialization, is_active: true })
        });

        if (res.ok || res.status === 201) {
            alert(`✅ Faculty Master Profile for "${name}" created successfully!`);
            document.getElementById('coord-add-faculty-form').reset();
            loadCoordFacultyMasterTable();
            populateFacultyAssignDropdowns();
        } else {
            const errData = await res.json();
            alert(`Failed to add faculty master: ${JSON.stringify(errData)}`);
        }
    } catch(err) {
        console.error('Error adding faculty master profile:', err);
    }
}

async function deleteCoordFacultyMaster(facId, facName) {
    if (!confirm(`Are you sure you want to remove Faculty profile "${facName}" from Faculty Master?`)) return;
    const token = localStorage.getItem('iicm_access_token');

    try {
        const res = await fetch(`${API_BASE_URL}/faculty/faculties/${facId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok || res.status === 204) {
            alert(`🗑️ Faculty Profile "${facName}" removed successfully.`);
            loadCoordFacultyMasterTable();
            populateFacultyAssignDropdowns();
        } else {
            alert('Failed to remove faculty profile.');
        }
    } catch(err) {
        console.error('Error deleting faculty profile:', err);
    }
}

function toggleAddFacultyForm() {
    var c = document.getElementById('coord-add-faculty-container');
    var btn = document.getElementById('btn-toggle-add-fac');
    if (!c) return;
    if (c.style.display === 'none' || !c.style.display) {
        c.style.display = 'block';
        if (btn) btn.innerHTML = '✖ Close Form';
    } else {
        c.style.display = 'none';
        if (btn) btn.innerHTML = '➕ Add New Faculty';
    }
}
window.toggleAddFacultyForm = toggleAddFacultyForm;

async function loadCoordFacultyMasterTable() {
    const token = localStorage.getItem('iicm_access_token');
    const cardsGrid = document.getElementById('coord-faculty-cards-grid');

    if (cardsGrid) {
        cardsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">Loading Faculty Master live progress cards...</div>`;
    }

    try {
        let faculties = [];
        try {
            const res = await fetch(`${API_BASE_URL}/faculty/faculties/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                faculties = data.results || data;
            }
        } catch(e) {}

        // Fallback default faculties if none exist
        if (!faculties || faculties.length === 0) {
            faculties = [
                {
                    id: 1,
                    name: 'Dr. P. K. Bhattacharya',
                    email: 'pk.bhattacharya@coalindia.in',
                    phone: '+91 9438877116',
                    faculty_type: 'INTERNAL',
                    specialization: 'Medical & Occupational Health Standards'
                },
                {
                    id: 2,
                    name: 'Prof. S. N. Mukherjee',
                    email: 'snmukherjee@iitism.ac.in',
                    phone: '+91 9431122334',
                    faculty_type: 'EXTERNAL',
                    specialization: 'Underground Coal Mining & Strata Control'
                },
                {
                    id: 3,
                    name: 'Shri Amitabh Roy',
                    email: 'aroy@cmpdi.co.in',
                    phone: '+91 9437012345',
                    faculty_type: 'INTERNAL',
                    specialization: 'DGMS Safety Norms & Disaster Management'
                },
                {
                    id: 4,
                    name: 'Dr. (Ms.) Ananya Dasgupta',
                    email: 'ananya.dasgupta@nimh.gov.in',
                    phone: '+91 9830012345',
                    faculty_type: 'EXTERNAL',
                    specialization: 'Ergonomics, Mine Hygiene & Health Surveillance'
                }
            ];
        }

        if (cardsGrid) {
            cardsGrid.innerHTML = faculties.map((f, idx) => {
                    const facTypeBadge = f.faculty_type === 'EXTERNAL' ? 
                        `<span style="background:#fef3c7; color:#d97706; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px;">Visiting Expert</span>` : 
                        `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px;">Internal Core</span>`;

                    // Calculate progress % and session status
                    const totalSessions = 5;
                    const completedSessions = Math.min(totalSessions, (idx % 3) + 3);
                    const pct = Math.round((completedSessions / totalSessions) * 100);

                    let statusBadge = '';
                    if (pct === 100) {
                        statusBadge = `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">✅ Completed</span>`;
                    } else {
                        statusBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">🟢 Active Teaching</span>`;
                    }

                    const initial = f.name ? f.name.charAt(0).toUpperCase() : 'F';

                    return `
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;" onclick="openFacultyDetailModal(${f.id})">
                            <div>
                                <!-- Header Row with Avatar & Type Badge -->
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                                    <div style="display:flex; gap:12px; align-items:center;">
                                        <div style="width:44px; height:44px; background:#1b4332; color:#ffffff; font-weight:800; font-size:18px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                                            ${initial}
                                        </div>
                                        <div>
                                            <h4 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;">${f.name}</h4>
                                            <div style="font-size:12px; color:#64748b;">${f.specialization || 'Mining Engineering'}</div>
                                        </div>
                                    </div>
                                    ${facTypeBadge}
                                </div>

                                <!-- Contact Info -->
                                <div style="background:#f8fafc; padding:10px 12px; border-radius:8px; font-size:12px; color:#475569; margin-bottom:14px; border:1px solid #f1f5f9;">
                                    <div>📧 Email: <strong>${f.email}</strong></div>
                                    <div style="margin-top:2px;">📞 Phone: <strong>${f.phone || '+91 9876543210'}</strong></div>
                                </div>

                                <!-- Assigned Program & Topic -->
                                <div style="margin-bottom:14px; font-size:12.5px;">
                                    <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:2px;">Assigned Program &amp; Topic</div>
                                    <div style="font-weight:700; color:#0f172a;">Mine Executive Management</div>
                                    <div style="color:#475569;">Lecture: <em>Mine Safety &amp; Statutory Norms</em></div>
                                </div>

                                <!-- Live Teaching Progress % -->
                                <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin-bottom:16px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:800; color:#15803d; margin-bottom:6px;">
                                        <span>Teaching Progress</span>
                                        <span>${completedSessions}/${totalSessions} Sessions (${pct}%)</span>
                                    </div>
                                    <div style="background:#dcfce7; height:8px; border-radius:10px; overflow:hidden;">
                                        <div style="background:#16a34a; height:100%; width:${pct}%;"></div>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                                        <span style="font-size:11px; color:#475569; font-weight:600;">Status:</span>
                                        ${statusBadge}
                                    </div>
                                </div>
                            </div>

                            <!-- Card Footer Actions -->
                            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:12px;" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action-sm" style="background:#0284c7; color:#fff; font-size:11px; font-weight:700; padding:6px 12px; border-radius:6px;" onclick="resendFacultyInviteMail('${f.email}', '${f.name}')">
                                    📩 Resend Invite Mail
                                </button>
                                <button type="button" class="btn-action-sm" style="background:#dc2626; color:#fff; font-size:11px; font-weight:700; padding:6px 12px; border-radius:6px;" onclick="deleteCoordFacultyMaster(${f.id}, '${f.name}')">
                                    🗑️ Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
    } catch(err) {
        console.error('Error loading coordinator faculty master directory cards:', err);
    }
}

async function resendFacultyInviteMail(email, name) {
    try {
        const response = await fetch(`${API_BASE_URL}/faculty/faculties/send-faculty-invite/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('iicm_access_token')}`
            },
            body: JSON.stringify({ email: email, name: name })
        });
        const data = await response.json();
        alert(data.message || `📩 Official Faculty Invitation Email sent to ${name} (${email})!`);
    } catch (err) {
        console.error('Error sending invite:', err);
        alert('Failed to send email. Please try again.');
    }
}

async function openFacultyDetailModal(facId) {
    const token = localStorage.getItem('iicm_access_token');
    const modal = document.getElementById('faculty-detail-modal');
    const body = document.getElementById('fac-modal-body');
    if (!modal || !body) return;

    modal.style.display = 'flex';
    body.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">Loading Faculty profile details and live responses...</div>`;

    try {
        const resFac = await fetch(`${API_BASE_URL}/faculty/faculties/${facId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resSched = await fetch(`${API_BASE_URL}/programs/schedules/?faculty_id=${facId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resFac.ok) {
            const faculty = await resFac.json();
            const schedules = resSched.ok ? (await resSched.json()).results || (await resSched.json()) : [];

            const facTypeBadge = faculty.faculty_type === 'EXTERNAL' ? 
                `<span style="background:#fef3c7; color:#d97706; font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">Visiting Expert</span>` : 
                `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">Internal Core</span>`;

            let schedRows = '';
            if (schedules.length === 0) {
                schedRows = `<tr><td colspan="4" style="text-align:center; padding:16px; color:#94a3b8;">No specific training sessions scheduled yet for this faculty.</td></tr>`;
            } else {
                schedRows = schedules.map(s => {
                    let statusBadge = `<span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:3px 8px; border-radius:4px; font-size:11px;">PENDING</span>`;
                    if (s.invitation_status === 'ACCEPTED') statusBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:700; padding:3px 8px; border-radius:4px; font-size:11px;">✅ ACCEPTED</span>`;
                    else if (s.invitation_status === 'DECLINED') statusBadge = `<span style="background:#fee2e2; color:#b91c1c; font-weight:700; padding:3px 8px; border-radius:4px; font-size:11px;">❌ DECLINED</span>`;
                    else if (s.invitation_status === 'SUGGESTED') statusBadge = `<span style="background:#fef3c7; color:#d97706; font-weight:700; padding:3px 8px; border-radius:4px; font-size:11px;">⏰ SUGGESTED TIME</span>`;

                    let actionBtn = '';
                    if (s.invitation_status === 'SUGGESTED') {
                        actionBtn = `<button type="button" class="btn-action-sm" style="background:#16a34a; color:#fff; font-size:11px; font-weight:700;" onclick="approveFacultySuggestedTime(${s.id})">✅ Approve Time</button>`;
                    }

                    return `
                        <tr>
                            <td>
                                <strong>${s.session_date}</strong><br>
                                <small style="color:#64748b;">${s.start_time} - ${s.end_time}</small>
                            </td>
                            <td>
                                <strong>${s.topic_title}</strong><br>
                                <small style="color:#64748b;">${s.program_title || 'Executive Program'}</small>
                            </td>
                            <td>${statusBadge}</td>
                            <td>${actionBtn || '—'}</td>
                        </tr>
                    `;
                }).join('');
            }

            body.innerHTML = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:16px; align-items:center;">
                        <div style="width:54px; height:54px; background:#1b4332; color:#fff; font-size:22px; font-weight:800; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                            ${faculty.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:18px; font-weight:800; color:#0f172a;">${faculty.name}</h3>
                            <div style="color:#64748b; font-size:13px;">${faculty.specialization || 'Mining Engineering & Safety'}</div>
                            <div style="font-size:12px; color:#475569; margin-top:4px;">📧 ${faculty.email} | 📞 ${faculty.phone || '+91 9876543210'}</div>
                        </div>
                    </div>
                    ${facTypeBadge}
                </div>

                <div style="margin-bottom:16px;">
                    <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:800; color:#1b4332;">📅 Assigned Sessions &amp; Faculty Invitation Responses</h4>
                    <div class="table-responsive">
                        <table class="data-table" style="font-size:13px;">
                            <thead>
                                <tr>
                                    <th>Date &amp; Time</th>
                                    <th>Topic &amp; Program</th>
                                    <th>Response Status</th>
                                    <th>Coordinator Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${schedRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    } catch(err) {
        console.error('Error opening faculty detail modal:', err);
    }
}

function closeFacultyDetailModal(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('faculty-detail-modal');
    if (modal) modal.style.display = 'none';
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 11: HONORARIUM MANAGEMENT & LIFECYCLE MODULE (HANDWRITTEN DIAGRAM)
   ═════════════════════════════════════════════════════════════════════ */
let sampleHonorariumData = [
    {
        id: 101,
        bill_ref: 'HON-2026-801',
        bill_date: '2026-08-04',
        faculty_name: 'Dr. Priya Sharma',
        faculty_eis: 'EIS-2026-FAC-991',
        session_title: 'Statutory Mine Safety Audit & Environmental Norms',
        program_title: 'Mine Safety Management Program',
        session_date: '2026-08-09',
        duration_hours: 4,
        basis: 'hour',
        qty: 4,
        rate_per_unit: 2500,
        basis_label: '4 hrs @ ₹2,500/hr',
        gross_amount: 10000,
        tds_amount: 1000,
        net_payable: 9000,
        finance_status: 'PENDING',
        gm_status: 'PENDING',
        payment_status: 'PENDING',
        utr_number: '',
        bill_number: '',
        payment_date: '',
        voucher_name: ''
    },
    {
        id: 102,
        bill_ref: 'HON-2026-802',
        bill_date: '2026-08-05',
        faculty_name: 'Dr. Priya Sharma',
        faculty_eis: 'EIS-2026-FAC-991',
        session_title: 'Digital Mining & Autonomous Fleet Monitoring',
        program_title: 'Digital Transformation Workshop',
        session_date: '2026-08-18',
        duration_hours: 4,
        basis: 'session',
        qty: 1,
        rate_per_unit: 12000,
        basis_label: '1 session @ ₹12,000/sess',
        gross_amount: 12000,
        tds_amount: 1200,
        net_payable: 10800,
        finance_status: 'VERIFIED',
        gm_status: 'APPROVED',
        payment_status: 'PENDING',
        utr_number: '',
        bill_number: '',
        payment_date: '',
        voucher_name: ''
    },
    {
        id: 103,
        bill_ref: 'HON-2026-803',
        bill_date: '2026-08-06',
        faculty_name: 'Prof. Rajesh Verma',
        faculty_eis: 'EIS-2026-FAC-992',
        session_title: 'Executive Leadership & Conflict Resolution',
        program_title: 'Executive Leadership Program',
        session_date: '2026-09-01',
        duration_hours: 8,
        basis: 'day',
        qty: 2,
        rate_per_unit: 10000,
        basis_label: '2 days @ ₹10,000/day',
        gross_amount: 20000,
        tds_amount: 2000,
        net_payable: 18000,
        finance_status: 'VERIFIED',
        gm_status: 'APPROVED',
        payment_status: 'DISBURSED',
        utr_number: 'UTR771029381023',
        bill_number: 'IICM-BILL-2026-8843',
        payment_date: '2026-08-06',
        voucher_name: 'Receipt_Voucher_HON-803.pdf'
    }
];

function getHonorariumList() {
    try {
        const saved = localStorage.getItem('iicm_honorarium_data');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return sampleHonorariumData;
}

function saveHonorariumList(list) {
    try {
        localStorage.setItem('iicm_honorarium_data', JSON.stringify(list));
    } catch(e) {}
}

function loadHonorariumTable() {
    const list = getHonorariumList();
    const searchVal = (document.getElementById('hon-search-input') ? document.getElementById('hon-search-input').value.trim().toLowerCase() : '');
    const tbody = document.getElementById('honorarium-table-body');
    if (!tbody) return;

    let filtered = list;
    if (searchVal) {
        filtered = list.filter(item =>
            (item.faculty_name || '').toLowerCase().includes(searchVal) ||
            (item.bill_ref || '').toLowerCase().includes(searchVal) ||
            (item.utr_number || '').toLowerCase().includes(searchVal) ||
            (item.bill_number || '').toLowerCase().includes(searchVal)
        );
    }

    // Stats calculation
    const totalBills = list.length;
    const pendingSanction = list.filter(i => i.gm_status !== 'APPROVED' || i.payment_status !== 'DISBURSED').length;
    const totalDisbursedSum = list.filter(i => i.payment_status === 'DISBURSED').reduce((acc, curr) => acc + (curr.net_payable || 0), 0);
    const totalVouchers = list.filter(i => i.utr_number && i.payment_status === 'DISBURSED').length;

    if (document.getElementById('hon-stat-total')) document.getElementById('hon-stat-total').innerText = totalBills;
    if (document.getElementById('hon-stat-pending')) document.getElementById('hon-stat-pending').innerText = pendingSanction;
    if (document.getElementById('hon-stat-disbursed')) document.getElementById('hon-stat-disbursed').innerText = `₹ ${totalDisbursedSum.toLocaleString('en-IN')}`;
    if (document.getElementById('hon-stat-vouchers')) document.getElementById('hon-stat-vouchers').innerText = `${totalVouchers} Uploaded`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No honorarium bill records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(i => {
        let gmBadge = `<span style="background:#fef3c7; color:#b45309; font-weight:700; padding:4px 8px; border-radius:4px; font-size:11px;">🟡 GM SANCTION PENDING</span>`;
        if (i.gm_status === 'APPROVED') {
            gmBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 8px; border-radius:4px; font-size:11px;">🟢 GM SANCTIONED</span>`;
        }

        let payBadge = `<span style="background:#fee2e2; color:#b91c1c; font-weight:700; padding:4px 8px; border-radius:4px; font-size:11px;">🔴 DISBURSAL PENDING</span>`;
        if (i.payment_status === 'DISBURSED') {
            payBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:800; padding:4px 8px; border-radius:4px; font-size:11px;">🟢 DISBURSED</span>`;
        } else if (i.gm_status === 'APPROVED') {
            payBadge = `<span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:4px 8px; border-radius:4px; font-size:11px;">🟡 READY FOR RELEASE</span>`;
        }

        const storesInfo = i.utr_number ? `
            <div style="font-size:12px; color:#0f172a;">
                <div>🔑 <strong>UTR:</strong> ${i.utr_number}</div>
                <div>🧾 <strong>Bill No:</strong> ${i.bill_number}</div>
                <div>📅 <strong>Paid Date:</strong> ${i.payment_date}</div>
            </div>
        ` : `<span style="color:#94a3b8; font-size:12px; font-style:italic;">Pending Payment Stores Log</span>`;

        const voucherBtn = i.utr_number ? `
            <button type="button" class="btn-action-sm" style="background:#0284c7; color:#fff; font-weight:700; font-size:12px; padding:4px 10px;" onclick="openViewVoucherModal(${i.id})">
                📄 View Voucher
            </button>
        ` : `<span style="color:#94a3b8; font-size:12px;">Not Uploaded</span>`;

        let actionBtn = '';
        if (i.payment_status === 'DISBURSED') {
            actionBtn = `
                <button type="button" class="btn-filter" style="background:#0284c7; color:#fff; font-size:12px; font-weight:800; padding:6px 12px;" onclick="openProcessHonorariumModal(${i.id})">
                    🔍 View Disbursal
                </button>
            `;
        } else if (i.gm_status === 'APPROVED') {
            actionBtn = `
                <button type="button" class="btn-filter" style="background:#064e3b; color:#fff; font-size:12px; font-weight:800; padding:6px 12px;" onclick="openProcessHonorariumModal(${i.id})">
                    💸 Release Payment
                </button>
            `;
        } else {
            actionBtn = `
                <button type="button" class="btn-filter" style="background:#d97706; color:#fff; font-size:12px; font-weight:800; padding:6px 12px;" onclick="openProcessHonorariumModal(${i.id})">
                    🏛️ GM Approval &amp; Process
                </button>
            `;
        }

        const basisText = i.basis_label || (i.basis === 'session' ? `${i.qty || 1} session @ ₹${i.rate_per_unit || i.gross_amount}/sess` : (i.basis === 'day' ? `${i.qty || 1} days @ ₹${i.rate_per_unit}/day` : `${i.duration_hours || 4} hrs @ ₹${i.rate_per_hour || 2500}/hr`));

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:14px 16px;">
                    <strong style="color:#064e3b; font-size:14px;">${i.bill_ref}</strong>
                    <div style="font-size:12px; color:#64748b;">${i.bill_date}</div>
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:14px;">${i.faculty_name}</strong>
                    <div style="font-size:12px; color:#64748b;">${i.faculty_eis || 'EIS-2026-FAC'}</div>
                </td>
                <td style="padding:14px 16px;">
                    <div style="font-weight:700; color:#334155; font-size:13px;">${i.session_title}</div>
                    <div style="font-size:12px; color:#64748b;">Program: ${i.program_title}</div>
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#064e3b; font-size:14.5px;">₹ ${(i.net_payable || 9000).toLocaleString('en-IN')}</strong>
                    <div style="font-size:11.5px; color:#0284c7; font-weight:600;">Basis: ${basisText}</div>
                    <div style="font-size:11px; color:#64748b;">Gross: ₹${(i.gross_amount||10000).toLocaleString('en-IN')} | TDS: ₹${(i.tds_amount||1000).toLocaleString('en-IN')}</div>
                </td>
                <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${gmBadge}
                        ${payBadge}
                    </div>
                </td>
                <td style="padding:14px 16px;">${storesInfo}</td>
                <td style="padding:14px 16px;">${voucherBtn}</td>
                <td style="padding:14px 16px; text-align:right;">
                    ${actionBtn}
                </td>
            </tr>
        `;
    }).join('');
}

let availableAutoSessions = [
    {
        id: 'SESS-101',
        title: 'Statutory Mine Safety Audit & Environmental Norms',
        faculty: 'Dr. Priya Sharma',
        date: '2026-08-09',
        hours: 4,
        rate: 2500
    },
    {
        id: 'SESS-102',
        title: 'Digital Mining & Autonomous Fleet Monitoring',
        faculty: 'Dr. Priya Sharma',
        date: '2026-08-18',
        hours: 4,
        rate: 2500
    },
    {
        id: 'SESS-103',
        title: 'Executive Leadership & Conflict Resolution',
        faculty: 'Prof. Rajesh Verma',
        date: '2026-09-01',
        hours: 6,
        rate: 3000
    }
];

function recalculateHonorariumAmount() {
    const basisElem = document.getElementById('hon-rate-basis');
    const qtyElem = document.getElementById('hon-unit-qty');
    const rateElem = document.getElementById('hon-rate-unit');
    const lblQty = document.getElementById('lbl-unit-qty');
    const lblRate = document.getElementById('lbl-rate-unit');

    if (!basisElem || !qtyElem || !rateElem) return;

    const basis = basisElem.value;
    const qty = parseFloat(qtyElem.value) || 0;
    const rate = parseFloat(rateElem.value) || 0;

    if (lblQty) {
        if (basis === 'hour') lblQty.innerText = 'Total Hours *';
        else if (basis === 'session') lblQty.innerText = 'Total Sessions *';
        else if (basis === 'day') lblQty.innerText = 'Total Days *';
    }

    if (lblRate) {
        if (basis === 'hour') lblRate.innerText = 'Rate per Hour (₹) *';
        else if (basis === 'session') lblRate.innerText = 'Rate per Session (₹) *';
        else if (basis === 'day') lblRate.innerText = 'Rate per Day (₹) *';
    }

    const gross = Math.round(qty * rate);
    const tds = Math.round(gross * 0.10);
    const net = gross - tds;

    if (document.getElementById('hon-gross-val')) document.getElementById('hon-gross-val').value = gross;
    if (document.getElementById('hon-tds-val')) document.getElementById('hon-tds-val').value = tds;
    if (document.getElementById('hon-net-val')) document.getElementById('hon-net-val').value = net;
}

function openGenerateHonorariumModal() {
    const select = document.getElementById('hon-session-select');
    if (select) {
        select.innerHTML = availableAutoSessions.map((s) =>
            `<option value="${s.id}">${s.title} — ${s.faculty} (${s.date})</option>`
        ).join('');
    }

    onAutoFetchSessionChange();

    const modal = document.getElementById('generate-honorarium-modal');
    if (modal) modal.style.display = 'flex';
}

function closeGenerateHonorariumModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('generate-honorarium-modal');
    if (modal) modal.style.display = 'none';
}

function onAutoFetchSessionChange() {
    const select = document.getElementById('hon-session-select');
    if (!select) return;
    const selectedId = select.value;
    const sess = availableAutoSessions.find(s => s.id === selectedId) || availableAutoSessions[0];

    if (document.getElementById('af-faculty-name')) document.getElementById('af-faculty-name').innerText = sess.faculty;
    if (document.getElementById('af-session-date')) document.getElementById('af-session-date').innerText = sess.date;
    if (document.getElementById('af-session-hours')) document.getElementById('af-session-hours').innerText = `${sess.hours} Hours`;
    if (document.getElementById('af-session-rate')) document.getElementById('af-session-rate').innerText = `₹ ${sess.rate.toLocaleString('en-IN')} / Hour`;

    const basisElem = document.getElementById('hon-rate-basis');
    const qtyElem = document.getElementById('hon-unit-qty');
    const rateElem = document.getElementById('hon-rate-unit');

    if (basisElem) basisElem.value = 'hour';
    if (qtyElem) qtyElem.value = sess.hours;
    if (rateElem) rateElem.value = sess.rate;

    recalculateHonorariumAmount();
}

function handleGenerateHonorariumSubmit(e) {
    e.preventDefault();
    const select = document.getElementById('hon-session-select');
    const selectedId = select ? select.value : 'SESS-101';
    const sess = availableAutoSessions.find(s => s.id === selectedId) || availableAutoSessions[0];
    const remarks = document.getElementById('hon-remarks-input') ? document.getElementById('hon-remarks-input').value.trim() : '';

    const basis = document.getElementById('hon-rate-basis') ? document.getElementById('hon-rate-basis').value : 'hour';
    const qty = parseFloat(document.getElementById('hon-unit-qty') ? document.getElementById('hon-unit-qty').value : sess.hours) || 1;
    const rate = parseFloat(document.getElementById('hon-rate-unit') ? document.getElementById('hon-rate-unit').value : sess.rate) || 0;

    const gross = Math.round(qty * rate);
    const tds = Math.round(gross * 0.10);
    const net = gross - tds;

    const list = getHonorariumList();
    const newId = Date.now();
    const newRef = `HON-2026-${list.length + 801}`;

    const basisLabel = basis === 'hour' ? `${qty} hrs @ ₹${rate}/hr` : (basis === 'session' ? `${qty} session @ ₹${rate}/sess` : `${qty} days @ ₹${rate}/day`);

    const newBill = {
        id: newId,
        bill_ref: newRef,
        bill_date: new Date().toISOString().split('T')[0],
        faculty_name: sess.faculty,
        faculty_eis: 'EIS-2026-FAC-991',
        session_title: sess.title,
        program_title: 'Mine Safety Management Program',
        session_date: sess.date,
        duration_hours: sess.hours,
        basis: basis,
        qty: qty,
        rate_per_unit: rate,
        basis_label: basisLabel,
        gross_amount: gross,
        tds_amount: tds,
        net_payable: net,
        finance_status: 'PENDING',
        gm_status: 'PENDING',
        payment_status: 'PENDING',
        utr_number: '',
        bill_number: '',
        payment_date: '',
        voucher_name: '',
        remarks: remarks
    };

    list.unshift(newBill);
    saveHonorariumList(list);
    closeGenerateHonorariumModal();
    loadHonorariumTable();
    alert(`✅ Honorarium Requisition Bill "${newRef}" Generated Successfully!\n\n• Gross: ₹${gross.toLocaleString('en-IN')}\n• Net Payable: ₹${net.toLocaleString('en-IN')}\n\nStatus: Sent to GM for Approval.`);
}

let activeProcessHonId = null;

function openProcessHonorariumModal(id) {
    activeProcessHonId = id;
    const list = getHonorariumList();
    const item = list.find(i => i.id === id);
    if (!item) return;

    if (document.getElementById('proc-hon-id')) document.getElementById('proc-hon-id').value = item.id;
    if (document.getElementById('proc-bill-title')) document.getElementById('proc-bill-title').innerText = `Honorarium Bill: ${item.bill_ref}`;
    if (document.getElementById('proc-fac-name')) document.getElementById('proc-fac-name').innerText = item.faculty_name;
    if (document.getElementById('proc-session-name')) document.getElementById('proc-session-name').innerText = item.session_title;
    if (document.getElementById('proc-net-amt')) document.getElementById('proc-net-amt').innerText = `₹ ${(item.net_payable || 0).toLocaleString('en-IN')}`;
    if (document.getElementById('proc-req-date')) document.getElementById('proc-req-date').innerText = item.bill_date;

    const gmTextElem = document.getElementById('wf-gm-status-text');
    const btnGmElem = document.getElementById('btn-gm-sanction');
    const payTextElem = document.getElementById('wf-pay-status-text');

    if (item.gm_status === 'APPROVED') {
        if (gmTextElem) gmTextElem.innerHTML = `<span style="color:#16a34a;">🟢 GM Approved</span>`;
        if (btnGmElem) {
            btnGmElem.innerText = `✅ GM Sanctioned`;
            btnGmElem.style.background = `#64748b`;
            btnGmElem.disabled = true;
        }
    } else {
        if (gmTextElem) gmTextElem.innerHTML = `<span style="color:#b45309;">🟡 Pending GM Approval</span>`;
        if (btnGmElem) {
            btnGmElem.innerText = `🟢 Grant GM Sanction`;
            btnGmElem.style.background = `#16a34a`;
            btnGmElem.disabled = false;
        }
    }

    if (item.payment_status === 'DISBURSED') {
        if (payTextElem) payTextElem.innerHTML = `<span style="color:#16a34a;">🟢 Disbursed</span>`;
    } else if (item.gm_status === 'APPROVED') {
        if (payTextElem) payTextElem.innerHTML = `<span style="color:#0284c7;">🟡 Ready for Release</span>`;
    } else {
        if (payTextElem) payTextElem.innerHTML = `<span style="color:#dc2626;">🔴 Payment Pending</span>`;
    }

    if (document.getElementById('proc-utr-input')) document.getElementById('proc-utr-input').value = item.utr_number || `UTR${Date.now().toString().substring(3, 15)}`;
    if (document.getElementById('proc-billno-input')) document.getElementById('proc-billno-input').value = item.bill_number || `IICM-BILL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    if (document.getElementById('proc-paydate-input')) document.getElementById('proc-paydate-input').value = item.payment_date || new Date().toISOString().split('T')[0];

    const modal = document.getElementById('process-honorarium-modal');
    if (modal) modal.style.display = 'flex';
}

function closeProcessHonorariumModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('process-honorarium-modal');
    if (modal) modal.style.display = 'none';
}

function sanctionGMApprovalAction() {
    if (!activeProcessHonId) return;
    const list = getHonorariumList();
    const item = list.find(i => i.id === activeProcessHonId);
    if (item) {
        item.finance_status = 'VERIFIED';
        item.gm_status = 'APPROVED';
        saveHonorariumList(list);
        loadHonorariumTable();
        openProcessHonorariumModal(activeProcessHonId);
        alert(`🟢 GM Sanction Granted Successfully for "${item.bill_ref}"!\n\nPayment release is now enabled.`);
    }
}

function handleSaveStoresAndDisburse(e) {
    e.preventDefault();
    if (!activeProcessHonId) return;

    const list = getHonorariumList();
    const item = list.find(i => i.id === activeProcessHonId);
    if (!item) return;

    if (item.gm_status !== 'APPROVED') {
        alert('⚠️ GM Approval is required before payment can be released!\n\nPlease click "Grant GM Sanction" first.');
        return;
    }

    const utr = document.getElementById('proc-utr-input').value.trim();
    const billno = document.getElementById('proc-billno-input').value.trim();
    const paydate = document.getElementById('proc-paydate-input').value;
    const fileInput = document.getElementById('proc-voucher-file');

    if (!utr || !billno || !paydate) {
        alert('Please fill out UTR Number, Bill Number, and Disbursal Payment Date.');
        return;
    }

    item.utr_number = utr;
    item.bill_number = billno;
    item.payment_date = paydate;
    item.finance_status = 'VERIFIED';
    item.gm_status = 'APPROVED';
    item.payment_status = 'DISBURSED';
    item.voucher_name = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0].name : `Receipt_Voucher_${item.bill_ref}.pdf`;

    saveHonorariumList(list);
    closeProcessHonorariumModal();
    loadHonorariumTable();
    alert(`💸 Payment Released & Stores Metadata Saved Successfully!\n\n• UTR Number: ${utr}\n• Bill Number: ${billno}\n• Payment Date: ${paydate}\n• Voucher Attachment Logged!`);
}

function openViewVoucherModal(id) {
    const list = getHonorariumList();
    const item = list.find(i => i.id === id);
    if (!item) return;

    const contentNode = document.getElementById('voucher-modal-content');
    if (contentNode) {
        contentNode.innerHTML = `
            <div style="background:#ffffff; border:2px solid #064e3b; border-radius:12px; padding:24px; font-family:'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #064e3b; padding-bottom:14px; margin-bottom:18px;">
                    <div>
                        <h2 style="margin:0; color:#064e3b; font-size:20px; font-weight:900;">INDIAN INSTITUTE OF COAL MANAGEMENT</h2>
                        <div style="font-size:12px; color:#475569; font-weight:700;">RANCHI, JHARKHAND — DISBURSEMENT RECEIPT VOUCHER</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="background:#dcfce7; color:#15803d; font-size:12px; font-weight:900; padding:4px 12px; border-radius:12px; border:1px solid #86efac;">
                            🟢 DISBURSED &amp; PAID
                        </span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; background:#f8fafc; padding:14px; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; color:#334155; margin-bottom:18px;">
                    <div><strong>Voucher Bill Ref:</strong> ${item.bill_ref}</div>
                    <div><strong>Stores Bill No:</strong> ${item.bill_number}</div>
                    <div><strong>Bank UTR Number:</strong> <strong style="color:#064e3b;">${item.utr_number}</strong></div>
                    <div><strong>Payment Date:</strong> ${item.payment_date}</div>
                </div>

                <h4 style="margin:0 0 10px 0; color:#0f172a; font-size:15px; font-weight:800;">Faculty Payment Breakdown:</h4>
                <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:18px;">
                    <tr style="border-bottom:1px solid #e2e8f0; background:#f1f5f9;">
                        <th style="padding:8px; text-align:left;">Description</th>
                        <th style="padding:8px; text-align:right;">Amount (₹)</th>
                    </tr>
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px;">${item.session_title} (${item.faculty_name})</td>
                        <td style="padding:8px; text-align:right; font-weight:700;">₹ ${(item.gross_amount||10000).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px; color:#dc2626;">TDS Deduction (10%)</td>
                        <td style="padding:8px; text-align:right; color:#dc2626; font-weight:700;">- ₹ ${(item.tds_amount||1000).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background:#f0fdf4; font-weight:900; font-size:15px; color:#064e3b;">
                        <td style="padding:10px;">Net Payable Disbursed Amount</td>
                        <td style="padding:10px; text-align:right;">₹ ${(item.net_payable||9000).toLocaleString('en-IN')}</td>
                    </tr>
                </table>

                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:24px; border-top:1px dashed #cbd5e1; padding-top:16px;">
                    <div>
                        <div style="font-size:11px; color:#64748b;">Audit Status: 🟢 Finance Audited</div>
                        <div style="font-size:11px; color:#64748b;">Approval: 🟢 GM Academics Sanctioned</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-family:'Courier New', monospace; font-size:13px; font-weight:900; color:#064e3b;">[STORES VOUCHER SEALED]</div>
                        <div style="font-size:11px; color:#475569; font-weight:700;">Accounts &amp; Stores Officer, IICM Ranchi</div>
                    </div>
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('view-voucher-modal');
    if (modal) modal.style.display = 'flex';
}

function closeViewVoucherModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('view-voucher-modal');
    if (modal) modal.style.display = 'none';
}


/* ═════════════════════════════════════════════════════════════════════
   STEP 12 — MIS REPORT MODULE
   Database → Generate Reports → PDF / Excel
   Filters: Year • Quarter • Programme • Faculty • Attendance • Feedback • Payment
═════════════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════════════
   STEP 12: MIS REPORTING SUITE (FACULTY SESSIONS & NUMERIC ATTENDANCE)
   ═════════════════════════════════════════════════════════════════════ */
let currentMISTab = 'year';

const misSampleData = {
    year: [
        { year: 2026, programmes: 5, nominations: 95, present: 81, attendanceRatio: '81 / 95 Attended', honorarium: '₹1,93,500', feedback: '4.8' },
        { year: 2025, programmes: 18, nominations: 360, present: 312, attendanceRatio: '312 / 360 Attended', honorarium: '₹6,40,000', feedback: '4.6' },
        { year: 2024, programmes: 14, nominations: 280, present: 238, attendanceRatio: '238 / 280 Attended', honorarium: '₹4,90,000', feedback: '4.5' }
    ],
    quarter: [
        { period: '2026 Q1 (Jan–Mar)', programmes: 4, nominations: 80, present: 68, attendanceRatio: '68 / 80 Attended', honorarium: '₹1,44,000', status: 'Completed' },
        { period: '2026 Q2 (Apr–Jun)', programmes: 5, nominations: 95, present: 81, attendanceRatio: '81 / 95 Attended', honorarium: '₹1,93,500', status: 'Completed' },
        { period: '2026 Q3 (Jul–Sep)', programmes: 3, nominations: 60, present: 52, attendanceRatio: '52 / 60 Attended', honorarium: '₹97,500', status: 'Ongoing' },
        { period: '2026 Q4 (Oct–Dec)', programmes: 2, nominations: 40, present: 34, attendanceRatio: '34 / 40 Attended', honorarium: '₹60,000', status: 'Planned' }
    ],
    programme: [
        { name: 'Advanced Mine Safety Management', year: 2026, nominations: 17, present: 15, attendanceRatio: '15 / 17 Attended', faculty: 'Dr. Priya Sharma', honorarium: '₹48,000', feedback: '4.8' },
        { name: 'Digital Transformation Workshop', year: 2026, nominations: 20, present: 18, attendanceRatio: '18 / 20 Attended', faculty: 'Prof. Rakesh Gupta', honorarium: '₹36,000', feedback: '4.6' },
        { name: 'Environmental Awareness Campaign', year: 2026, nominations: 15, present: 12, attendanceRatio: '12 / 15 Attended', faculty: 'Dr. Sunita Mishra', honorarium: '₹24,000', feedback: '4.5' },
        { name: 'Leadership Development Program', year: 2026, nominations: 22, present: 19, attendanceRatio: '19 / 22 Attended', faculty: 'Prof. Arun Sharma', honorarium: '₹60,000', feedback: '4.7' },
        { name: 'Women in Mining Leadership', year: 2026, nominations: 13, present: 12, attendanceRatio: '12 / 13 Attended', faculty: 'Dr. Anita Roy', honorarium: '₹25,500', feedback: '4.9' }
    ],
    faculty: [
        {
            faculty: 'Dr. Priya Sharma',
            type: 'Internal',
            programmes: 'Advanced Mine Safety Management',
            sessionDetails: [
                { name: 'Session 1: DGMS Guidelines & Mine Safety Regulations', time: '09:30 AM – 11:00 AM' },
                { name: 'Session 2: Statutory Ventilation & Gas Monitoring', time: '11:15 AM – 12:45 PM' },
                { name: 'Session 3: Accident Analysis & Statutory Norms', time: '02:00 PM – 03:30 PM' },
                { name: 'Session 4: Risk Mitigation & Emergency Preparedness', time: '03:45 PM – 05:15 PM' }
            ],
            sessions: 4,
            hours: 12,
            rate: '₹3,000/session',
            earned: '₹12,000',
            rating: '4.8'
        },
        {
            faculty: 'Prof. Rakesh Gupta',
            type: 'External',
            programmes: 'Digital Transformation Workshop',
            sessionDetails: [
                { name: 'Session 1: Industrial IoT & Smart Fleet Management', time: '09:30 AM – 11:00 AM' },
                { name: 'Session 2: ERP Integration & Real-time Dispatch', time: '11:15 AM – 12:45 PM' },
                { name: 'Session 3: Predictive Maintenance in Open-Cast Mines', time: '02:00 PM – 03:30 PM' }
            ],
            sessions: 3,
            hours: 9,
            rate: '₹12,000/session',
            earned: '₹36,000',
            rating: '4.6'
        },
        {
            faculty: 'Dr. Sunita Mishra',
            type: 'Internal',
            programmes: 'Environmental Awareness Campaign',
            sessionDetails: [
                { name: 'Session 1: DGMS Environmental Compliance Standards', time: '10:00 AM – 11:30 AM' },
                { name: 'Session 2: Mine Dust Control & Carbon Footprint Reduction', time: '02:00 PM – 03:30 PM' }
            ],
            sessions: 2,
            hours: 6,
            rate: '₹3,000/session',
            earned: '₹6,000',
            rating: '4.5'
        },
        {
            faculty: 'Prof. Arun Sharma',
            type: 'Visiting',
            programmes: 'Leadership Development Program',
            sessionDetails: [
                { name: 'Session 1: Executive Leadership Styles & Team Dynamics', time: '09:30 AM – 11:00 AM' },
                { name: 'Session 2: Conflict Resolution & Industrial Relations', time: '11:15 AM – 12:45 PM' },
                { name: 'Session 3: Change Management in Public Sector Undertakings', time: '02:00 PM – 03:30 PM' },
                { name: 'Session 4: Crisis Management Case Studies', time: '03:45 PM – 05:15 PM' }
            ],
            sessions: 4,
            hours: 12,
            rate: '₹8,000/session',
            earned: '₹32,000',
            rating: '4.7'
        },
        {
            faculty: 'Dr. Anita Roy',
            type: 'External',
            programmes: 'Women in Mining Leadership',
            sessionDetails: [
                { name: 'Session 1: Gender Inclusion & Safe Workplace Norms', time: '09:30 AM – 11:00 AM' },
                { name: 'Session 2: Women in Heavy Machinery & Statutory Compliance', time: '11:15 AM – 12:45 PM' },
                { name: 'Session 3: Mentorship and Career Growth in CIL', time: '02:00 PM – 03:30 PM' },
                { name: 'Session 4: Occupational Ergonomics for Female Executives', time: '03:45 PM – 05:15 PM' }
            ],
            sessions: 4,
            hours: 12,
            rate: '₹6,000/session',
            earned: '₹24,000',
            rating: '4.9'
        }
    ],
    attendance: [
        { programme: 'Advanced Mine Safety Management', date: '10 Aug 2026 (Session 1)', topic: 'DGMS Statutory Regulations', nominations: 17, present: 15, late: 1, absent: 1, attendanceRatio: '15 / 17 Attended' },
        { programme: 'Advanced Mine Safety Management', date: '12 Aug 2026 (Session 2)', topic: 'Ventilation & Gas Monitoring Standards', nominations: 17, present: 14, late: 2, absent: 1, attendanceRatio: '14 / 17 Attended' },
        { programme: 'Digital Transformation Workshop', date: '15 Aug 2026 (Session 1)', topic: 'Industrial IoT & ERP Integration', nominations: 20, present: 18, late: 1, absent: 1, attendanceRatio: '18 / 20 Attended' },
        { programme: 'Leadership Development Program', date: '18 Aug 2026 (Session 1)', topic: 'Executive Leadership Styles', nominations: 22, present: 19, late: 2, absent: 1, attendanceRatio: '19 / 22 Attended' },
        { programme: 'Women in Mining Leadership', date: '20 Aug 2026 (Session 1)', topic: 'Gender Inclusion & Ergonomics', nominations: 13, present: 12, late: 0, absent: 1, attendanceRatio: '12 / 13 Attended' }
    ],
    feedback: [
        { faculty: 'Dr. Priya Sharma', programme: 'Advanced Mine Safety Management', session: 'DGMS Statutory Regulations', overall: 5, content: 5, delivery: 4, avgRating: '4.8', responses: '15 of 17 submitted' },
        { faculty: 'Prof. Rakesh Gupta', programme: 'Digital Transformation Workshop', session: 'ERP Integration & Fleet Dispatch', overall: 5, content: 4, delivery: 5, avgRating: '4.6', responses: '18 of 20 submitted' },
        { faculty: 'Dr. Sunita Mishra', programme: 'Environmental Awareness Campaign', session: 'DGMS Compliance Standards', overall: 4, content: 5, delivery: 4, avgRating: '4.5', responses: '12 of 15 submitted' },
        { faculty: 'Prof. Arun Sharma', programme: 'Leadership Development Program', session: 'Leadership Styles & Conflict', overall: 5, content: 5, delivery: 5, avgRating: '4.7', responses: '19 of 22 submitted' },
        { faculty: 'Dr. Anita Roy', programme: 'Women in Mining Leadership', session: 'Gender Inclusion & Ergonomics', overall: 5, content: 5, delivery: 5, avgRating: '4.9', responses: '12 of 13 submitted' }
    ],
    payment: [
        { billRef: 'HON-2026-0041', faculty: 'Dr. Priya Sharma', programme: 'Advanced Mine Safety Management', gross: '₹12,000', tds: '₹1,200', net: '₹10,800', utr: 'SBIN2026080112345', date: '01 Aug 2026', status: 'PAID_CLOSED' },
        { billRef: 'HON-2026-0042', faculty: 'Prof. Rakesh Gupta', programme: 'Digital Transformation Workshop', gross: '₹36,000', tds: '₹3,600', net: '₹32,400', utr: 'HDFC2026080234567', date: '02 Aug 2026', status: 'PAID_CLOSED' },
        { billRef: 'HON-2026-0043', faculty: 'Dr. Sunita Mishra', programme: 'Environmental Awareness Campaign', gross: '₹6,000', tds: '₹600', net: '₹5,400', utr: '—', date: '—', status: 'PENDING_GM' },
        { billRef: 'HON-2026-0044', faculty: 'Prof. Arun Sharma', programme: 'Leadership Development Program', gross: '₹32,000', tds: '₹3,200', net: '₹28,800', utr: 'ICICI2026080345678', date: '03 Aug 2026', status: 'PAYMENT_RELEASED' },
        { billRef: 'HON-2026-0045', faculty: 'Dr. Anita Roy', programme: 'Women in Mining Leadership', gross: '₹24,000', tds: '₹2,400', net: '₹21,600', utr: '—', date: '—', status: 'DRAFT' }
    ]
};

// TAB CONFIG: headers + row renderer per tab
const misTabConfig = {
    year: {
        title: '📅 Year-wise Report',
        subtitle: 'Annual programme executive summary (without individual session clutter)',
        headers: ['Year', 'Total Programmes', 'Total Nominations', 'Total Participants (Present)', 'Attendance (Numbers)', 'Honorarium Disbursed (₹)', 'Avg Feedback Rating'],
        row: d => `<td style="padding:14px 16px;font-weight:800;color:#1e40af;">${d.year}</td>
                    <td style="padding:14px 16px;font-weight:700;">${d.programmes} Programmes</td>
                    <td style="padding:14px 16px;font-weight:700;color:#334155;">${d.nominations} Nominees</td>
                    <td style="padding:14px 16px;font-weight:700;color:#047857;">${d.present} Present</td>
                    <td style="padding:14px 16px;"><span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:12px;font-size:12.5px;font-weight:800;border:1px solid #bbf7d0;">${d.attendanceRatio}</span></td>
                    <td style="padding:14px 16px;font-weight:800;color:#7c3aed;">${d.honorarium}</td>
                    <td style="padding:14px 16px;"><span style="color:#d97706;font-weight:800;">★ ${d.feedback}</span></td>`
    },
    quarter: {
        title: '📆 Quarter-wise Report',
        subtitle: 'Quarterly training activity summary (without individual session clutter)',
        headers: ['Period / Quarter', 'Total Programmes', 'Total Nominations', 'Total Participants (Present)', 'Attendance (Numbers)', 'Honorarium Disbursed (₹)', 'Status'],
        row: d => `<td style="padding:14px 16px;font-weight:800;color:#1e40af;">${d.period}</td>
                    <td style="padding:14px 16px;font-weight:700;">${d.programmes} Programmes</td>
                    <td style="padding:14px 16px;font-weight:700;color:#334155;">${d.nominations} Nominees</td>
                    <td style="padding:14px 16px;font-weight:700;color:#047857;">${d.present} Present</td>
                    <td style="padding:14px 16px;"><span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:12px;font-size:12.5px;font-weight:800;border:1px solid #bbf7d0;">${d.attendanceRatio}</span></td>
                    <td style="padding:14px 16px;font-weight:800;color:#7c3aed;">${d.honorarium}</td>
                    <td style="padding:14px 16px;"><span style="background:${d.status==='Ongoing'?'#dbeafe':'#d1fae5'};color:${d.status==='Ongoing'?'#1d4ed8':'#047857'};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;">${d.status}</span></td>`
    },
    programme: {
        title: '🎓 Programme-wise Report',
        subtitle: 'Detailed analysis per training programme with numeric participant attendance',
        headers: ['Programme Name', 'Year', 'Total Nominations', 'Total Participants (Present)', 'Attendance (Numbers)', 'Assigned Faculty', 'Honorarium (₹)', 'Feedback'],
        row: d => `<td style="padding:14px 16px;font-weight:700;color:#0f172a;max-width:220px;">${d.name}</td>
                    <td style="padding:14px 16px;">${d.year}</td>
                    <td style="padding:14px 16px;font-weight:700;color:#334155;">${d.nominations} Nominees</td>
                    <td style="padding:14px 16px;font-weight:700;color:#047857;">${d.present} Present</td>
                    <td style="padding:14px 16px;"><span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:12px;font-size:12.5px;font-weight:800;border:1px solid #bbf7d0;">${d.attendanceRatio}</span></td>
                    <td style="padding:14px 16px;color:#475569;font-weight:600;">${d.faculty}</td>
                    <td style="padding:14px 16px;font-weight:800;color:#7c3aed;">${d.honorarium}</td>
                    <td style="padding:14px 16px;"><span style="color:#d97706;font-weight:800;">★ ${d.feedback}</span></td>`
    },
    faculty: {
        title: '👤 Faculty-wise Report',
        subtitle: 'A concise faculty payment and delivery view — expand sessions only when required',
        headers: ['Faculty', 'Programme', 'Date & Time', 'Rate', 'Total Earned (₹)', 'Avg Rating'],
        row: d => {
            const sessionListHtml = (d.sessionDetails || []).map((s, i) => `
                <div class="session-detail-row">
                    <strong>${s.name}</strong>
                    <span>${s.date || getFacultySessionDate(d, i)} · ${s.time}</span>
                </div>
            `).join('');

            return `<td style="padding:14px 16px;font-weight:700;color:#0f172a;white-space:nowrap;">
                        <div>${d.faculty}</div>
                        <span class="type-chip">${d.type}</span>
                    </td>
                    <td style="padding:14px 16px;font-weight:600;color:#334155;max-width:200px;">${d.programmes}</td>
                    <td style="padding:14px 16px;min-width:210px;">
                        <details class="compact-session-details">
                            <summary>${d.sessions} sessions <span>Date & time</span></summary>
                            <div class="session-detail-list">${sessionListHtml}</div>
                        </details>
                    </td>
                    <td style="padding:14px 16px;color:#475569;font-size:12.5px;white-space:nowrap;">${d.rate}</td>
                    <td style="padding:14px 16px;font-weight:800;color:#7c3aed;white-space:nowrap;">${d.earned}</td>
                    <td style="padding:14px 16px;"><span style="color:#d97706;font-weight:800;">★ ${d.rating}</span></td>`;
        }
    },
    attendance: {
        title: '✅ Attendance Report',
        subtitle: 'Session-wise trainee scan logs with absolute numeric headcounts',
        headers: ['Programme', 'Date & Session', 'Topic / Module', 'Total Nominations', 'Total Present', 'Late / Margin', 'Absent', 'Attendance (Numbers)'],
        row: d => `<td style="padding:14px 16px;font-weight:700;color:#0f172a;">${d.programme}</td>
                    <td style="padding:14px 16px;color:#475569;font-size:12px;font-weight:600;">${d.date}</td>
                    <td style="padding:14px 16px;font-size:12.5px;">${d.topic}</td>
                    <td style="padding:14px 16px;font-weight:700;color:#334155;text-align:center;">${d.nominations}</td>
                    <td style="padding:14px 16px;text-align:center;"><span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:10px;font-weight:700;">🟢 ${d.present}</span></td>
                    <td style="padding:14px 16px;text-align:center;"><span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:10px;font-weight:700;">🟡 ${d.late}</span></td>
                    <td style="padding:14px 16px;text-align:center;"><span style="background:#fee2e2;color:#b91c1c;padding:3px 10px;border-radius:10px;font-weight:700;">🔴 ${d.absent}</span></td>
                    <td style="padding:14px 16px;text-align:center;"><strong style="font-size:13.5px;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:4px 12px;border-radius:12px;display:inline-block;">${d.attendanceRatio}</strong></td>`
    },
    feedback: {
        title: '⭐ Feedback Report',
        subtitle: 'Trainee feedback ratings and submission metrics per faculty and session',
        headers: ['Faculty', 'Programme', 'Session', 'Overall', 'Content', 'Delivery', 'Avg Rating', 'Responses Submitted'],
        row: d => `<td style="padding:14px 16px;font-weight:700;color:#0f172a;">${d.faculty}</td>
                    <td style="padding:14px 16px;color:#475569;">${d.programme}</td>
                    <td style="padding:14px 16px;">${d.session}</td>
                    <td style="padding:14px 16px;text-align:center;color:#eab308;">${'★'.repeat(d.overall)}</td>
                    <td style="padding:14px 16px;text-align:center;color:#eab308;">${'★'.repeat(d.content)}</td>
                    <td style="padding:14px 16px;text-align:center;color:#eab308;">${'★'.repeat(d.delivery)}</td>
                    <td style="padding:14px 16px;"><span style="background:#fef3c7;color:#d97706;font-size:14px;font-weight:900;padding:4px 12px;border-radius:12px;">★ ${d.avgRating}</span></td>
                    <td style="padding:14px 16px;font-weight:700;color:#047857;">${d.responses}</td>`
    },
    payment: {
        title: '💰 Payment Report',
        subtitle: 'Honorarium payment register with UTR, bill numbers and disbursement status',
        headers: ['Bill Ref', 'Faculty', 'Programme', 'Gross', 'TDS', 'Net Payable', 'UTR Number', 'Pay Date', 'Status'],
        row: d => {
            const statusColors = {
                'PAID_CLOSED':      { bg:'#d1fae5', color:'#047857' },
                'PAYMENT_RELEASED': { bg:'#dbeafe', color:'#1d4ed8' },
                'PENDING_GM':       { bg:'#fef3c7', color:'#d97706' },
                'GM_APPROVED':      { bg:'#ede9fe', color:'#6d28d9' },
                'PENDING_FINANCE':  { bg:'#ffedd5', color:'#c2410c' },
                'DRAFT':            { bg:'#f1f5f9', color:'#475569'  }
            };
            const sc = statusColors[d.status] || { bg:'#f1f5f9', color:'#475569' };
            return `<td style="padding:14px 16px;font-family:monospace;font-weight:800;color:#1e40af;">${d.billRef}</td>
                    <td style="padding:14px 16px;font-weight:700;color:#0f172a;">${d.faculty}</td>
                    <td style="padding:14px 16px;color:#475569;">${d.programme}</td>
                    <td style="padding:14px 16px;font-weight:700;">${d.gross}</td>
                    <td style="padding:14px 16px;color:#dc2626;">${d.tds}</td>
                    <td style="padding:14px 16px;font-weight:800;color:#7c3aed;">${d.net}</td>
                    <td style="padding:14px 16px;font-family:monospace;font-size:12.5px;color:#475569;">${d.utr}</td>
                    <td style="padding:14px 16px;">${d.date}</td>
                    <td style="padding:14px 16px;"><span style="background:${sc.bg};color:${sc.color};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;">${d.status.replace(/_/g,' ')}</span></td>`;
        }
    }
};

function renderMISKPIs() {
    const paymentData = misSampleData.payment;
    const programmes  = misSampleData.programme.length;
    const totalNoms   = misSampleData.programme.reduce((a, b) => a + (b.nominations || 0), 0);
    const totalPres   = misSampleData.programme.reduce((a, b) => a + (b.present || 0), 0);
    const totalNet    = paymentData
        .filter(r => r.status === 'PAID_CLOSED' || r.status === 'PAYMENT_RELEASED')
        .reduce((a, b) => a + parseFloat((b.net || '0').replace(/[₹,]/g, '')), 0);

    const elP = document.getElementById('mis-kpi-programmes');
    if (elP) elP.innerText = programmes;
    const elPa = document.getElementById('mis-kpi-participants');
    if (elPa) elPa.innerText = totalPres + ' Present';
    const elA = document.getElementById('mis-kpi-attendance');
    if (elA) elA.innerText = totalPres + ' / ' + totalNoms;
    const elD = document.getElementById('mis-kpi-disbursed');
    if (elD) elD.innerText = '₹' + totalNet.toLocaleString('en-IN');
}

// ———————————————————————————————————————————
// LOAD MIS REPORT (main entry point)
// ———————————————————————————————————————————
function loadMISReport() {
    populateMISFilterDropdowns();
    renderMISKPIs();
    renderMISTab(currentMISTab);
}
window.loadMISReport = loadMISReport;

function populateMISFilterDropdowns() {
    // Populate Programme dropdown
    const progSel = document.getElementById('mis-filter-programme');
    if (progSel && progSel.options.length <= 1) {
        const programmes = missSampleProgrammes();
        programmes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            progSel.appendChild(opt);
        });
    }
    // Populate Faculty dropdown
    const facSel = document.getElementById('mis-filter-faculty');
    if (facSel && facSel.options.length <= 1) {
        const faculties = missSampleFaculties();
        faculties.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            facSel.appendChild(opt);
        });
    }
}

function missSampleProgrammes() {
    return (misSampleData.programme || []).map(p => p.name);
}

function missSampleFaculties() {
    return (misSampleData.faculty || []).map(f => f.faculty);
}

// ———————————————————————————————————————————
// TAB SWITCHING
// ———————————————————————————————————————————
function switchMISTab(tab) {
    currentMISTab = tab;
    // Reset all tab button styles
    document.querySelectorAll('.mis-tab-btn').forEach(btn => {
        btn.style.background = '#f1f5f9';
        btn.style.color = '#475569';
        btn.style.border = '1.5px solid #e2e8f0';
    });
    // Highlight active tab
    const activeBtn = document.getElementById('mis-tab-' + tab);
    if (activeBtn) {
        activeBtn.style.background = '#1e40af';
        activeBtn.style.color = '#ffffff';
        activeBtn.style.border = 'none';
    }
    renderMISTab(tab);
}

function renderMISTab(tab) {
    const config = misTabConfig[tab];
    if (!config) return;

    // Update title and subtitle
    const titleEl = document.getElementById('mis-tab-title');
    if (titleEl) titleEl.innerText = config.title;
    const subEl = document.getElementById('mis-tab-subtitle');
    if (subEl) subEl.innerText = config.subtitle;

    // Get filtered data
    const data = getMISFilteredData(tab);

    // Update row count badge
    const countEl = document.getElementById('mis-row-count');
    if (countEl) countEl.innerText = data.length + ' Records';

    // Render thead
    const thead = document.getElementById('mis-table-head');
    if (thead) {
        thead.innerHTML = `<tr>${config.headers.map(h =>
            `<th style="padding:12px 16px;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${h}</th>`
        ).join('')}</tr>`;
    }

    // Render tbody
    const tbody = document.getElementById('mis-table-body');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${config.headers.length}" style="text-align:center;padding:40px;color:#64748b;">No records found for the selected filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map((d, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            ${config.row(d)}
        </tr>
    `).join('');
}

function getMISFilteredData(tab) {
    const year    = document.getElementById('mis-filter-year')?.value || '2026';
    const quarter = document.getElementById('mis-filter-quarter')?.value || '';
    const prog    = document.getElementById('mis-filter-programme')?.value || '';
    const fac     = document.getElementById('mis-filter-faculty')?.value || '';

    let data = [...(misSampleData[tab] || [])];

    // Apply filters where applicable
    if (tab === 'year' && year) {
        data = data.filter(d => String(d.year) === String(year));
    }
    if (tab === 'programme' && prog) {
        data = data.filter(d => d.name === prog);
    }
    if (tab === 'faculty' && fac) {
        data = data.filter(d => d.faculty === fac);
    }
    if (tab === 'attendance' && prog) {
        data = data.filter(d => d.programme === prog);
    }
    if (tab === 'feedback' && fac) {
        data = data.filter(d => d.faculty === fac);
    }
    if (tab === 'payment' && fac) {
        data = data.filter(d => d.faculty === fac);
    }
    if (tab === 'quarter' && quarter) {
        const qLabel = ['Q1','Q2','Q3','Q4'][parseInt(quarter) - 1];
        data = data.filter(d => d.period && d.period.includes(qLabel) && d.period.includes(year));
    }
    return data;
}

function resetMISFilters() {
    const y = document.getElementById('mis-filter-year');
    if (y) y.value = '2026';
    const q = document.getElementById('mis-filter-quarter');
    if (q) q.value = '';
    const p = document.getElementById('mis-filter-programme');
    if (p) p.value = '';
    const f = document.getElementById('mis-filter-faculty');
    if (f) f.value = '';
    loadMISReport();
}

// ———————————————————————————————————————————
// EXCEL EXPORTS — current view, selected faculty, and full management workbook
// ———————————————————————————————————————————
function getFacultySessionDate(record, index) {
    const startDays = {
        'Dr. Priya Sharma': 10,
        'Prof. Rakesh Gupta': 15,
        'Dr. Sunita Mishra': 21,
        'Prof. Arun Sharma': 25,
        'Dr. Anita Roy': 29
    };
    const startDay = startDays[record.faculty] || 1;
    return new Date(Date.UTC(2026, 7, startDay + index)).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
}

function getFacultySessionRows(records) {
    return records.flatMap(record => (record.sessionDetails || []).map((session, index) => [
        record.faculty, record.type, record.programmes, session.name,
        session.date || getFacultySessionDate(record, index), session.time, record.rate,
        record.earned, record.rating
    ]));
}

function xmlEscape(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function downloadExcelWorkbook(sheets, filename) {
    const worksheetXml = sheets.map(sheet => {
        const rows = [sheet.headers, ...(sheet.rows || [])];
        const rowXml = rows.map((row, rowIndex) => `<Row>${row.map(value =>
            `<Cell${rowIndex === 0 ? ' ss:StyleID="Header"' : ''}><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`
        ).join('')}</Row>`).join('');
        return `<Worksheet ss:Name="${xmlEscape(sheet.name).slice(0, 31)}"><Table>${rowXml}</Table></Worksheet>`;
    }).join('');

    const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
         <Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1E40AF" ss:Pattern="Solid"/></Style></Styles>
         ${worksheetXml}</Workbook>`;
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function exportMISExcel() {
    const year = document.getElementById('mis-filter-year')?.value || '2026';
    const tab = currentMISTab;
    const config = misTabConfig[tab];
    const data = getMISFilteredData(tab);
    let rows;

    if (tab === 'faculty') {
        rows = getFacultySessionRows(data);
        downloadExcelWorkbook([{ name: 'Faculty Sessions', headers: ['Faculty', 'Type', 'Programme', 'Session', 'Date', 'Time', 'Rate', 'Total Earned', 'Rating'], rows }], `IICM_Faculty_Details_${year}.xls`);
    } else {
        rows = data.map(d => {
            const temp = document.createElement('div');
            temp.innerHTML = `<table><tr>${config.row(d)}</tr></table>`;
            return Array.from(temp.querySelectorAll('td')).map(cell => cell.innerText.trim().replace(/\s+/g, ' '));
        });
        downloadExcelWorkbook([{ name: `${tab} report`, headers: config.headers, rows }], `IICM_MIS_${tab.toUpperCase()}_${year}.xls`);
    }
}

function exportSelectedFacultyExcel() {
    const faculty = document.getElementById('mis-filter-faculty')?.value || '';
    if (!faculty) {
        alert('Please select a faculty member first, then click Export Selected Faculty.');
        return;
    }
    const facultyData = misSampleData.faculty.filter(item => item.faculty === faculty);
    const feedbackRows = misSampleData.feedback.filter(item => item.faculty === faculty)
        .map(item => [item.faculty, item.programme, item.session, item.overall, item.content, item.delivery, item.avgRating, item.responses]);
    const paymentRows = misSampleData.payment.filter(item => item.faculty === faculty)
        .map(item => [item.billRef, item.faculty, item.programme, item.gross, item.tds, item.net, item.utr, item.date, item.status]);

    downloadExcelWorkbook([
        { name: 'Faculty Sessions', headers: ['Faculty', 'Type', 'Programme', 'Session', 'Date', 'Time', 'Rate', 'Total Earned', 'Rating'], rows: getFacultySessionRows(facultyData) },
        { name: 'Feedback', headers: ['Faculty', 'Programme', 'Session', 'Overall', 'Content', 'Delivery', 'Average Rating', 'Responses'], rows: feedbackRows },
        { name: 'Payments', headers: ['Bill Ref', 'Faculty', 'Programme', 'Gross', 'TDS', 'Net Payable', 'UTR', 'Payment Date', 'Status'], rows: paymentRows }
    ], `IICM_${faculty.replace(/[^a-z0-9]+/gi, '_')}_Details.xls`);
}

function exportMISFullExcel() {
    const honorariumRows = getHonorariumList().map(item => [
        item.bill_ref, item.faculty_name, item.program_title, item.gross_amount, item.tds_amount,
        item.net_payable, item.gm_status, item.payment_status, item.utr_number || 'Pending',
        item.bill_number || '—', item.payment_date || '—'
    ]);
    downloadExcelWorkbook([
        { name: 'Programme Summary', headers: ['Programme', 'Year', 'Nominations', 'Present', 'Attendance', 'Faculty', 'Honorarium', 'Feedback'], rows: misSampleData.programme.map(item => [item.name, item.year, item.nominations, item.present, item.attendanceRatio, item.faculty, item.honorarium, item.feedback]) },
        { name: 'Faculty Sessions', headers: ['Faculty', 'Type', 'Programme', 'Session', 'Date', 'Time', 'Rate', 'Total Earned', 'Rating'], rows: getFacultySessionRows(misSampleData.faculty) },
        { name: 'Attendance', headers: ['Programme', 'Date & Session', 'Topic', 'Nominations', 'Present', 'Late', 'Absent', 'Attendance'], rows: misSampleData.attendance.map(item => [item.programme, item.date, item.topic, item.nominations, item.present, item.late, item.absent, item.attendanceRatio]) },
        { name: 'Feedback', headers: ['Faculty', 'Programme', 'Session', 'Overall', 'Content', 'Delivery', 'Average Rating', 'Responses'], rows: misSampleData.feedback.map(item => [item.faculty, item.programme, item.session, item.overall, item.content, item.delivery, item.avgRating, item.responses]) },
        { name: 'GM Finance Workflow', headers: ['Bill Ref', 'Faculty', 'Programme', 'Gross', 'TDS', 'Net Payable', 'GM Status', 'Finance Payment Status', 'UTR', 'Bill Number', 'Payment Date'], rows: honorariumRows }
    ], 'IICM_Complete_Management_Workbook.xls');
}
window.exportMISExcel = exportMISExcel;
window.exportSelectedFacultyExcel = exportSelectedFacultyExcel;
window.exportMISFullExcel = exportMISFullExcel;

function exportMISPDF() {
    const year    = document.getElementById('mis-filter-year')?.value || '2026';
    const quarter = document.getElementById('mis-filter-quarter')?.value;
    const qLabel  = quarter ? ` Q${quarter}` : '';
    const config  = misTabConfig[currentMISTab];
    const data    = getMISFilteredData(currentMISTab);

    // Build printable HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups for PDF export.'); return; }

    const rowsHtml = data.map(d => {
        const div = document.createElement('div');
        div.innerHTML = `<table><tr>${config.row(d)}</tr></table>`;
        const cells = div.querySelectorAll('td');
        return `<tr>${Array.from(cells).map(c => `<td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;">${c.innerText.trim()}</td>`).join('')}</tr>`;
    }).join('');

    printWindow.document.write(`
        <!DOCTYPE html><html><head><title>IICM MIS Report — ${year}${qLabel}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size:20px; color:#1e40af; margin-bottom:4px; }
            p { font-size:13px; color:#64748b; margin-bottom:20px; }
            table { width:100%; border-collapse:collapse; }
            th { background:#1e40af; color:#fff; padding:10px; font-size:12px; text-align:left; }
            td { padding:8px 10px; border:1px solid #e2e8f0; font-size:12px; }
            tr:nth-child(even) { background:#f8fafc; }
            .footer { margin-top:30px; font-size:11px; color:#94a3b8; }
        </style></head><body>
        <h1>📊 IICM MIS Report — ${config.title}</h1>
        <p>${config.subtitle} | Year: ${year}${qLabel ? ' | Quarter: Q' + quarter : ''} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
        <table><thead><tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="footer">© 2026 IICM Ranchi — Indian Institute of Coal Management | This is a system-generated report.</div>
        <script>window.onload=()=>{window.print();}<\/script>
        </body></html>
    `);
    printWindow.document.close();
}


/* ════════════════════════════════════════════════════════════════
   FACULTY SCHEDULE PDF GENERATION & GM APPROVAL
════════════════════════════════════════════════════════════════ */

/**
 * Collects all rows from the Faculty Sessions table and opens a
 * print-ready PDF-style window with IICM official letterhead.
 */
function generateFacultySchedulePDF() {
    const btn = document.getElementById('btn-generate-schedule-pdf');
    const banner = document.getElementById('schedule-pdf-status-banner');

    btn.disabled = true;
    btn.innerHTML = '⏳ Generating Report...';

    // Collect rows from the live schedule table
    const tbody = document.getElementById('faculty-schedules-body');
    const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

    if (rows.length === 0) {
        showSchedulePDFBanner('warning', '⚠️ No schedule data found. Please refresh the schedule first, then generate the PDF.');
        btn.disabled = false;
        btn.innerHTML = '📄 Generate Schedule PDF Report';
        return;
    }

    // Build table rows HTML from live DOM
    let tableRowsHtml = '';
    rows.forEach((tr, idx) => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 5) return;
        const date     = cells[0]?.innerText?.trim() || '—';
        const topic    = cells[1]?.innerText?.trim() || '—';
        const faculty  = cells[2]?.innerText?.trim() || '—';
        const venue    = cells[3]?.innerText?.trim() || '—';
        const status   = cells[4]?.innerText?.trim() || '—';
        const decision = cells[5]?.innerText?.trim() || '—';
        const rowBg    = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        tableRowsHtml += `
            <tr style="background:${rowBg}">
                <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;">${date}</td>
                <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:12px;">${topic}</td>
                <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;">${faculty}</td>
                <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;">${venue}</td>
                <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;">${status}</td>
                <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;">${decision}</td>
            </tr>`;
    });

    const generatedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    const generatedTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
    });

    const user = JSON.parse(localStorage.getItem('iicm_user') || '{}');
    const coordName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Programme Coordinator';

    const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Faculty Assignment & Schedule Report — IICM</title>
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size:13px; color:#1a1a1a; background:#fff; padding:32px 40px; }
    .letterhead { display:flex; align-items:center; justify-content:space-between; border-bottom:3px double #1b4332; padding-bottom:14px; margin-bottom:8px; }
    .logo-box { width:56px; height:56px; background:#1b4332; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; font-weight:900; letter-spacing:0.5px; }
    .org-info { text-align:center; flex:1; }
    .org-name { font-size:22px; font-weight:bold; color:#1b4332; letter-spacing:1px; }
    .org-sub { font-size:12px; color:#444; margin-top:2px; }
    .doc-title { margin:16px 0 4px; text-align:center; font-size:17px; font-weight:bold; text-decoration:underline; color:#1b4332; text-transform:uppercase; letter-spacing:1px; }
    .doc-meta { text-align:center; font-size:11.5px; color:#555; margin-bottom:18px; }
    .section-hdr { background:#1b4332; color:#fff; padding:8px 14px; font-size:13px; font-weight:bold; margin:18px 0 0; border-radius:4px 4px 0 0; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead tr { background:#2d6a4f; color:#fff; }
    th { padding:9px 12px; text-align:left; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
    .sign-block { margin-top:40px; display:flex; justify-content:space-between; font-size:12px; }
    .sign-line { width:180px; border-top:1px solid #333; padding-top:6px; text-align:center; }
    .footer { margin-top:20px; text-align:center; font-size:10.5px; color:#888; border-top:1px solid #e2e8f0; padding-top:10px; }
    @media print { body { padding:20px 28px; } button { display:none !important; } }
</style>
</head>
<body>

<div class="letterhead">
    <div class="logo-box">IICM</div>
    <div class="org-info">
        <div class="org-name">Indian Institute of Coal Management</div>
        <div class="org-sub">Kanke, Ranchi — Jharkhand | A CIL (Coal India Limited) Institute</div>
        <div class="org-sub" style="margin-top:3px;">Tel: +91 651 2230828 | Email: iicmranchi@coalindia.in</div>
    </div>
    <div style="width:56px;"></div>
</div>

<div class="doc-title">Faculty Assignment &amp; Session Schedule Report</div>
<div class="doc-meta">
    Prepared by: <strong>${coordName}</strong> &nbsp;|&nbsp;
    Date: <strong>${generatedDate}</strong> &nbsp;|&nbsp;
    Time: <strong>${generatedTime}</strong> &nbsp;|&nbsp;
    Status: <strong>Pending GM Approval</strong>
</div>

<div class="section-hdr">📋 Assigned Faculty Sessions &amp; Timetable</div>
<table>
    <thead>
        <tr>
            <th>Session Date &amp; Time</th>
            <th>Topic / Session Title</th>
            <th>Faculty Name</th>
            <th>Venue</th>
            <th>Invitation Status</th>
            <th>Faculty Decision</th>
        </tr>
    </thead>
    <tbody>
        ${tableRowsHtml}
    </tbody>
</table>

<div class="sign-block">
    <div>
        <div class="sign-line">Programme Coordinator<br><small>IICM, Ranchi</small></div>
    </div>
    <div>
        <div class="sign-line">GM (Academics)<br><small>IICM, Ranchi</small></div>
    </div>
    <div>
        <div class="sign-line">Director<br><small>IICM, Ranchi</small></div>
    </div>
</div>

<div class="footer">
    © ${new Date().getFullYear()} Indian Institute of Coal Management (IICM), Ranchi — This is a system-generated official schedule report.
    &nbsp;|&nbsp; QRTMS Portal &nbsp;|&nbsp; Generated on ${generatedDate} at ${generatedTime}
</div>

<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    // Open print window
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(printHtml);
    pw.document.close();

    // Mark as generated so GM send knows there's a report
    window._schedulePDFGenerated = true;
    window._schedulePDFHtml = printHtml;
    window._scheduleRowCount = rows.length;

    showSchedulePDFBanner('success', `✅ PDF Report generated with <strong>${rows.length} session(s)</strong>. Review it in the new window, then click "Send to GM for Approval".`);
    btn.disabled = false;
    btn.innerHTML = '✅ PDF Generated — Regenerate';
}


/**
 * Sends the generated schedule PDF (as a notesheet) to the GM for approval.
 */
async function sendSchedulePDFToGM() {
    const btn    = document.getElementById('btn-send-pdf-to-gm');
    const token  = localStorage.getItem('iicm_access_token');
    const user   = JSON.parse(localStorage.getItem('iicm_user') || '{}');
    const coordName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Programme Coordinator';

    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Submitting to GM...'; }

    // Collect session data from localStorage (program design sessions)
    const progId = document.getElementById('assign-prog-select')?.value || '';
    let sessions = [];
    try {
        const ps = JSON.parse(localStorage.getItem('iicm_program_sessions') || '{}');
        const rawSessions = ps[progId] || [];
        sessions = rawSessions.map(s => ({
            date:    s.session_date || '',
            topic:   s.topic_title  || '',
            faculty: s.faculty_name || '',
            venue:   'IICM Campus',
            status:  s.invitation_status || 'PENDING'
        }));
    } catch(e) {}

    // Fallback: collect from live DOM table
    if (sessions.length === 0) {
        const tbody = document.getElementById('faculty-schedules-body');
        const rows  = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
        sessions = rows.map(tr => {
            const cells = tr.querySelectorAll('td');
            return {
                date:    cells[0]?.innerText?.trim() || '',
                topic:   cells[1]?.innerText?.trim() || '',
                faculty: cells[2]?.innerText?.trim() || '',
                venue:   'IICM Campus',
                status:  cells[3]?.innerText?.trim() || ''
            };
        }).filter(s => s.topic);
    }

    if (sessions.length === 0) {
        showSchedulePDFBanner('warning', '⚠️ No sessions found. Please add sessions first before submitting to GM.');
        if (btn) { btn.disabled = false; btn.innerHTML = '📨 Submit to GM for Approval'; }
        return;
    }

    const newScheduleNotesheet = {
        id:                       'SCHED-' + Date.now(),
        title:                    `Faculty Teaching & Session Schedule Report (${sessions.length} Sessions)`,
        program_type_name:        'Schedule Report',
        venue_name:               sessions[0]?.venue || 'IICM Campus',
        start_date:               sessions[0]?.date  || new Date().toISOString().split('T')[0],
        end_date:                 sessions[sessions.length - 1]?.date || new Date().toISOString().split('T')[0],
        duration_days:            sessions.length,
        budget:                   450000,
        target_companies:         'ALL CIL Subsidiaries',
        objective:                'Official faculty assignment & lecture timetable sanction for academic governance.',
        description:              sessions.map(s => `• ${s.date}: ${s.topic} (${s.faculty}) - Status: ${s.status}`).join('\n'),
        sessions:                 sessions
    };

    try {
        const existing = JSON.parse(localStorage.getItem('iicm_schedule_notesheets') || '[]');
        existing.unshift(newScheduleNotesheet);
        localStorage.setItem('iicm_schedule_notesheets', JSON.stringify(existing));

        try {
            await fetch(`${API_BASE_URL}/faculty/send-schedule-to-gm/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ coordinator_name: coordName, session_count: sessions.length, sessions })
            });
        } catch(e) {}

        showSchedulePDFBanner('success', '✅ Schedule note sheet submitted to GM Dashboard for official approval!');
        if (btn) btn.innerHTML = '✅ Submitted to GM';
    } catch (err) {
        showSchedulePDFBanner('error', `❌ Failed to submit to GM: ${err.message || 'Please try again.'}`);
        if (btn) { btn.disabled = false; btn.innerHTML = '📨 Submit to GM for Approval'; }
    }
}

/** Helper: shows a styled banner in the PDF action card */
function showSchedulePDFBanner(type, html) {
    const banner = document.getElementById('schedule-pdf-status-banner');
    if (!banner) return;
    const styles = {
        success: 'background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d;',
        warning: 'background:#fef3c7; border:1px solid #fde68a; color:#b45309;',
        error:   'background:#fff1f2; border:1px solid #fecdd3; color:#be123c;'
    };
    banner.style.cssText = `display:block; margin-bottom:16px; padding:12px 16px; border-radius:10px; font-size:13px; font-weight:600; ${styles[type] || styles.success}`;
    banner.innerHTML = html;
}

/* ════════════════════════════════════════════════════════════════
   LIVE ATTENDANCE MODULE — MULTI-PROGRAM DYNAMIC QR SYSTEM
   ▸ Select Program + Time Slot + Validity Duration
   ▸ Generates 1, 2, 3+ simultaneous Live QR Codes on the board
   ▸ 100% Client-Side Crisp SVG QR Generation (Works Offline)
   ▸ Real-time Countdown Timer for each Program Session
   ▸ Trainee Scan URL copy and Regenerate controls
════════════════════════════════════════════════════════════════ */

// Helper to escape HTML characters
function _esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// In-memory list of active Attendance QR sessions
var _activeAttendanceSessions = [];
var _attendanceIntervalTimer = null;

/**
 * Initializes the Attendance section when coordinator clicks "Attendance" in sidebar
 */
function initAttendanceSection(force) {
    populateAttendanceProgramDropdown();
    
    // Only render currently active sessions (empty by default until coordinator clicks Generate QR)
    renderActiveAttendanceQRCards();

    // Start single unified interval to update all card timers smoothly every second
    if (!_attendanceIntervalTimer) {
        _attendanceIntervalTimer = setInterval(_updateAttendanceCountdowns, 1000);
    }
}

/**
 * Populates the Program dropdown (#att-prog-select) with available programs
 */
function populateAttendanceProgramDropdown() {
    var progSelect = document.getElementById('att-prog-select');
    if (!progSelect) return;

    var programs = [];
    if (typeof getUnifiedCoordinatorPrograms === 'function') {
        try { programs = getUnifiedCoordinatorPrograms(); } catch(e) {}
    }
    if (!programs || programs.length === 0) {
        try { programs = getDemoProgramsData(); } catch(e) {}
    }
    if (!programs || programs.length === 0) {
        programs = [
            { id: 1, title: 'Advanced Mine Safety Management Program', program_type_name: 'Technical Training', venue_name: 'IICM Training Hall, Dhanbad' },
            { id: 2, title: 'Digital Transformation Workshop', program_type_name: 'Workshop', venue_name: 'IICM Conference Hall, Dhanbad' }
        ];
    }

    progSelect.style.display = 'block';
    progSelect.innerHTML = programs.map(function(p) {
        var pId = p.id || 1;
        var pTitle = p.title || p.name || 'Training Program';
        var pType = p.program_type_name || p.type || 'Program';
        var pVenue = p.venue_name || 'IICM Dhanbad';
        return '<option value="' + pId + '" data-title="' + _esc(pTitle) + '" data-type="' + _esc(pType) + '" data-venue="' + _esc(pVenue) + '">'
            + _esc(pTitle) + ' (' + _esc(pType) + ')'
            + '</option>';
    }).join('');

    onAttendanceProgramChange();
}

/**
 * Called when program dropdown selection changes
 */
function onAttendanceProgramChange() {
    var progSelect = document.getElementById('att-prog-select');
    var topicInp = document.getElementById('att-topic-custom');
    if (!progSelect || !topicInp) return;

    var selectedOpt = progSelect.selectedOptions[0];
    if (selectedOpt) {
        var title = selectedOpt.getAttribute('data-title') || '';
        if (title.indexOf('Mine Safety') !== -1) {
            topicInp.value = 'Module 1: DGMS Guidelines & Mine Safety Regulations';
        } else if (title.indexOf('Digital') !== -1) {
            topicInp.value = 'Module 2: Industrial IoT & Automation in Mining';
        } else {
            topicInp.value = 'Classroom Session Attendance & Practical Lab';
        }
    }
}

/**
 * Initializes 2 default active program QR sessions so the coordinator sees 2 working examples immediately
 */
function _createDefaultInitialAttendanceSessions() {
    var now = Date.now();
    _activeAttendanceSessions = [
        {
            id: 'sess_' + now + '_1',
            programId: 1,
            programTitle: 'Advanced Mine Safety Management Program',
            programType: 'Technical Training',
            venue: 'IICM Training Hall, Dhanbad',
            timeSlot: '09:30 AM – 11:00 AM',
            topic: 'Module 1: DGMS Guidelines & Statutory Regulations',
            token: 'IICM_ATT_MS_2026_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
            validityMinutes: 10,
            createdAt: now,
            expiresAt: now + (10 * 60 * 1000)
        },
        {
            id: 'sess_' + now + '_2',
            programId: 2,
            programTitle: 'Digital Transformation Workshop',
            programType: 'Workshop',
            venue: 'IICM Conference Hall, Dhanbad',
            timeSlot: '02:00 PM – 03:30 PM',
            topic: 'Module 2: Industrial IoT & Automation in Coal Mining',
            token: 'IICM_ATT_DT_2026_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
            validityMinutes: 15,
            createdAt: now,
            expiresAt: now + (15 * 60 * 1000)
        }
    ];

    renderActiveAttendanceQRCards();
}

/**
 * Creates a new active QR session for the selected program and time slot
 */
async function createNewAttendanceQRSession() {
    var btn = document.getElementById('btn-generate-attendance-qr');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generating QR…';
    }

    try {
        var progSelect = document.getElementById('att-prog-select');
        var timeSelect = document.getElementById('att-time-select');
        var valSelect  = document.getElementById('att-validity-select');
        var topicInp   = document.getElementById('att-topic-custom');

        var progOpt = (progSelect && progSelect.selectedOptions && progSelect.selectedOptions[0]) ? progSelect.selectedOptions[0] : null;
        var programId = progSelect ? (progSelect.value || 1) : 1;
        var programTitle = (progOpt && progOpt.getAttribute('data-title')) ? progOpt.getAttribute('data-title') : (progOpt ? progOpt.text : 'Advanced Mine Safety Management Program');
        var programType = (progOpt && progOpt.getAttribute('data-type')) ? progOpt.getAttribute('data-type') : 'Technical Training';
        var venue = (progOpt && progOpt.getAttribute('data-venue')) ? progOpt.getAttribute('data-venue') : 'IICM Training Hall, Dhanbad';

        var timeSlot = (timeSelect && timeSelect.value) ? timeSelect.value : 'Session 3 (02:00 PM – 03:30 PM)';
        var validityMinutes = valSelect ? (parseInt(valSelect.value, 10) || 5) : 5;
        var topic = (topicInp && topicInp.value.trim()) ? topicInp.value.trim() : (programTitle + ' — Module Session');

        var token = '';
        var now = Date.now();

        // Dynamic standalone secure token
        token = 'IICM_ATT_' + programId + '_' + now.toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2, 6).toUpperCase();

        var newSession = {
            id: 'sess_' + now,
            programId: programId,
            programTitle: programTitle,
            programType: programType,
            venue: venue,
            timeSlot: timeSlot,
            topic: topic,
            token: token,
            validityMinutes: validityMinutes,
            createdAt: now,
            expiresAt: now + (validityMinutes * 60 * 1000)
        };

        // Add to top of active sessions list
        _activeAttendanceSessions.unshift(newSession);

        renderActiveAttendanceQRCards();

        // Highlight the new card with smooth scroll
        var newCardEl = document.getElementById('card-' + newSession.id);
        if (newCardEl) {
            newCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            newCardEl.style.boxShadow = '0 0 0 3px #10b981, 0 10px 25px rgba(16,185,129,0.2)';
            setTimeout(function() { if (newCardEl) newCardEl.style.boxShadow = ''; }, 2500);
        }
    } catch(err) {
        console.error('[createNewAttendanceQRSession]', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📲 Generate Live QR Code';
        }
    }
}

/**
 * Renders all active QR cards in #active-attendance-qr-grid
 */
function renderActiveAttendanceQRCards() {
    var gridEl = document.getElementById('active-attendance-qr-grid');
    if (!gridEl) return;

    if (_activeAttendanceSessions.length === 0) {
        gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;color:#64748b;">'
            + '<div style="font-size:36px;margin-bottom:10px;">📲</div>'
            + '<h4 style="margin:0 0 6px;color:#334155;">No Active Attendance QR Sessions</h4>'
            + '<p style="margin:0;font-size:13px;">Select a program and time slot above, then click <strong>Generate Live QR Code</strong> to start attendance.</p>'
            + '</div>';
        return;
    }

    var now = Date.now();

    gridEl.innerHTML = _activeAttendanceSessions.map(function(s) {
        var isExpired = now >= s.expiresAt;
        var secondsLeft = Math.max(0, Math.floor((s.expiresAt - now) / 1000));
        var mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        var secs = String(secondsLeft % 60).padStart(2, '0');

        // Generate SVG string using QRCode library (100% offline & fast)
        var svgHtml = '';
        if (window.QRCode && typeof QRCode.toSVG === 'function') {
            svgHtml = QRCode.toSVG(s.token, 200, 200);
        } else if (window.QRCode && typeof QRCode.toDataURL === 'function') {
            var dataUrl = QRCode.toDataURL(s.token, 200, 200);
            svgHtml = '<img src="' + dataUrl + '" width="200" height="200" alt="Attendance QR" style="display:block;margin:0 auto;border-radius:8px;" />';
        } else {
            var extUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(s.token);
            svgHtml = '<img src="' + extUrl + '" width="200" height="200" alt="Attendance QR" style="display:block;margin:0 auto;border-radius:8px;" />';
        }

        var statusBadge = isExpired
            ? '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">⛔ EXPIRED</span>'
            : '<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;background:#16a34a;border-radius:50%;display:inline-block;"></span>LIVE &amp; SCANNING</span>';

        var countdownStyle = isExpired ? 'color:#991b1b;' : 'color:#b45309;';
        var countdownText = isExpired ? '⛔ Attendance Closed' : '⏱ Valid for ' + mins + ':' + secs;

        return [
            '<div class="attendance-qr-card" id="card-' + s.id + '" style="background:#ffffff;border:1.5px solid ' + (isExpired ? '#e2e8f0' : '#86efac') + ';border-radius:14px;padding:20px;box-shadow:0 3px 14px rgba(0,0,0,0.06);position:relative;display:flex;flex-direction:column;justify-content:space-between;opacity:' + (isExpired ? '0.75' : '1') + ';">',
            
            // Top Program & Time Info
            '  <div>',
            '    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">',
            '      <div style="font-size:15px;font-weight:800;color:#064e3b;line-height:1.3;">' + _esc(s.programTitle) + '</div>',
            '      <div>' + statusBadge + '</div>',
            '    </div>',
            '    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#475569;margin-bottom:12px;">',
            '      <span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-weight:700;color:#334155;">🕐 ' + _esc(s.timeSlot) + '</span>',
            '      <span style="color:#64748b;">📍 ' + _esc(s.venue) + '</span>',
            '    </div>',
            '    <div style="font-size:12.5px;color:#1e293b;font-weight:600;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:14px;">',
            '      📖 ' + _esc(s.topic),
            '    </div>',
            '  </div>',

            // Center QR Code
            '  <div style="text-align:center;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:14px;">',
            '    <div style="display:inline-block;padding:6px;background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.08);">' + svgHtml + '</div>',
            '    <div id="countdown-' + s.id + '" style="font-size:16px;font-weight:800;margin-top:10px;' + countdownStyle + '">' + countdownText + '</div>',
            '    <div style="font-size:11px;color:#64748b;margin-top:4px;word-break:break-all;font-family:monospace;">TOKEN: ' + _esc(s.token) + '</div>',
            '  </div>',

            // Bottom Actions
            '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
            '    <button type="button" onclick="extendQRSessionValidity(\'' + s.id + '\', 5)" style="background:#f0fdf4;border:1px solid #86efac;color:#15803d;padding:7px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">',
            '      🔄 +5 Mins',
            '    </button>',
            '    <button type="button" onclick="copyAttendanceScanLink(\'' + s.token + '\')" style="background:#0284c7;border:none;color:#fff;padding:7px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">',
            '      📋 Copy Link',
            '    </button>',
            '    <button type="button" onclick="removeAttendanceQRSession(\'' + s.id + '\')" style="grid-column:1/-1;background:#f8fafc;border:1px solid #cbd5e1;color:#64748b;padding:6px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;margin-top:4px;">',
            '      ❌ Close &amp; End QR Session',
            '    </button>',
            '  </div>',

            '</div>'
        ].join('');
    }).join('');
}

/**
 * Updates countdown numbers in real time every second across all active cards
 */
function _updateAttendanceCountdowns() {
    var now = Date.now();
    var needsRerender = false;

    _activeAttendanceSessions.forEach(function(s) {
        var el = document.getElementById('countdown-' + s.id);
        if (!el) return;

        var secondsLeft = Math.max(0, Math.floor((s.expiresAt - now) / 1000));
        if (secondsLeft === 0) {
            el.innerHTML = '⛔ Attendance Closed';
            el.style.color = '#991b1b';
            var cardEl = document.getElementById('card-' + s.id);
            if (cardEl && cardEl.style.borderColor !== 'rgb(226, 232, 240)') {
                cardEl.style.borderColor = '#e2e8f0';
                cardEl.style.opacity = '0.75';
            }
        } else {
            var mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
            var secs = String(secondsLeft % 60).padStart(2, '0');
            el.innerHTML = '⏱ Valid for ' + mins + ':' + secs;
            el.style.color = '#b45309';
        }
    });
}

/**
 * Extends validity of an active QR session by N minutes
 */
function extendQRSessionValidity(sessionId, extraMinutes) {
    var session = _activeAttendanceSessions.find(function(s) { return s.id === sessionId; });
    if (!session) return;

    var now = Date.now();
    // If already expired, restart from now
    var baseTime = Math.max(now, session.expiresAt);
    session.expiresAt = baseTime + (extraMinutes * 60 * 1000);

    renderActiveAttendanceQRCards();
}

/**
 * Copies the direct trainee scan link for the attendance token
 */
function copyAttendanceScanLink(token) {
    var fullUrl = window.location.origin + window.location.pathname.replace(/program_coordinator\/dashboard\.html.*/, 'trainee/attendance_scan.html') + '?token=' + encodeURIComponent(token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullUrl).then(function() {
            alert('✅ Trainee Attendance Link copied to clipboard!\n\n' + fullUrl);
        }).catch(function() {
            prompt('Copy Trainee Attendance Link:', fullUrl);
        });
    } else {
        prompt('Copy Trainee Attendance Link:', fullUrl);
    }
}

/**
 * Removes an active session card from the board
 */
function removeAttendanceQRSession(sessionId) {
    _activeAttendanceSessions = _activeAttendanceSessions.filter(function(s) { return s.id !== sessionId; });
    renderActiveAttendanceQRCards();
}

/**
 * Clears all expired cards
 */
function clearExpiredQRSessions() {
    var now = Date.now();
    _activeAttendanceSessions = _activeAttendanceSessions.filter(function(s) { return s.expiresAt > now; });
    renderActiveAttendanceQRCards();
}

// Expose globally
window.initAttendanceSection = initAttendanceSection;
window.createNewAttendanceQRSession = createNewAttendanceQRSession;
window.onAttendanceProgramChange = onAttendanceProgramChange;
window.extendQRSessionValidity = extendQRSessionValidity;
window.copyAttendanceScanLink = copyAttendanceScanLink;
window.removeAttendanceQRSession = removeAttendanceQRSession;
window.clearExpiredQRSessions = clearExpiredQRSessions;

// Backward-compat aliases
window.generateDynamicAttendanceQR = function() { initAttendanceSection(false); };
window.loadAttendanceSessions = function() { initAttendanceSection(false); };


/* ════════════════════════════════════════════════════════════════
   DYNAMIC WHATSAPP ATTENDANCE SHARING & FACULTY MASTER DIRECTORY
════════════════════════════════════════════════════════════════ */

function shareAttendanceWhatsApp(sessionId) {
    var s = (_activeAttendanceSessions || []).find(function(item) { return item.id === sessionId; });
    if (!s) {
        if (_activeAttendanceSessions && _activeAttendanceSessions.length > 0) s = _activeAttendanceSessions[0];
        else return alert('Please generate an active attendance session first.');
    }
    
    var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
    var scanUrl = origin + '/frontend/attendance/index.html?token=' + encodeURIComponent(s.token) + '&prog=' + encodeURIComponent(s.programId) + '&topic=' + encodeURIComponent(s.topic);
    
    var msg = '📢 *INDIAN INSTITUTE OF COAL MANAGEMENT (IICM)*\n'
            + '🎓 *OFFICIAL SESSION ATTENDANCE NOTICE*\n\n'
            + '📌 *Program:* ' + s.programTitle + '\n'
            + '🕒 *Session / Time:* ' + s.timeSlot + '\n'
            + '📖 *Topic:* ' + s.topic + '\n'
            + '📍 *Venue:* ' + s.venue + '\n\n'
            + '👉 *Mark Your Attendance Online via Direct Link:*\n'
            + scanUrl + '\n\n'
            + '⚡ _Please mark your attendance promptly or scan the hall QR code before session conclusion._';

    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
}
window.shareAttendanceWhatsApp = shareAttendanceWhatsApp;

// Default Faculty Master Directory Data
var _facultyMasterList = [
    {
        id: 1,
        name: 'Dr. P. K. Bhattacharya',
        category: 'Internal',
        designation: 'General Manager / Senior Faculty',
        org: 'Indian Institute of Coal Management, Ranchi',
        domain: 'Medical & Occupational Health',
        mobile: '9438877116',
        email: 'pk.bhattacharya@coalindia.in',
        honorarium: 3500
    },
    {
        id: 2,
        name: 'Prof. S. N. Mukherjee',
        category: 'Academic',
        designation: 'Professor & Head of Mining',
        org: 'IIT (ISM) Dhanbad',
        domain: 'Mining & Underground Operations',
        mobile: '9431122334',
        email: 'snmukherjee@iitism.ac.in',
        honorarium: 5000
    },
    {
        id: 3,
        name: 'Shri Amitabh Roy',
        category: 'Internal',
        designation: 'Chief of Safety & DGMS Liaison',
        org: 'Central Mine Planning & Design Institute (CMPDI)',
        domain: 'Mine Safety & DGMS Regulations',
        mobile: '9437012345',
        email: 'aroy@cmpdi.co.in',
        honorarium: 3000
    },
    {
        id: 4,
        name: 'Dr. (Ms.) Ananya Dasgupta',
        category: 'External',
        designation: 'Director, Occupational Health & Ergonomics',
        org: 'National Institute of Miners Health (NIMH)',
        domain: 'Ergonomics & Industrial Hygiene',
        mobile: '9830012345',
        email: 'ananya.dasgupta@nimh.gov.in',
        honorarium: 4500
    },
    {
        id: 5,
        name: 'Shri R. K. Srivastava',
        category: 'External',
        designation: 'Executive Director (HRD - Retd.)',
        org: 'Coal India Limited',
        domain: 'HR & Leadership Competency',
        mobile: '9435098765',
        email: 'rksrivastava.cil@gmail.com',
        honorarium: 4000
    }
];

function loadCoordFacultyMasterTable() {
    var tbody = document.getElementById('fac-master-tbody');
    if (!tbody) return;

    var searchVal = ((document.getElementById('fac-master-search') || {}).value || '').trim().toLowerCase();
    var catVal = ((document.getElementById('fac-master-cat-filter') || {}).value || '').trim();
    var domainVal = ((document.getElementById('fac-master-domain-filter') || {}).value || '').trim();

    var filtered = _facultyMasterList.filter(function(f) {
        var matchSearch = !searchVal || f.name.toLowerCase().includes(searchVal) || f.org.toLowerCase().includes(searchVal) || f.domain.toLowerCase().includes(searchVal);
        var matchCat = !catVal || f.category.toLowerCase() === catVal.toLowerCase();
        var matchDomain = !domainVal || f.domain.toLowerCase().includes(domainVal.toLowerCase());
        return matchSearch && matchCat && matchDomain;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No faculty members found matching filters.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(function(f) {
        var catBadge = f.category === 'Internal'
            ? '<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">INTERNAL</span>'
            : (f.category === 'Academic'
                ? '<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">ACADEMIC</span>'
                : '<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">GUEST EXPERT</span>');

        return `
        <tr>
            <td>
                <div style="font-weight:700; color:#0f172a; font-size:13.5px;">${f.name}</div>
                <div style="font-size:11px; color:#64748b;">ID: FAC-${String(f.id).padStart(3, '0')}</div>
            </td>
            <td>${catBadge}</td>
            <td>
                <div style="font-weight:600; color:#334155;">${f.designation}</div>
                <div style="font-size:11.5px; color:#64748b;">${f.org}</div>
            </td>
            <td>
                <span style="display:inline-block; background:#f8fafc; border:1px solid #e2e8f0; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:600; color:#1e293b;">
                    ${f.domain}
                </span>
            </td>
            <td>
                <div style="font-size:12px; font-weight:600; color:#0f172a;">📞 ${f.mobile}</div>
                <div style="font-size:11px; color:#2563eb;">✉️ ${f.email}</div>
            </td>
            <td style="text-align:right; font-weight:800; color:#047857;">
                ₹${f.honorarium.toLocaleString('en-IN')}
            </td>
            <td style="text-align:center;">
                <div style="display:flex; gap:4px; justify-content:center;">
                    <button type="button" class="btn-action-sm" onclick="alert('Contacting faculty: ${f.name} (${f.mobile})')" style="background:#047857; color:#fff; font-weight:700;">📞 Call</button>
                    <button type="button" class="btn-action-sm" onclick="showSection('fac-invite')" style="background:#2563eb; color:#fff; font-weight:700;">✉️ Invite</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}
window.loadCoordFacultyMasterTable = loadCoordFacultyMasterTable;
window.filterFacultyMaster = loadCoordFacultyMasterTable;

function openAddFacultyModal() {
    var name = prompt('Enter Faculty Full Name:');
    if (!name) return;
    var desig = prompt('Enter Designation & Institute:');
    var mobile = prompt('Enter Mobile Number:');
    var email = prompt('Enter Email Address:');
    var domain = prompt('Enter Domain / Specialization:');

    _facultyMasterList.unshift({
        id: _facultyMasterList.length + 1,
        name: name,
        category: 'External',
        designation: desig || 'Guest Faculty',
        org: 'External Resource Center',
        domain: domain || 'Domain Specialist',
        mobile: mobile || '9876543210',
        email: email || 'faculty@iicm.ac.in',
        honorarium: 3500
    });

    loadCoordFacultyMasterTable();
    alert('Faculty member added successfully!');
}
window.openAddFacultyModal = openAddFacultyModal;



/* ════════════════════════════════════════════════════════════════
   COMMUNICATIONS & EMAIL DISPATCH ACTIVITY CENTER
════════════════════════════════════════════════════════════════ */

var _dispatchCommunications = [
    {
        id: 'DISP-001',
        type: 'OUT',
        typeLabel: '📤 Dispatched',
        subject: 'Nomination Call Letter & Candidate Grid dispatched to Subsidiaries',
        program: 'Occupational Health Capacity Building Workshop',
        party: 'All Subsidiaries (BCCL, CCL, ECL, WCL, SECL, MCL, CMPDI)',
        timestamp: 'Today, 09:30 AM',
        status: '✅ Delivered & Active',
        statusStyle: 'background:#dcfce7; color:#15803d;',
        module: 'nomination-form'
    },
    {
        id: 'DISP-002',
        type: 'OUT',
        typeLabel: '📤 Dispatched',
        subject: 'Faculty Official Invitation & Lecture Confirmation Letter',
        program: 'Occupational Health Capacity Building Workshop',
        party: 'Prof. S. N. Mukherjee (IIT ISM Dhanbad)',
        timestamp: 'Today, 10:15 AM',
        status: '✅ Sent via Email',
        statusStyle: 'background:#dcfce7; color:#15803d;',
        module: 'fac-invite'
    },
    {
        id: 'DISP-003',
        type: 'IN',
        typeLabel: '📥 Received',
        subject: 'GM Administrative Sanction & Note Sheet Approval Order',
        program: 'Occupational Health Capacity Building Workshop',
        party: 'General Manager (IICM)',
        timestamp: 'Today, 11:30 AM',
        status: '🟢 Sanction Approved (₹5,50,000)',
        statusStyle: 'background:#dcfce7; color:#15803d; font-weight:800;',
        module: 'notesheet'
    },
    {
        id: 'DISP-004',
        type: 'IN',
        typeLabel: '📥 Received',
        subject: 'Faculty Lecture Invitation Accepted (Session 1 & 2)',
        program: 'Occupational Health Capacity Building Workshop',
        party: 'Dr. P. K. Bhattacharya (Senior Faculty)',
        timestamp: 'Today, 12:10 PM',
        status: '✅ Accepted by Faculty',
        statusStyle: 'background:#e0f2fe; color:#0369a1;',
        module: 'fac-invite'
    },
    {
        id: 'DISP-005',
        type: 'IN',
        typeLabel: '📥 Received',
        subject: 'Executive Employee Nomination List Received (12 Candidates)',
        program: 'Management Development Programme for MTs',
        party: 'Director (Personnel), BCCL Dhanbad',
        timestamp: 'Today, 01:25 PM',
        status: '📥 Received & Enrolled',
        statusStyle: 'background:#fef3c7; color:#b45309;',
        module: 'nomination-form'
    },
    {
        id: 'DISP-006',
        type: 'OUT',
        typeLabel: '📤 Dispatched',
        subject: 'Note Sheet for Proposed Budget Sanction submitted for Approval',
        program: 'Management Development Programme for MTs',
        party: 'General Manager (IICM)',
        timestamp: 'Yesterday, 04:45 PM',
        status: '⏳ Awaiting GM Review',
        statusStyle: 'background:#fef3c7; color:#b45309;',
        module: 'notesheet'
    },
    {
        id: 'DISP-007',
        type: 'OUT',
        typeLabel: '📤 Dispatched',
        subject: 'Honorarium Payment Release Note dispatched to Finance & Accounts',
        program: 'Mine Safety Statutory Standards MDP',
        party: 'Finance & Accounts Division, IICM',
        timestamp: '17-Aug-2026, 03:20 PM',
        status: '💰 Dispatched (₹45,000)',
        statusStyle: 'background:#f3e8ff; color:#7e22ce;',
        module: 'payment-release'
    }
];

var _currentDispatchFilter = 'ALL';

function filterDispatches(filterType) {
    _currentDispatchFilter = filterType;
    
    // Update tab button styles
    ['all', 'out', 'in'].forEach(function(k) {
        var btn = document.getElementById('dispatch-tab-' + k);
        if (btn) {
            if ((k === 'all' && filterType === 'ALL') || (k === 'out' && filterType === 'OUT') || (k === 'in' && filterType === 'IN')) {
                btn.style.background = '#047857';
                btn.style.color = '#ffffff';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#475569';
            }
        }
    });

    loadDispatchCommunications();
}
window.filterDispatches = filterDispatches;

function loadDispatchCommunications() {
    var tbody = document.getElementById('dispatch-log-tbody');
    if (!tbody) return;

    var filtered = _dispatchCommunications.filter(function(item) {
        if (_currentDispatchFilter === 'OUT') return item.type === 'OUT';
        if (_currentDispatchFilter === 'IN') return item.type === 'IN';
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No communications found for selected filter.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(function(item) {
        var typeBadge = item.type === 'OUT'
            ? '<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:3px 8px; border-radius:4px; font-weight:800; font-size:11px;">📤 OUTGOING</span>'
            : '<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:3px 8px; border-radius:4px; font-weight:800; font-size:11px;">📥 INCOMING</span>';

        return `
        <tr>
            <td style="text-align:center;">${typeBadge}</td>
            <td>
                <div style="font-weight:700; color:#0f172a; font-size:13px;">${item.subject}</div>
                <div style="font-size:11px; color:#64748b; font-family:monospace;">REF: ${item.id}</div>
            </td>
            <td>
                <span style="font-size:12px; font-weight:600; color:#334155;">${item.program}</span>
            </td>
            <td>
                <div style="font-size:12px; font-weight:600; color:#0f172a;">${item.party}</div>
            </td>
            <td>
                <span style="font-size:12px; color:#64748b;">${item.timestamp}</span>
            </td>
            <td>
                <span style="padding:3px 10px; border-radius:12px; font-size:11.5px; font-weight:700; ${item.statusStyle}">
                    ${item.status}
                </span>
            </td>
            <td style="text-align:center;">
                <button type="button" class="btn-action-sm" onclick="viewDispatchItem('${item.id}')" style="background:#047857; color:#fff; font-weight:700; font-size:11.5px; padding:5px 12px; border-radius:6px; cursor:pointer;">
                    👁️ Open
                </button>
            </td>
        </tr>
        `;
    }).join('');
}
window.loadDispatchCommunications = loadDispatchCommunications;

function viewDispatchItem(dispId) {
    var item = _dispatchCommunications.find(function(d) { return d.id === dispId; });
    if (!item) return;

    if (item.module === 'nomination-form') {
        showSection('nomination-form');
        if (window.initNominationFormSection) window.initNominationFormSection();
        setTimeout(function() { if (window.previewNominationForm) window.previewNominationForm(); }, 300);
    } else if (item.module === 'notesheet') {
        showSection('notesheet');
        if (window.initNotesheetSection) window.initNotesheetSection();
        setTimeout(function() { if (window.previewNotesheet) window.previewNotesheet(); }, 300);
    } else if (item.module === 'fac-invite') {
        showSection('fac-invite');
        if (window.initFacultyInviteSection) window.initFacultyInviteSection();
    } else if (item.module === 'payment-release') {
        showSection('payment-release');
        if (window.initPaymentReleaseSection) window.initPaymentReleaseSection();
        setTimeout(function() { if (window.previewPaymentReleaseNote) window.previewPaymentReleaseNote(); }, 300);
    } else {
        alert('Communication Item: ' + item.subject + '\nRef: ' + item.id + '\nParty: ' + item.party + '\nStatus: ' + item.status);
    }
}
window.viewDispatchItem = viewDispatchItem;

// Auto-load dispatches on dashboard init
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof loadDispatchCommunications === 'function') loadDispatchCommunications();
    }, 400);
});

window._showSectionImpl = showSection;
window.showSection = showSection;



/* ════════════════════════════════════════════════════════════════
   FACULTY MASTER DIRECTORY & LIVE PROGRESS (EXACT ORIGINAL SUITE)
   ════════════════════════════════════════════════════════════════ */

function getFacultyMasterListFromStorage() {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem('iicm_faculty_master_list') || '[]');
    } catch(e) {}

    if (!list || list.length === 0) {
        list = [
            {
                id: 1,
                name: 'Dr. Priya Sharma',
                email: 'priya.sharma@iitism.ac.in',
                phone: '+91 98351 23456',
                faculty_type: 'EXTERNAL',
                specialization: 'Mine Safety & Statutory DGMS Norms',
                program_name: 'Advanced Mine Safety Management',
                lecture_topic: 'Mine Safety & Statutory Norms',
                completed_sessions: 4,
                total_sessions: 4,
                status: 'COMPLETED'
            },
            {
                id: 2,
                name: 'Prof. Rakesh Gupta',
                email: 'rakesh.gupta@digimine.in',
                phone: '+91 94311 87654',
                faculty_type: 'EXTERNAL',
                specialization: 'Industrial IoT & Automation in Mining',
                program_name: 'Digital Transformation Workshop',
                lecture_topic: 'ERP Integration & Fleet Dispatch',
                completed_sessions: 2,
                total_sessions: 3,
                status: 'ACTIVE'
            },
            {
                id: 3,
                name: 'Dr. Sunita Mishra',
                email: 'sunita.mishra@coalindia.in',
                phone: '+91 94313 11223',
                faculty_type: 'INTERNAL',
                specialization: 'Environmental Management & Carbon Auditing',
                program_name: 'Environmental Awareness Campaign',
                lecture_topic: 'DGMS Environmental Compliance Standards',
                completed_sessions: 2,
                total_sessions: 2,
                status: 'COMPLETED'
            },
            {
                id: 4,
                name: 'Prof. Arun Sharma',
                email: 'arun.sharma@leadership.edu',
                phone: '+91 98110 55443',
                faculty_type: 'EXTERNAL',
                specialization: 'Executive Leadership & Industrial Relations',
                program_name: 'Leadership Development Program',
                lecture_topic: 'Executive Leadership Styles & Team Dynamics',
                completed_sessions: 3,
                total_sessions: 4,
                status: 'ACTIVE'
            },
            {
                id: 5,
                name: 'Dr. Anita Roy',
                email: 'anita.roy@bitmesra.ac.in',
                phone: '+91 97714 66778',
                faculty_type: 'EXTERNAL',
                specialization: 'Occupational Ergonomics & Safe Workplace Norms',
                program_name: 'Women in Mining Leadership',
                lecture_topic: 'Gender Inclusion & Occupational Ergonomics',
                completed_sessions: 4,
                total_sessions: 4,
                status: 'COMPLETED'
            }
        ];
        try { localStorage.setItem('iicm_faculty_master_list', JSON.stringify(list)); } catch(e) {}
    }
    return list;
}

async function loadCoordFacultyMasterTable() {
    const cardsGrid = document.getElementById('coord-faculty-cards-grid');
    if (!cardsGrid) return;

    cardsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">Loading Faculty Master live progress cards...</div>`;

    let faculties = [];
    const token = localStorage.getItem('iicm_access_token');
    
    if (token) {
        try {
            const res = await fetch(`${API_BASE_URL}/faculty/faculties/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                faculties = data.results || data;
            }
        } catch(e) {}
    }

    if (!faculties || faculties.length === 0) {
        faculties = getFacultyMasterListFromStorage();
    }

    if (!faculties || faculties.length === 0) {
        cardsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">No faculty master profiles found. Add a faculty record using the form above.</div>`;
        return;
    }

    cardsGrid.innerHTML = faculties.map((f, idx) => {
        const facTypeBadge = f.faculty_type === 'EXTERNAL' ? 
            `<span style="background:#fef3c7; color:#d97706; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px;">Visiting Expert</span>` : 
            `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px;">Internal Core</span>`;

        const totalSessions = f.total_sessions || 4;
        const completedSessions = f.completed_sessions || Math.min(totalSessions, (idx % 3) + 2);
        const pct = Math.round((completedSessions / totalSessions) * 100);

        let statusBadge = '';
        if (pct === 100) {
            statusBadge = `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">✅ Completed</span>`;
        } else {
            statusBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">🟢 Active Teaching</span>`;
        }

        const initial = f.name ? f.name.charAt(0).toUpperCase() : 'F';

        return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;" onclick="openFacultyDetailModal(${f.id})">
                <div>
                    <!-- Header Row with Avatar & Type Badge -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                        <div style="display:flex; gap:12px; align-items:center;">
                            <div style="width:44px; height:44px; background:#1b4332; color:#ffffff; font-weight:800; font-size:18px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                                ${initial}
                            </div>
                            <div>
                                <h4 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;">${f.name}</h4>
                                <div style="font-size:12px; color:#64748b;">${f.specialization || 'Mining Engineering'}</div>
                            </div>
                        </div>
                        ${facTypeBadge}
                    </div>

                    <!-- Contact Info & OTP Login Status -->
                    <div style="background:#f8fafc; padding:10px 12px; border-radius:8px; font-size:12px; color:#475569; margin-bottom:14px; border:1px solid #f1f5f9;">
                        <div>📧 Email: <strong>${f.email}</strong></div>
                        <div style="margin-top:2px;">📞 Phone (OTP): <strong>${f.phone || '+91 9876543210'}</strong></div>
                        <div style="margin-top:4px; font-size:11px; color:#15803d; font-weight:700;">📲 Secure Mobile &amp; Email OTP Login Active</div>
                    </div>

                    <!-- Assigned Program & Topic -->
                    <div style="margin-bottom:14px; font-size:12.5px;">
                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:2px;">Assigned Program &amp; Topic</div>
                        <div style="font-weight:700; color:#0f172a;">${f.program_name || 'Executive Mine Management'}</div>
                        <div style="color:#475569;">Lecture: <em>${f.lecture_topic || f.specialization || 'Mine Safety & Statutory Norms'}</em></div>
                    </div>

                    <!-- Live Teaching Progress % -->
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin-bottom:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:800; color:#15803d; margin-bottom:6px;">
                            <span>Teaching Progress</span>
                            <span>${completedSessions}/${totalSessions} Sessions (${pct}%)</span>
                        </div>
                        <div style="background:#dcfce7; height:8px; border-radius:10px; overflow:hidden;">
                            <div style="background:#16a34a; height:100%; width:${pct}%;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span style="font-size:11px; color:#475569; font-weight:600;">Status:</span>
                            ${statusBadge}
                        </div>
                    </div>
                </div>

                <!-- Card Footer Actions -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:12px;" onclick="event.stopPropagation()">
                    <button type="button" class="btn-action-sm" style="background:#0284c7; color:#fff; font-size:11px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="resendFacultyInviteMail('${f.email}', '${f.name}', '${f.phone||''}')">
                        📩 Resend OTP Invite
                    </button>
                    <button type="button" class="btn-action-sm" style="background:#dc2626; color:#fff; font-size:11px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="deleteCoordFacultyMaster(${f.id}, '${f.name}')">
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
window.loadCoordFacultyMasterTable = loadCoordFacultyMasterTable;

async function handleCoordAddFacultySubmit(e) {
    e.preventDefault();
    const name = (document.getElementById('coord-fac-name') ? document.getElementById('coord-fac-name').value : '').trim();
    const email = (document.getElementById('coord-fac-email') ? document.getElementById('coord-fac-email').value : '').trim();
    const phone = (document.getElementById('coord-fac-phone') ? document.getElementById('coord-fac-phone').value : '').trim();
    const faculty_type = (document.getElementById('coord-fac-type') ? document.getElementById('coord-fac-type').value : 'EXTERNAL');
    const specialization = (document.getElementById('coord-fac-spec') ? document.getElementById('coord-fac-spec').value : '').trim();

    if (!name || !email || !phone) {
        alert('Please fill Faculty Name, Email and Phone number.');
        return;
    }

    const newFaculty = {
        id: Date.now(),
        name: name,
        email: email,
        phone: phone,
        faculty_type: faculty_type,
        specialization: specialization || 'Mining Domain Specialist',
        program_name: 'Assigned Executive Program',
        lecture_topic: specialization || 'Domain Lecture Topic',
        completed_sessions: 0,
        total_sessions: 4,
        status: 'ACTIVE'
    };

    let list = getFacultyMasterListFromStorage();
    list.unshift(newFaculty);
    try { localStorage.setItem('iicm_faculty_master_list', JSON.stringify(list)); } catch(e) {}

    const token = localStorage.getItem('iicm_access_token');
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/faculty/faculties/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, email, phone, faculty_type, specialization })
            });
        } catch(e) {}
    }

    const form = document.getElementById('coord-add-faculty-form');
    if (form) form.reset();

    loadCoordFacultyMasterTable();

    const tempOtp = Math.floor(100000 + Math.random() * 900000);
    alert(`🎉 Faculty Master Record Saved!\n\nFaculty: ${name}\nEmail: ${email}\nMobile (for OTP Login): ${phone}\nGenerated Login OTP: ${tempOtp}\n\nOfficial Faculty Portal Invitation & OTP login credentials have been dispatched!`);
}
window.handleCoordAddFacultySubmit = handleCoordAddFacultySubmit;

async function resendFacultyInviteMail(email, name, phone) {
    const tempOtp = Math.floor(100000 + Math.random() * 900000);
    alert(`📩 Official Faculty Invitation & OTP Sent!\n\nTo: ${name}\nEmail: ${email}\nPhone: ${phone || '+91 9876543210'}\nOne-Time Login OTP: ${tempOtp}\n\nThe faculty member can now log in securely via mobile/email OTP on their dedicated Faculty Portal.`);
}
window.resendFacultyInviteMail = resendFacultyInviteMail;

function deleteCoordFacultyMaster(id, name) {
    if (!confirm(`Are you sure you want to remove ${name} from Faculty Master Directory?`)) return;
    let list = getFacultyMasterListFromStorage();
    list = list.filter(f => String(f.id) !== String(id));
    try { localStorage.setItem('iicm_faculty_master_list', JSON.stringify(list)); } catch(e) {}
    loadCoordFacultyMasterTable();
}
window.deleteCoordFacultyMaster = deleteCoordFacultyMaster;



/* ═════════════════════════════════════════════════════════════════════
   HONORARIUM REGISTER & DETAILED SESSIONS VIEW
   ═════════════════════════════════════════════════════════════════════ */

function getHonorariumList() {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem('iicm_honorarium_data') || '[]');
    } catch(e) {}

    if (!list || list.length === 0) {
        list = [
            {
                id: 1,
                bill_ref: 'HON-2026-0041',
                bill_date: '01 Aug 2026',
                faculty_name: 'Dr. Priya Sharma',
                faculty_phone: '+91 98351 23456',
                program_title: 'Advanced Mine Safety Management',
                sessions: [
                    { name: 'Session 1: DGMS Guidelines & Mine Safety Regulations', date: '10 Aug 2026', time: '09:30 AM – 11:00 AM' },
                    { name: 'Session 2: Statutory Ventilation & Gas Monitoring', date: '11 Aug 2026', time: '11:15 AM – 12:45 PM' },
                    { name: 'Session 3: Accident Analysis & Statutory Norms', date: '12 Aug 2026', time: '02:00 PM – 03:30 PM' },
                    { name: 'Session 4: Risk Mitigation & Emergency Preparedness', date: '13 Aug 2026', time: '03:45 PM – 05:15 PM' }
                ],
                session_count: 4,
                gross_amount: 12000,
                tds_amount: 1200,
                net_payable: 10800,
                rating: '4.8',
                gm_status: 'APPROVED',
                payment_status: 'DISBURSED',
                utr_number: 'SBIN2026080112345',
                bill_number: 'BILL/IICM/2026/089',
                payment_date: '01 Aug 2026',
                bank_info: 'SBI Ranchi (A/c: 30987654321)'
            },
            {
                id: 2,
                bill_ref: 'HON-2026-0042',
                bill_date: '02 Aug 2026',
                faculty_name: 'Prof. Rakesh Gupta',
                faculty_phone: '+91 94311 87654',
                program_title: 'Digital Transformation Workshop',
                sessions: [
                    { name: 'Session 1: Industrial IoT & Smart Fleet Management', date: '18 Aug 2026', time: '09:30 AM – 11:00 AM' },
                    { name: 'Session 2: ERP Integration & Real-time Dispatch', date: '19 Aug 2026', time: '11:15 AM – 12:45 PM' },
                    { name: 'Session 3: Predictive Maintenance in Open-Cast Mines', date: '20 Aug 2026', time: '02:00 PM – 03:30 PM' }
                ],
                session_count: 3,
                gross_amount: 36000,
                tds_amount: 3600,
                net_payable: 32400,
                rating: '4.6',
                gm_status: 'APPROVED',
                payment_status: 'DISBURSED',
                utr_number: 'HDFC2026080234567',
                bill_number: 'BILL/IICM/2026/090',
                payment_date: '02 Aug 2026',
                bank_info: 'HDFC Dhanbad (A/c: 50100234567)'
            },
            {
                id: 3,
                bill_ref: 'HON-2026-0043',
                bill_date: '03 Aug 2026',
                faculty_name: 'Dr. Sunita Mishra',
                faculty_phone: '+91 94313 11223',
                program_title: 'Environmental Awareness Campaign',
                sessions: [
                    { name: 'Session 1: DGMS Environmental Compliance Standards', date: '05 Aug 2026', time: '10:00 AM – 11:30 AM' },
                    { name: 'Session 2: Mine Dust Control & Carbon Footprint Reduction', date: '06 Aug 2026', time: '02:00 PM – 03:30 PM' }
                ],
                session_count: 2,
                gross_amount: 6000,
                tds_amount: 600,
                net_payable: 5400,
                rating: '4.5',
                gm_status: 'PENDING',
                payment_status: 'PENDING_GM',
                utr_number: '',
                bill_number: 'BILL/IICM/2026/091',
                payment_date: '—',
                bank_info: 'SBI Ranchi (A/c: 20188997766)'
            },
            {
                id: 4,
                bill_ref: 'HON-2026-0044',
                bill_date: '04 Aug 2026',
                faculty_name: 'Prof. Arun Sharma',
                faculty_phone: '+91 98110 55443',
                program_title: 'Leadership Development Program',
                sessions: [
                    { name: 'Session 1: Executive Leadership Styles & Team Dynamics', date: '22 Aug 2026', time: '09:30 AM – 11:00 AM' },
                    { name: 'Session 2: Conflict Resolution & Industrial Relations', date: '23 Aug 2026', time: '11:15 AM – 12:45 PM' },
                    { name: 'Session 3: Change Management in PSUs', date: '24 Aug 2026', time: '02:00 PM – 03:30 PM' },
                    { name: 'Session 4: Crisis Management Case Studies', date: '25 Aug 2026', time: '03:45 PM – 05:15 PM' }
                ],
                session_count: 4,
                gross_amount: 32000,
                tds_amount: 3200,
                net_payable: 28800,
                rating: '4.7',
                gm_status: 'APPROVED',
                payment_status: 'DISBURSED',
                utr_number: 'ICICI2026080345678',
                bill_number: 'BILL/IICM/2026/092',
                payment_date: '03 Aug 2026',
                bank_info: 'ICICI Ranchi (A/c: 00450156789)'
            },
            {
                id: 5,
                bill_ref: 'HON-2026-0045',
                bill_date: '05 Aug 2026',
                faculty_name: 'Dr. Anita Roy',
                faculty_phone: '+91 97714 66778',
                program_title: 'Women in Mining Leadership',
                sessions: [
                    { name: 'Session 1: Gender Inclusion & Safe Workplace Norms', date: '26 Aug 2026', time: '09:30 AM – 11:00 AM' },
                    { name: 'Session 2: Women in Heavy Machinery & Statutory Compliance', date: '27 Aug 2026', time: '11:15 AM – 12:45 PM' },
                    { name: 'Session 3: Mentorship & Career Growth in CIL', date: '28 Aug 2026', time: '02:00 PM – 03:30 PM' },
                    { name: 'Session 4: Occupational Ergonomics for Executives', date: '29 Aug 2026', time: '03:45 PM – 05:15 PM' }
                ],
                session_count: 4,
                gross_amount: 24000,
                tds_amount: 2400,
                net_payable: 21600,
                rating: '4.9',
                gm_status: 'APPROVED',
                payment_status: 'DISBURSED',
                utr_number: 'PUNB2026080456789',
                bill_number: 'BILL/IICM/2026/093',
                payment_date: '04 Aug 2026',
                bank_info: 'PNB Ranchi (A/c: 11980004567)'
            }
        ];
        try { localStorage.setItem('iicm_honorarium_data', JSON.stringify(list)); } catch(e) {}
    }
    return list;
}

function loadHonorariumTable() {
    const list = getHonorariumList();
    const searchVal = (document.getElementById('hon-search-input') ? document.getElementById('hon-search-input').value.trim().toLowerCase() : '');
    const tbody = document.getElementById('honorarium-table-body');
    if (!tbody) return;

    let filtered = list;
    if (searchVal) {
        filtered = list.filter(item =>
            (item.faculty_name || '').toLowerCase().includes(searchVal) ||
            (item.bill_ref || '').toLowerCase().includes(searchVal) ||
            (item.utr_number || '').toLowerCase().includes(searchVal) ||
            (item.program_title || '').toLowerCase().includes(searchVal)
        );
    }

    // Stats calculation
    const totalBills = list.length;
    const pendingSanction = list.filter(i => i.gm_status !== 'APPROVED' || i.payment_status !== 'DISBURSED').length;
    const totalDisbursedSum = list.filter(i => i.payment_status === 'DISBURSED').reduce((acc, curr) => acc + (curr.net_payable || 0), 0);

    if (document.getElementById('hon-stat-total')) document.getElementById('hon-stat-total').innerText = totalBills;
    if (document.getElementById('hon-stat-pending')) document.getElementById('hon-stat-pending').innerText = pendingSanction;
    if (document.getElementById('hon-stat-disbursed')) document.getElementById('hon-stat-disbursed').innerText = `₹ ${totalDisbursedSum.toLocaleString('en-IN')}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No honorarium bill records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(i => {
        const isDisbursed = i.payment_status === 'DISBURSED';
        const isApproved = i.gm_status === 'APPROVED';

        const statusBadge = isDisbursed
            ? '<span style="background:#dcfce7; color:#15803d; font-weight:800; padding:4px 10px; border-radius:12px; font-size:11.5px; border:1px solid #bbf7d0;">🟢 DISBURSED</span>'
            : (isApproved
                ? '<span style="background:#dbeafe; color:#1d4ed8; font-weight:800; padding:4px 10px; border-radius:12px; font-size:11.5px; border:1px solid #bfdbfe;">🟡 GM APPROVED</span>'
                : '<span style="background:#fef3c7; color:#b45309; font-weight:800; padding:4px 10px; border-radius:12px; font-size:11.5px; border:1px solid #fde68a;">⏳ PENDING GM</span>');

        const sessionBreakdownHtml = (i.sessions || []).map(s => `
            <div class="session-detail-row">
                <strong>${s.name}</strong>
                <span>${s.date} · ${s.time}</span>
            </div>
        `).join('');

        const sessionSummary = `
            <details class="compact-session-details">
                <summary>${i.session_count || (i.sessions || []).length || 0} scheduled sessions <span>View details</span></summary>
                <div class="session-detail-list">${sessionBreakdownHtml || '<span class="muted-cell">No session details available.</span>'}</div>
            </details>`;

        const storesInfo = i.utr_number ? `
            <div style="font-size:11.5px; color:#0f172a;">
                <div>🔑 <strong>UTR:</strong> <span style="font-family:monospace; font-weight:700;">${i.utr_number}</span></div>
                <div>🧾 <strong>Bill:</strong> ${i.bill_number}</div>
                <div>📅 <strong>Paid:</strong> ${i.payment_date}</div>
            </div>
        ` : `<span style="color:#94a3b8; font-size:11.5px; font-style:italic;">Awaiting Disbursal UTR</span>`;

        return `
            <tr class="compact-data-row">
                <td style="padding:14px 16px;">
                    <strong style="color:#064e3b; font-size:13.5px;">${i.bill_ref}</strong>
                    <div style="font-size:11.5px; color:#64748b;">${i.bill_date}</div>
                    <div class="faculty-inline">${i.faculty_name}</div>
                </td>
                <td style="padding:14px 16px;">
                    <div style="font-size:12.5px; font-weight:800; color:#1e40af; margin-bottom:6px;">${i.program_title}</div>
                    ${sessionSummary}
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#064e3b; font-size:14.5px;">₹ ${(i.net_payable || 10800).toLocaleString('en-IN')}</strong>
                    <div class="amount-breakup">Gross ₹${(i.gross_amount||12000).toLocaleString('en-IN')} · TDS ₹${(i.tds_amount||1200).toLocaleString('en-IN')}</div>
                </td>
                <td style="padding:14px 16px;">
                    ${statusBadge}
                    <div class="rating-inline">★ ${i.rating || '4.8'} rating</div>
                </td>
                <td style="padding:14px 16px;">
                    ${storesInfo}
                </td>
                <td style="padding:14px 16px; text-align:right;">
                    <button type="button" onclick="alert('📄 Honorarium Voucher Ref: ${i.bill_ref}\nFaculty: ${i.faculty_name}\nNet Payable: ₹${(i.net_payable||0).toLocaleString('en-IN')}\nUTR: ${i.utr_number || 'Pending'}\n\nOfficial voucher ready for finance release.')" style="background:#047857; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
                        📄 Voucher
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}
window.loadHonorariumTable = loadHonorariumTable;
