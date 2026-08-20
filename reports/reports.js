let currentTab = 'program';

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth();
    if (user) renderUserProfile(user);

    loadProgramSummaryReport();
});

function switchReportTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.report-section').forEach(sec => sec.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`section-${tabName}-report`).classList.add('active');

    if (tabName === 'program') loadProgramSummaryReport();
    else if (tabName === 'attendance') loadAttendanceReport();
    else if (tabName === 'feedback') loadFeedbackReport();
    else if (tabName === 'payment') loadPaymentReport();
}

async function loadProgramSummaryReport() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('report-program-tbody');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Loading program report...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/reports/program-summary/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const report = data.report || [];

            if (report.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No program records found.</td></tr>`;
                return;
            }

            tbody.innerHTML = report.map(r => `
                <tr>
                    <td><strong>${r.program_code}</strong></td>
                    <td><strong>${r.title}</strong></td>
                    <td>${r.program_type}</td>
                    <td>${r.venue}</td>
                    <td>${r.start_date} to ${r.end_date}</td>
                    <td>${r.duration_days} Days</td>
                    <td>₹${r.budget.toLocaleString()}</td>
                    <td>${r.confirmed_participants} / ${r.total_nominations}</td>
                    <td><span class="badge-status badge-${r.status.toLowerCase()}">${r.status.replace('_', ' ')}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Error loading program report.</td></tr>`;
    }
}

async function loadAttendanceReport() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('report-attendance-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Loading attendance report...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/reports/attendance-matrix/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const report = data.report || [];

            if (report.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">No attendance records found.</td></tr>`;
                return;
            }

            tbody.innerHTML = report.map(r => `
                <tr>
                    <td><strong>${r.eis_number}</strong></td>
                    <td>${r.trainee_name}</td>
                    <td><span class="role-pill">${r.company_code}</span></td>
                    <td>${r.program_title}</td>
                    <td>${r.total_sessions}</td>
                    <td>${r.attended_sessions}</td>
                    <td><strong>${r.attendance_percentage}%</strong></td>
                    <td>
                        <span class="badge-status badge-${r.certificate_eligible ? 'active' : 'rejected'}">
                            ${r.certificate_eligible ? '✅ YES (Eligible)' : '❌ NO (< 75%)'}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error loading attendance report.</td></tr>`;
    }
}

async function loadFeedbackReport() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('report-feedback-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Loading feedback report...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/feedback/analytics/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const feedbacks = data.feedbacks || [];

            if (feedbacks.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">No feedback entries submitted yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = feedbacks.map(f => `
                <tr>
                    <td><strong>${f.program_title}</strong></td>
                    <td>${f.trainee_name}</td>
                    <td><span class="role-pill">${f.company_code || 'CIL'}</span></td>
                    <td><strong style="color:#d4af37;">${f.rating} ★</strong></td>
                    <td>${f.content_rating} ★</td>
                    <td>${f.faculty_rating} ★</td>
                    <td>${f.facility_rating} ★</td>
                    <td>${f.comments || '-'}</td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error loading feedback report.</td></tr>`;
    }
}

async function loadPaymentReport() {
    const token = localStorage.getItem('iicm_access_token');
    const tbody = document.getElementById('report-payment-tbody');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Loading faculty payment report...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/payments/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const payments = data.results || data || [];

            if (payments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No payment slips generated yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = payments.map(p => `
                <tr>
                    <td><strong>${p.slip_reference}</strong></td>
                    <td>${p.faculty_name}</td>
                    <td>${p.designation}</td>
                    <td>${p.program_title}</td>
                    <td>${p.total_sessions} Sessions</td>
                    <td>₹${Number(p.gross_amount).toLocaleString()}</td>
                    <td style="color:#dc3545;">-₹${Number(p.tds_deduction).toLocaleString()}</td>
                    <td><strong style="color:#28a745;">₹${Number(p.net_payable).toLocaleString()}</strong></td>
                    <td><span class="badge-status badge-active">${p.payment_status}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Error loading payment report.</td></tr>`;
    }
}

function exportReportExcel() {
    window.location.href = `${API_BASE_URL}/reports/export-excel/?type=${currentTab}`;
}

function printReportPDF() {
    window.print();
}
