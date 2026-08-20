var API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

let currentTab = 'companies';
let currentPage = 1;
let currentSearch = '';
let currentStatusFilter = '';
let editingRecordId = null;
let departmentsList = []; // Cached departments for dropdowns

const API_CONFIG = {
    'companies': {
        title: 'Company Master',
        endpoint: `${API_BASE_URL}/masters/companies/`,
        columns: ['Code', 'Company Name', 'Address', 'Contact Email', 'Contact Phone', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.code}</strong></td>
            <td>${item.name}</td>
            <td>${item.address || '-'}</td>
            <td>${item.contact_email || '-'}</td>
            <td>${item.contact_phone || '-'}</td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Company Code *</label>
                <input type="text" id="field-code" class="form-control" value="${data.code || ''}" required placeholder="e.g. BCCL">
            </div>
            <div class="form-group">
                <label>Company Name *</label>
                <input type="text" id="field-name" class="form-control" value="${data.name || ''}" required placeholder="e.g. Bharat Coking Coal Limited">
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" id="field-address" class="form-control" value="${data.address || ''}" placeholder="e.g. Dhanbad, Jharkhand">
            </div>
            <div class="form-group">
                <label>Contact Email</label>
                <input type="email" id="field-contact_email" class="form-control" value="${data.contact_email || ''}" placeholder="info@bccl.gov.in">
            </div>
            <div class="form-group">
                <label>Contact Phone</label>
                <input type="text" id="field-contact_phone" class="form-control" value="${data.contact_phone || ''}" placeholder="+91-326-2230100">
            </div>
        `,
        getFormData: () => ({
            code: document.getElementById('field-code').value.trim(),
            name: document.getElementById('field-name').value.trim(),
            address: document.getElementById('field-address').value.trim(),
            contact_email: document.getElementById('field-contact_email').value.trim(),
            contact_phone: document.getElementById('field-contact_phone').value.trim(),
        })
    },

    'departments': {
        title: 'Department Master',
        endpoint: `${API_BASE_URL}/masters/departments/`,
        columns: ['Code', 'Department Name', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.code}</strong></td>
            <td>${item.name}</td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Department Code *</label>
                <input type="text" id="field-code" class="form-control" value="${data.code || ''}" required placeholder="e.g. MINING">
            </div>
            <div class="form-group">
                <label>Department Name *</label>
                <input type="text" id="field-name" class="form-control" value="${data.name || ''}" required placeholder="e.g. Mining Engineering">
            </div>
        `,
        getFormData: () => ({
            code: document.getElementById('field-code').value.trim(),
            name: document.getElementById('field-name').value.trim(),
        })
    },

    'designations': {
        title: 'Designation Master',
        endpoint: `${API_BASE_URL}/masters/designations/`,
        columns: ['Code', 'Designation Title', 'Grade / Level', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.code}</strong></td>
            <td>${item.title}</td>
            <td>${item.level || '-'}</td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Designation Code *</label>
                <input type="text" id="field-code" class="form-control" value="${data.code || ''}" required placeholder="e.g. GM_EX">
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="field-title" class="form-control" value="${data.title || ''}" required placeholder="e.g. General Manager (Executive)">
            </div>
            <div class="form-group">
                <label>Grade / Level</label>
                <input type="text" id="field-level" class="form-control" value="${data.level || ''}" placeholder="e.g. E-8">
            </div>
        `,
        getFormData: () => ({
            code: document.getElementById('field-code').value.trim(),
            title: document.getElementById('field-title').value.trim(),
            level: document.getElementById('field-level').value.trim(),
        })
    },

    'faculties': {
        title: 'Faculty Master',
        endpoint: `${API_BASE_URL}/faculty/faculties/`,
        columns: ['Faculty Name', 'Email / Phone', 'Type', 'Specialization', 'Department', 'Rate / Hr', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.name}</strong></td>
            <td>${item.email || '-'}<br><small>${item.phone || ''}</small></td>
            <td><span class="role-pill" style="background:#40916c;">${item.faculty_type}</span></td>
            <td>${item.specialization}</td>
            <td>${item.department_name || '-'}</td>
            <td>₹${item.honorarium_rate_per_hour}</td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Faculty Full Name *</label>
                <input type="text" id="field-name" class="form-control" value="${data.name || ''}" required placeholder="e.g. Dr. A. K. Sharma">
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input type="email" id="field-email" class="form-control" value="${data.email || ''}" placeholder="ak.sharma@iicm.ac.in">
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="text" id="field-phone" class="form-control" value="${data.phone || ''}" placeholder="+91-9431102030">
            </div>
            <div class="form-group">
                <label>Faculty Type *</label>
                <select id="field-faculty_type" class="form-control">
                    <option value="INTERNAL" ${data.faculty_type === 'INTERNAL' ? 'selected' : ''}>Internal Faculty (IICM / CIL)</option>
                    <option value="EXTERNAL" ${data.faculty_type === 'EXTERNAL' ? 'selected' : ''}>External Visiting Expert</option>
                </select>
            </div>
            <div class="form-group">
                <label>Specialization *</label>
                <input type="text" id="field-specialization" class="form-control" value="${data.specialization || ''}" required placeholder="e.g. Mine Automation & Safety">
            </div>
            <div class="form-group">
                <label>Department</label>
                <select id="field-department" class="form-control">
                    <option value="">-- Select Department --</option>
                    ${departmentsList.map(d => `<option value="${d.id}" ${data.department === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Honorarium Rate Per Hour (₹) *</label>
                <input type="number" id="field-rate" class="form-control" value="${data.honorarium_rate_per_hour || 1000}" required step="50">
            </div>
        `,
        getFormData: () => ({
            name: document.getElementById('field-name').value.trim(),
            email: document.getElementById('field-email').value.trim(),
            phone: document.getElementById('field-phone').value.trim(),
            faculty_type: document.getElementById('field-faculty_type').value,
            specialization: document.getElementById('field-specialization').value.trim(),
            department: document.getElementById('field-department').value || null,
            honorarium_rate_per_hour: document.getElementById('field-rate').value,
        })
    },

    'venues': {
        title: 'Venue Master',
        endpoint: `${API_BASE_URL}/masters/venues/`,
        columns: ['Venue Name', 'Building / Location', 'Capacity', 'Facilities', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.name}</strong></td>
            <td>${item.building || 'Main Campus'}</td>
            <td>${item.capacity} Seats</td>
            <td>
                ${item.has_projector ? '📽️ Projector ' : ''}
                ${item.has_ac ? '❄️ AC' : ''}
            </td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Venue / Hall Name *</label>
                <input type="text" id="field-name" class="form-control" value="${data.name || ''}" required placeholder="e.g. Executive Seminar Room 2">
            </div>
            <div class="form-group">
                <label>Building / Location</label>
                <input type="text" id="field-building" class="form-control" value="${data.building || ''}" placeholder="e.g. Academic Block 2">
            </div>
            <div class="form-group">
                <label>Seating Capacity *</label>
                <input type="number" id="field-capacity" class="form-control" value="${data.capacity || 30}" required min="1">
            </div>
            <div class="form-group" style="display:flex; gap: 20px;">
                <label><input type="checkbox" id="field-has_projector" ${data.has_projector !== false ? 'checked' : ''}> Has Projector</label>
                <label><input type="checkbox" id="field-has_ac" ${data.has_ac !== false ? 'checked' : ''}> Has AC</label>
            </div>
        `,
        getFormData: () => ({
            name: document.getElementById('field-name').value.trim(),
            building: document.getElementById('field-building').value.trim(),
            capacity: document.getElementById('field-capacity').value,
            has_projector: document.getElementById('field-has_projector').checked,
            has_ac: document.getElementById('field-has_ac').checked,
        })
    },

    'program-types': {
        title: 'Program Type Master',
        endpoint: `${API_BASE_URL}/masters/program-types/`,
        columns: ['Code', 'Type Name', 'Description', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.code}</strong></td>
            <td>${item.name}</td>
            <td>${item.description || '-'}</td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Program Type Code *</label>
                <input type="text" id="field-code" class="form-control" value="${data.code || ''}" required placeholder="e.g. MDP">
            </div>
            <div class="form-group">
                <label>Type Name *</label>
                <input type="text" id="field-name" class="form-control" value="${data.name || ''}" required placeholder="e.g. Management Development Program">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="field-description" class="form-control" rows="3" placeholder="Description of program type...">${data.description || ''}</textarea>
            </div>
        `,
        getFormData: () => ({
            code: document.getElementById('field-code').value.trim(),
            name: document.getElementById('field-name').value.trim(),
            description: document.getElementById('field-description').value.trim(),
        })
    },

    'subjects': {
        title: 'Training Subject Master',
        endpoint: `${API_BASE_URL}/masters/subjects/`,
        columns: ['Subject Code', 'Subject Name', 'Department', 'Status', 'Actions'],
        renderRow: (item) => `
            <td><strong>${item.code}</strong></td>
            <td>${item.subject_name}</td>
            <td>${item.department_name || '-'}</td>
            <td><span class="badge-status ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="openEditModal(${item.id})">Edit</button>
                <button class="btn-warning btn-sm" onclick="toggleStatus(${item.id}, ${!item.is_active})">${item.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn-danger btn-sm" onclick="deleteRecord(${item.id})">Delete</button>
            </td>
        `,
        fields: (data = {}) => `
            <div class="form-group">
                <label>Subject Code *</label>
                <input type="text" id="field-code" class="form-control" value="${data.code || ''}" required placeholder="e.g. SUB_MIN_01">
            </div>
            <div class="form-group">
                <label>Subject Name *</label>
                <input type="text" id="field-subject_name" class="form-control" value="${data.subject_name || ''}" required placeholder="e.g. Modern Underground Mining Automation">
            </div>
            <div class="form-group">
                <label>Department</label>
                <select id="field-department" class="form-control">
                    <option value="">-- Select Department --</option>
                    ${departmentsList.map(d => `<option value="${d.id}" ${data.department === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                </select>
            </div>
        `,
        getFormData: () => ({
            code: document.getElementById('field-code').value.trim(),
            subject_name: document.getElementById('field-subject_name').value.trim(),
            department: document.getElementById('field-department').value || null,
        })
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth('ADMIN');
    if (user) renderUserProfile(user);

    await fetchDepartments();
    loadMasterData();
});

async function fetchDepartments() {
    try {
        const token = localStorage.getItem('iicm_access_token');
        const res = await fetch(`${API_BASE_URL}/masters/departments/?page_size=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            departmentsList = data.results || data;
        }
    } catch (e) {
        console.warn("Failed to fetch departments cache.");
    }
}

function switchTab(tabKey) {
    currentTab = tabKey;
    currentPage = 1;
    currentSearch = '';
    currentStatusFilter = '';
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = '';

    document.querySelectorAll('.master-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));

    const tabBtn = document.getElementById(`tab-${tabKey}`);
    if (tabBtn) tabBtn.classList.add('active');

    loadMasterData();
}

async function loadMasterData() {
    const config = API_CONFIG[currentTab];
    const token = localStorage.getItem('iicm_access_token');
    const tableHead = document.getElementById('table-head-row');
    const tableBody = document.getElementById('table-body-rows');
    const pageInfo = document.getElementById('pagination-info');
    const pageBtns = document.getElementById('pagination-btns');

    // Render Table Header
    tableHead.innerHTML = config.columns.map(col => `<th>${col}</th>`).join('');
    tableBody.innerHTML = `<tr><td colspan="${config.columns.length}" style="text-align:center; padding:30px;">Loading ${config.title}...</td></tr>`;

    let url = `${config.endpoint}?page=${currentPage}`;
    if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
    if (currentStatusFilter !== '') url += `&is_active=${currentStatusFilter}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            tableBody.innerHTML = `<tr><td colspan="${config.columns.length}" style="text-align:center; color:#dc3545;">Failed to load data.</td></tr>`;
            return;
        }

        const data = await res.json();
        const results = data.results || data;
        const totalCount = data.count || results.length;

        if (results.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${config.columns.length}" style="text-align:center; padding:40px; color:#6c757d;">No ${config.title} records found.</td></tr>`;
            pageInfo.innerText = `Showing 0 of 0 records`;
            pageBtns.innerHTML = '';
            return;
        }

        // Render Table Rows
        tableBody.innerHTML = results.map(item => `<tr>${config.renderRow(item)}</tr>`).join('');

        // Render Pagination Info
        pageInfo.innerText = `Showing ${results.length} of ${totalCount} records (Page ${currentPage})`;

        // Render Pagination Buttons
        let btnsHTML = '';
        if (data.previous) {
            btnsHTML += `<button class="btn-secondary btn-sm" onclick="changePage(${currentPage - 1})">← Previous</button>`;
        }
        if (data.next) {
            btnsHTML += `<button class="btn-secondary btn-sm" onclick="changePage(${currentPage + 1})">Next →</button>`;
        }
        pageBtns.innerHTML = btnsHTML;

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="${config.columns.length}" style="text-align:center; color:#dc3545;">Connection error.</td></tr>`;
    }
}

function handleSearch() {
    currentSearch = document.getElementById('search-input').value.trim();
    currentPage = 1;
    loadMasterData();
}

function handleFilterChange() {
    currentStatusFilter = document.getElementById('status-filter').value;
    currentPage = 1;
    loadMasterData();
}

function changePage(newPage) {
    currentPage = newPage;
    loadMasterData();
}

// Modal Handlers
function openAddModal() {
    const config = API_CONFIG[currentTab];
    editingRecordId = null;
    document.getElementById('modal-title').innerText = `Add New ${config.title.replace('Master', '')}`;
    document.getElementById('modal-form-fields').innerHTML = config.fields();
    document.getElementById('master-modal').style.display = 'flex';
}

async function openEditModal(recordId) {
    const config = API_CONFIG[currentTab];
    const token = localStorage.getItem('iicm_access_token');
    editingRecordId = recordId;

    try {
        const res = await fetch(`${config.endpoint}${recordId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('modal-title').innerText = `Edit ${config.title.replace('Master', '')} (#${recordId})`;
            document.getElementById('modal-form-fields').innerHTML = config.fields(data);
            document.getElementById('master-modal').style.display = 'flex';
        }
    } catch (e) {
        alert("Unable to fetch record details.");
    }
}

function closeModal() {
    document.getElementById('master-modal').style.display = 'none';
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const config = API_CONFIG[currentTab];
    const token = localStorage.getItem('iicm_access_token');
    const payload = config.getFormData();
    const submitBtn = document.getElementById('modal-submit-btn');

    submitBtn.innerText = 'Saving...';
    submitBtn.disabled = true;

    try {
        const url = editingRecordId ? `${config.endpoint}${editingRecordId}/` : config.endpoint;
        const method = editingRecordId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal();
            loadMasterData();
        } else {
            const errData = await res.json();
            alert(`Save failed: ${JSON.stringify(errData)}`);
        }
    } catch (err) {
        alert("Server error occurred while saving record.");
    } finally {
        submitBtn.innerText = 'Save Record';
        submitBtn.disabled = false;
    }
}

async function toggleStatus(recordId, newStatus) {
    const config = API_CONFIG[currentTab];
    const token = localStorage.getItem('iicm_access_token');

    try {
        const res = await fetch(`${config.endpoint}${recordId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: newStatus })
        });

        if (res.ok) {
            loadMasterData();
        } else {
            alert("Failed to update status.");
        }
    } catch (e) {
        alert("Server connection error.");
    }
}

async function deleteRecord(recordId) {
    if (!confirm(`Are you sure you want to delete this record (#${recordId})?`)) return;

    const config = API_CONFIG[currentTab];
    const token = localStorage.getItem('iicm_access_token');

    try {
        const res = await fetch(`${config.endpoint}${recordId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadMasterData();
        } else {
            alert("Delete failed. Item may be referenced elsewhere.");
        }
    } catch (e) {
        alert("Server connection error.");
    }
}
