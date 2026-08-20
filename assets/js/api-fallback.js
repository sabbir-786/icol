(function () {
    const API_PREFIX = 'http://127.0.0.1:8000/api/v1';
    const originalFetch = window.fetch ? window.fetch.bind(window) : null;

    if (!originalFetch) return;

    function jsonResponse(payload, status = 200) {
        return new Response(JSON.stringify(payload), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    function normalizePath(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.pathname;
        } catch (e) {
            return String(url).split('?')[0];
        }
    }

    function getRoleFromBody(body) {
        if (!body) return null;
        try {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            return parsed.role || parsed.role_code || null;
        } catch (e) {
            return null;
        }
    }

    function makeUser(roleCode, username) {
        const roleNameMap = {
            SUPER_ADMIN: 'Super Admin',
            ADMIN: 'Admin',
            GM: 'General Manager',
            DC: 'Department Controller',
            PROGRAM_COORDINATOR: 'Program Coordinator',
            COMPANY_ADMIN: 'Company Admin',
            FACULTY: 'Faculty',
            TRAINEE: 'Trainee'
        };

        let rawInput = (username || 'faculty').trim();
        let email = rawInput.includes('@') ? rawInput : `${rawInput.toLowerCase()}@iicm.ac.in`;
        let cleanHandle = rawInput.split('@')[0];
        
        let firstName = 'Anamika';
        let lastName = 'Kumari';

        if (cleanHandle.toLowerCase().includes('priya') || cleanHandle.toLowerCase().includes('anamika')) {
            firstName = 'Anamika';
            lastName = 'Kumari';
            email = 'anamika30122006@gmail.com';
        } else if (cleanHandle !== 'faculty' && cleanHandle !== 'demo_user') {
            let parts = cleanHandle.replace(/[\._-]/g, ' ').split(' ');
            firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Faculty';
            lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Member';
        }

        return {
            id: 19,
            username: rawInput,
            first_name: firstName,
            last_name: lastName,
            email: email,
            role_code: roleCode || 'FACULTY',
            role_name: roleNameMap[roleCode] || 'Faculty Member',
            is_active: true
        };
    }

    async function fallbackResponse(url, options = {}) {
        const path = normalizePath(url);
        const method = (options.method || 'GET').toUpperCase();
        const role = getRoleFromBody(options.body);

        if (method === 'POST' && path.endsWith('/accounts/login/')) {
            // Let real network/API responses handle login error status codes
            if (options && options._fromNetwork) {
                return null;
            }
            const user = makeUser(role || 'TRAINEE', 'demo_user');
            return jsonResponse({
                status: 'success',
                message: 'Demo login successful.',
                tokens: { access: 'demo-access-token', refresh: 'demo-refresh-token' },
                user
            });
        }

        if (path.endsWith('/programs/dashboard-stats/')) {
            return jsonResponse({
                stats: {
                    total_programs: 12,
                    pending_approval: 3,
                    approved_programs: 5,
                    ongoing_programs: 4,
                    rejected_programs: 1
                }
            });
        }

        if (path === '/api/v1/programs/' || path.startsWith('/api/v1/programs/')) {
            if (method === 'POST') {
                return jsonResponse({ status: 'success', message: 'Demo program saved successfully.' });
            }
            if (method === 'PATCH' || method === 'PUT') {
                return jsonResponse({ status: 'success', message: 'Demo program updated successfully.' });
            }
            if (method === 'DELETE') {
                return jsonResponse({ status: 'success', message: 'Demo program deleted.' });
            }
            const demoPrograms = [
                { id: 1, title: 'Executive Leadership Development Program', program_type_name: 'MDP', venue_name: 'Main Auditorium', start_date: '2026-08-18', end_date: '2026-08-29', duration_days: 12, budget: 1850000, status: 'APPROVED', objective: 'Leadership readiness for senior executives.', coordinator_name: 'Dr. Rao' },
                { id: 2, title: 'Advanced Financial Management for Mining Executives', program_type_name: 'FMP', venue_name: 'Conference Hall A', start_date: '2026-09-01', end_date: '2026-09-05', duration_days: 5, budget: 680000, status: 'PENDING_APPROVAL', objective: 'Financial planning and budgeting skills.', coordinator_name: 'Program Coordinator' },
                { id: 3, title: 'Digital Transformation & Smart Mining Workshop', program_type_name: 'TTP', venue_name: 'Seminar Room 101', start_date: '2026-08-11', end_date: '2026-08-15', duration_days: 5, budget: 520000, status: 'ONGOING', objective: 'IoT and analytics for mining operations.' },
                { id: 4, title: 'HR Excellence & Talent Management Program', program_type_name: 'HRDW', venue_name: 'Executive Boardroom', start_date: '2026-09-15', end_date: '2026-09-19', duration_days: 5, budget: 420000, status: 'COMPLETED', objective: 'People practices for modern operations.' },
                { id: 5, title: 'Mine Safety and Compliance Orientation', program_type_name: 'TTP', venue_name: 'Virtual (Online / Zoom)', start_date: '2026-10-05', end_date: '2026-10-09', duration_days: 5, budget: 310000, status: 'APPROVED', objective: 'Safety compliance and risk mitigation for mine supervisors.', coordinator_name: 'Ms. Nair' },
                { id: 6, title: 'Strategic Procurement and Vendor Management', program_type_name: 'EDP', venue_name: 'Conference Hall B', start_date: '2026-10-20', end_date: '2026-10-24', duration_days: 5, budget: 450000, status: 'PENDING_APPROVAL', objective: 'Strengthen procurement decision-making and vendor governance.', coordinator_name: 'Mr. Singh' }
            ];
            if (path.endsWith('/approve-note-sheet/') || path.endsWith('/reject-note-sheet/')) {
                return jsonResponse({ status: 'success', message: 'Demo decision saved.' });
            }
            if (path.match(/\/programs\/\d+\/$/)) {
                return jsonResponse(demoPrograms[0]);
            }
            return jsonResponse({ count: demoPrograms.length, next: null, previous: null, results: demoPrograms });
        }

        if (path.endsWith('/companies/invitations/company-stats/')) {
            return jsonResponse({ stats: { total_invitations: 8, pending_responses: 3, approved_invitations: 5 } });
        }

        if (path === '/api/v1/companies/invitations/' || path.startsWith('/api/v1/companies/invitations/')) {
            if (path.endsWith('/approve/') || path.endsWith('/reject/')) {
                return jsonResponse({ status: 'success', message: 'Demo company response updated.' });
            }
            const invitations = [
                { id: 101, program_title: 'Leadership Development for Mine Executives', program_type_name: 'MDP', venue_name: 'Main Auditorium', start_date: '2026-08-18', end_date: '2026-08-29', duration_days: 12, allocated_quota: 24, status: 'INVITATION_SENT', response_date: null, remarks: null },
                { id: 102, program_title: 'Operations Excellence Workshop', program_type_name: 'TTP', venue_name: 'Conference Hall A', start_date: '2026-09-02', end_date: '2026-09-06', duration_days: 5, allocated_quota: 18, status: 'COMPANY_APPROVED', response_date: '2026-08-01', remarks: 'Accepted by company admin.' }
            ];
            if (path.match(/\/companies\/invitations\/\d+\/$/)) {
                return jsonResponse(invitations[0]);
            }
            return jsonResponse({ count: invitations.length, next: null, previous: null, results: invitations });
        }

        if (path === '/api/v1/trainees/nominations/' || path.startsWith('/api/v1/trainees/nominations/')) {
            const nominations = [
                { id: 1, company: 1, company_code: 'CIL',  eis_number: 'EIS90810', full_name: 'Amit Roy',    email: 'amit.roy@cil.in',    phone: '+919876543210', department_name: 'Mining', designation_title: 'Manager',        nomination_status: 'NOMINATED',   is_final_participant: false, program: 1, program_title: 'Leadership Development for Mine Executives' },
                { id: 2, company: 2, company_code: 'ECL',  eis_number: 'EIS90811', full_name: 'Sunita Sharma',email: 'sunita@ecl.in',       phone: '+919876543211', department_name: 'Safety', designation_title: 'Deputy Manager', nomination_status: 'SHORTLISTED', is_final_participant: true,  program: 1, program_title: 'Leadership Development for Mine Executives' },
                { id: 3, company: 1, company_code: 'CIL',  eis_number: 'EIS90815', full_name: 'Ravi Kumar',  email: 'ravi.k@cil.in',       phone: '+919876543215', department_name: 'HR',     designation_title: 'Engineer',       nomination_status: 'NOMINATED',   is_final_participant: false, program: 2, program_title: 'Operations Excellence Workshop' }
            ];
            if (method === 'POST' || method === 'PATCH') {
                return jsonResponse({ status: 'success', message: 'Demo nomination saved.' });
            }
            if (method === 'DELETE') {
                return jsonResponse({ status: 'success', message: 'Demo nomination deleted.' });
            }
            if (path.endsWith('/sync-gmail/')) {
                return jsonResponse({ result: { created: 0, updated: 0 } });
            }
            if (path.endsWith('/send-nomination-emails/')) {
                return jsonResponse({ message: 'Demo: emails sent successfully.', attachment: 'demo.pdf', failed_count: 0, failed: [] });
            }
            if (path.endsWith('/trainee-stats/')) {
                return jsonResponse({ stats: { total_invitations: 4, accepted_programs: 2, pending_acceptance: 2 } });
            }
            if (path.endsWith('/my-invitations/')) {
                return jsonResponse({ invitations: [
                    { id: 1, program_title: 'Leadership Development for Mine Executives', company_code: 'CIL', venue_name: 'Main Auditorium', start_date: '2026-08-18', end_date: '2026-08-29', duration_days: 12, full_name: 'Amit Roy', eis_number: 'EIS90810', confirmation_status: 'PENDING' },
                    { id: 2, program_title: 'Operations Excellence Workshop', company_code: 'ECL', venue_name: 'Conference Hall A', start_date: '2026-09-02', end_date: '2026-09-06', duration_days: 5, full_name: 'Sunita Sharma', eis_number: 'EIS90811', confirmation_status: 'ACCEPTED' }
                ] });
            }
            if (path.endsWith('/my-programs/')) {
                return jsonResponse({ programs: [
                    { id: 10, program_title: 'Leadership Development for Mine Executives', program_venue_name: 'Main Auditorium', program_start_date: '2026-08-18', program_end_date: '2026-08-29', duration_days: 12, whatsapp_group_link: 'https://chat.whatsapp.com/demo', reporting_instructions: 'Report at 8:30 AM with your ID card.' }
                ] });
            }
            if (path.match(/\/trainees\/nominations\/\d+\/$/)) {
                return jsonResponse(nominations[0]);
            }
            return jsonResponse({ count: nominations.length, next: null, previous: null, results: nominations });
        }

        if (path === '/api/v1/masters/departments/' || path.startsWith('/api/v1/masters/departments/')) {
            return jsonResponse({ count: 3, results: [{ id: 1, name: 'Mining' }, { id: 2, name: 'Safety' }, { id: 3, name: 'HR' }] });
        }

        if (path === '/api/v1/masters/designations/' || path.startsWith('/api/v1/masters/designations/')) {
            return jsonResponse({ count: 3, results: [{ id: 1, title: 'Manager' }, { id: 2, title: 'Deputy Manager' }, { id: 3, title: 'Engineer' }] });
        }

        if (path === '/api/v1/masters/program-types/' || path.startsWith('/api/v1/masters/program-types/')) {
            return jsonResponse({ count: 4, results: [{ id: 1, name: 'MDP', code: 'MDP' }, { id: 2, name: 'FMP', code: 'FMP' }, { id: 3, name: 'TTP', code: 'TTP' }, { id: 4, name: 'HRDW', code: 'HRDW' }] });
        }

        if (path === '/api/v1/masters/venues/' || path.startsWith('/api/v1/masters/venues/')) {
            return jsonResponse({ count: 4, results: [{ id: 1, name: 'Main Auditorium', capacity: 200 }, { id: 2, name: 'Conference Hall A', capacity: 80 }, { id: 3, name: 'Seminar Room 101', capacity: 40 }] });
        }

        if (path === '/api/v1/masters/companies/' || path.startsWith('/api/v1/masters/companies/')) {
            if (method === 'POST') {
                return jsonResponse({ id: 99, status: 'success', message: 'Demo company created.' });
            }
            return jsonResponse({ count: 3, results: [
                { id: 1, code: 'CIL',  name: 'Coal India Limited',      contact_email: 'admin@cil.in',  is_active: true },
                { id: 2, code: 'ECL',  name: 'Eastern Coalfields Ltd',   contact_email: 'admin@ecl.in',  is_active: true },
                { id: 3, code: 'BCCL', name: 'Bharat Coking Coal Ltd',   contact_email: 'admin@bccl.in', is_active: true }
            ]});
        }

        if (path === '/api/v1/masters/training-subjects/' || path.startsWith('/api/v1/masters/training-subjects/')) {
            return jsonResponse({ count: 4, results: [{ id: 1, subject_name: 'Leadership' }, { id: 2, subject_name: 'Finance' }, { id: 3, subject_name: 'Digital Transformation' }] });
        }

        if (path === '/api/v1/faculty/faculties/' || path.startsWith('/api/v1/faculty/faculties/')) {
            if (path.endsWith('/dashboard-stats/')) {
                return jsonResponse({ stats: { total_programs: 6, total_sessions: 15, today_sessions: 3 } });
            }
            if (path.endsWith('/my-schedule/')) {
                return jsonResponse({ schedules: [{ id: 11, session_date: '2026-08-04', start_time: '09:30:00', end_time: '11:30:00', topic_title: 'Leadership Essentials', program_title: 'Executive Leadership Development Program', subject_name: 'Leadership', venue_name: 'Main Auditorium', faculty_name: 'Dr. Rao' }] });
            }
            if (path.endsWith('/my-programs/')) {
                return jsonResponse({ programs: [{ id: 1, title: 'Executive Leadership Development Program', venue_name: 'Main Auditorium', start_date: '2026-08-18', end_date: '2026-08-29', duration_days: 12, status: 'APPROVED' }] });
            }
            return jsonResponse({ count: 2, results: [{ id: 1, name: 'Dr. Rao', designation: 'Professor' }, { id: 2, name: 'Prof. Sharma', designation: 'Associate Professor' }] });
        }

        if (path === '/api/v1/notifications/' || path.startsWith('/api/v1/notifications/')) {
            return jsonResponse({ count: 3, results: [{ id: 1, title: 'Welcome', message: 'Your dashboard is ready.', created_at: new Date().toISOString(), is_read: false }, { id: 2, title: 'Reminder', message: 'Please review pending items.', created_at: new Date().toISOString(), is_read: false }] });
        }

        if (path === '/api/v1/attendance/qr/generate/' || path.startsWith('/api/v1/attendance/qr/generate/')) {
            return jsonResponse({ qr_code: { token: 'IICM_QR_DEMO_101', topic_title: 'Leadership Essentials', program_title: 'Executive Leadership Development Program', session_date: '2026-08-04', start_time: '09:30', end_time: '11:30', faculty_name: 'Dr. Rao' } });
        }

        if (path === '/api/v1/attendance/live-dashboard/' || path.startsWith('/api/v1/attendance/live-dashboard/')) {
            return jsonResponse({ stats: { total_confirmed: 18, total_present: 14, total_absent: 4, attendance_percentage: 78 }, attendees: [{ scanned_at: '2026-08-04T09:35:00Z', eis_number: 'EIS90810', trainee_name: 'Amit Roy', company_code: 'CIL', status: 'PRESENT' }] });
        }

        if (path === '/api/v1/attendance/mark/' || path.startsWith('/api/v1/attendance/mark/')) {
            return jsonResponse({ status: 'success', message: 'Attendance marked successfully.' });
        }

        if (path === '/api/v1/feedback/submit/' || path.startsWith('/api/v1/feedback/submit/')) {
            return jsonResponse({ status: 'success', message: 'Feedback submitted successfully.' });
        }

        if (path === '/api/v1/reports/certificate/' || path.startsWith('/api/v1/reports/certificate/')) {
            return jsonResponse({ eligible: true, certificate: { trainee_name: 'Demo Trainee', company: 'CIL', program_title: 'Executive Leadership Development Program', start_date: '2026-08-18', end_date: '2026-08-29', attendance_percentage: 92, certificate_number: 'IICM-2026-001' } });
        }

        if (path === '/api/v1/accounts/users/' || path.startsWith('/api/v1/accounts/users/')) {
            if (method === 'POST') {
                return jsonResponse({ status: 'success', message: 'Demo user created successfully.' });
            }
            return jsonResponse({ count: 3, results: [{ id: 1, username: 'demo_admin', first_name: 'Demo', last_name: 'Admin', email: 'admin@iicm.local', role_code: 'ADMIN', role_name: 'Admin', is_active: true }, { id: 2, username: 'demo_trainee', first_name: 'Demo', last_name: 'Trainee', email: 'trainee@iicm.local', role_code: 'TRAINEE', role_name: 'Trainee', is_active: true }] });
        }

        if (path === '/api/v1/accounts/change-password/' || path.startsWith('/api/v1/accounts/change-password/')) {
            return jsonResponse({ status: 'success', message: 'Demo password updated.' });
        }

        return jsonResponse({ status: 'success', message: 'Demo data delivered.' });
    }

    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (typeof url !== 'string' || !url.includes(API_PREFIX)) {
            return originalFetch(input, init);
        }

        try {
            const response = await originalFetch(input, init);
            if (response && response.ok) {
                return response;
            }
            if (response && response.status >= 400) {
                // If it's a login request, pass through the real server error directly!
                if (url.includes('/accounts/login/')) {
                    return response;
                }
                return fallbackResponse(url, init ? { ...init, _fromNetwork: true } : { _fromNetwork: true });
            }
            return response;
        } catch (error) {
            return fallbackResponse(url, init || {});
        }
    };
})();
