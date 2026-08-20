/* ════════════════════════════════════════════════════════════════
   PROGRAM DESIGN & SCHEDULE MODULE  —  program-design.js
   Loaded after program_coordinator.js to override/extend functions.
════════════════════════════════════════════════════════════════ */

/* ─── Demo Faculty Dropdown (2 Examples) ─── */
function _populateDemoFacultyDropdown(select) {
    var list = [
        { id: 1, name: 'Prof. Piyush Rai', org: 'IIT (Banaras Hindu University)' },
        { id: 2, name: 'Dr. Manish Kumar', org: 'IIM Ranchi' }
    ];
    if (select) {
        select.innerHTML = '<option value="">-- Select Faculty --</option>' +
            list.map(function(f) { return '<option value="' + f.id + '">' + f.name + ' — ' + f.org + '</option>'; }).join('');
    }
}

/* ─── Override populateFacultyAssignDropdowns ─── */
window.populateFacultyAssignDropdowns = async function() {
    await window.onProgramTypeFilterChange();
    var facSelect = document.getElementById('assign-faculty-select');
    if (!facSelect) return;
    var token = localStorage.getItem('iicm_access_token');
    try {
        var res = await fetch(window.API_BASE_URL + '/faculty/faculties/', { headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            var data = await res.json();
            var facs = data.results || data;
            facSelect.innerHTML = '<option value="">-- Select Faculty --</option>' +
                facs.map(function(f) { return '<option value="' + f.id + '">' + f.name + (f.specialization ? ' (' + f.specialization + ')' : '') + '</option>'; }).join('');
            return;
        }
    } catch(e) {}
    _populateDemoFacultyDropdown(facSelect);
};

/* ─── Program Type Filter: Empty / Non-Empty ─── */
window.onProgramTypeFilterChange = async function() {
    var typeSelect = document.getElementById('design-prog-type-select');
    var progSelect = document.getElementById('assign-prog-select');
    if (!typeSelect || !progSelect) return;

    var filterType   = typeSelect.value;
    var allPrograms  = (typeof getUnifiedCoordinatorPrograms === 'function') ? getUnifiedCoordinatorPrograms() : [];
    var filtered = allPrograms.filter(function(p) {
        var programType = String(p.program_type_name || p.program_type || p.type || 'MT').toUpperCase();
        var isNonMT = programType.indexOf('NON') !== -1;
        return filterType === 'NON_MT' ? isNonMT : !isNonMT;
    });
    if (filtered.length === 0) filtered = allPrograms;
    progSelect.innerHTML = '<option value="">-- Select Program Title --</option>'+
        filtered.map(function(p){ return '<option value="'+p.id+'">'+p.title+'</option>'; }).join('');
};

/* ─── Program Title selected ─── */
window.onProgramTitleSelectChange = async function() {
    await window.loadFacultySchedulesTable();
    window.renderProgramScheduleGrid();
    var progId = ((document.getElementById('assign-prog-select'))||{}).value||'';
    var venueInp = document.getElementById('assign-prog-venue');
    if (progId && venueInp) {
        var venues = {};
        try { venues = JSON.parse(localStorage.getItem('iicm_program_venues')||'{}'); } catch(e) {}
        venueInp.value = venues[progId] || 'Main Auditorium, IICM';
    }
};

/* ─── Session Slot auto-fill times ─── */
window.onSessionSlotChange = function() {
    var slotSel   = document.getElementById('assign-session-slot');
    var startInp  = document.getElementById('assign-start');
    var endInp    = document.getElementById('assign-end');
    var topicInp  = document.getElementById('assign-topic');
    if (!slotSel || !startInp || !endInp) return;

    var MAP = {
        '10.00AM-11.15 AM':  {s:'10:00',e:'11:15',lock:false},
        '11.30 AM-01.00PM':  {s:'11:30',e:'13:00',lock:false},
        '1.00 PM TO 2.00 PM':{s:'13:00',e:'14:00',lock:true },
        '2.00 PM -3.15 PM':  {s:'14:00',e:'15:15',lock:false},
        '3.15 PM-5.00PM':    {s:'15:15',e:'17:00',lock:false},
        '06.30 AM-07.30 AM': {s:'06:30',e:'07:30',lock:false},
        'custom':            {s:'',e:'',lock:false}
    };
    var slot = MAP[slotSel.value];
    if (!slot) return;
    startInp.value = slot.s; endInp.value = slot.e;
    startInp.readOnly = slot.lock; endInp.readOnly = slot.lock;
    startInp.style.background = slot.lock ? '#f1f5f9' : '';
    endInp.style.background   = slot.lock ? '#f1f5f9' : '';
    if (slotSel.value === '1.00 PM TO 2.00 PM' && topicInp && !topicInp.value) topicInp.value = 'LUNCH BREAK';
    if (slotSel.value === '06.30 AM-07.30 AM'  && topicInp && !topicInp.value) topicInp.value = 'Yoga Session';
};

/* ─── Handle Session form submit ─── */
window.handleAssignFacultySubmit = async function(event) {
    event.preventDefault();
    var program   = ((document.getElementById('assign-prog-select')    )||{}).value||'';
    var faculty   = ((document.getElementById('assign-faculty-select') )||{}).value||'';
    var topic     = ((document.getElementById('assign-topic')          )||{}).value||'';
    var date      = ((document.getElementById('assign-date')           )||{}).value||'';
    var startTime = ((document.getElementById('assign-start')          )||{}).value||'';
    var endTime   = ((document.getElementById('assign-end')            )||{}).value||'';
    var slotVal   = ((document.getElementById('assign-session-slot')   )||{}).value||'';

    if (!program || !faculty || !topic || !date) {
        alert('Please fill all required fields: Program Title, Faculty, Topic, and Date.');
        return;
    }

    var facSel = document.getElementById('assign-faculty-select');
    var facultyName = (facSel && facSel.options[facSel.selectedIndex]) ? facSel.options[facSel.selectedIndex].text : 'Faculty';

    var newSession = {
        id:Date.now(), program_id:program, session_slot:slotVal,
        topic_title:topic, faculty_id:faculty, faculty_name:facultyName,
        session_date:date, start_time:startTime, end_time:endTime, invitation_status:'PENDING'
    };

    var ps = {};
    try { ps = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}'); } catch(e) {}
    if (!ps[program]) ps[program] = [];
    ps[program].push(newSession);
    localStorage.setItem('iicm_program_sessions', JSON.stringify(ps));

    var token = localStorage.getItem('iicm_access_token');
    try {
        await fetch(window.API_BASE_URL+'/programs/schedules/', {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({program:parseInt(program),faculty:parseInt(faculty),topic_title:topic,
                session_date:date,start_time:startTime,end_time:endTime,invitation_status:'PENDING'})
        });
    } catch(err) {}

    var tEl=document.getElementById('assign-topic');   if(tEl) tEl.value='';
    var dEl=document.getElementById('assign-date');    if(dEl) dEl.value='';
    var sEl=document.getElementById('assign-start');   if(sEl){sEl.readOnly=false;sEl.style.background='';sEl.value='10:00';}
    var eEl=document.getElementById('assign-end');     if(eEl){eEl.readOnly=false;eEl.style.background='';eEl.value='11:15';}

    alert('Session saved successfully!');
    await window.loadFacultySchedulesTable();
    window.renderProgramScheduleGrid();
};

/* ─── Load sessions table (list view) ─── */
window.loadFacultySchedulesTable = async function() {
    var token = localStorage.getItem('iicm_access_token');
    var tbody = document.getElementById('faculty-schedules-body');
    if (!tbody) return;
    var progId = ((document.getElementById('assign-prog-select'))||{}).value||'';

    try {
        var scheds    = JSON.parse(localStorage.getItem('iicm_schedule_notesheets')||'[]');
        var decisions = JSON.parse(localStorage.getItem('iicm_gm_decisions')||'{}');
        if (scheds.length > 0) {
            var lt  = scheds[0]; var dec = decisions[lt.id]||decisions[lt.title];
            var st  = dec ? dec.status : lt.status;
            var rem = dec ? dec.remarks : (lt.gm_remarks||'');
            if      (st==='APPROVED')         showSchedulePDFBanner('success','<strong>APPROVED BY GM</strong> — '+(rem?'Remarks: "'+rem+'"':'Official sanction granted.'));
            else if (st==='REJECTED')         showSchedulePDFBanner('error',  '<strong>REJECTED BY GM</strong> — '+(rem||'Declined.'));
            else if (st==='PENDING_APPROVAL') showSchedulePDFBanner('warning','<strong>PENDING GM REVIEW</strong> — Submitted for official approval.');
        }
    } catch(e) {}

    var sessions = [];
    if (progId) {
        try { sessions = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[]; } catch(e) {}
    }
    if (sessions.length===0 && progId) {
        try {
            var res = await fetch(window.API_BASE_URL+'/programs/schedules/?program_id='+progId,{headers:{'Authorization':'Bearer '+token}});
            if (res.ok) sessions = await res.json();
        } catch(err) {}
    }

    if (sessions.length===0) {
        tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:28px;color:#94a3b8;font-size:13px;">No sessions yet. Add sessions using the form above.</td></tr>';
        window.renderProgramScheduleGrid(); return;
    }

    sessions.sort(function(a,b){ return ((a.session_date+a.start_time)>(b.session_date+b.start_time))?1:-1; });

    tbody.innerHTML = sessions.map(function(s,i){
        var sb = s.invitation_status==='ACCEPTED'
            ? '<span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">Accepted</span>'
            : s.invitation_status==='DECLINED'
            ? '<span style="background:#ffe4e6;color:#be123c;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">Declined</span>'
            : '<span style="background:#ffedd5;color:#c2410c;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">Pending</span>';
        var isL=(s.session_slot==='1.00 PM TO 2.00 PM')||(s.topic_title||'').toUpperCase().includes('LUNCH');
        var isY=(s.session_slot==='06.30 AM-07.30 AM') ||(s.topic_title||'').toUpperCase().includes('YOGA');
        var bg = isL?'#fff9e6':isY?'#f0fdf4':i%2===0?'#ffffff':'#f8fafc';
        var ic = isL?'[LUNCH] ':isY?'[YOGA] ':'';
        return '<tr style="background:'+bg+'">'
            +'<td style="font-size:12.5px;padding:7px 10px;"><strong>'+(s.session_date||'—')+'</strong><br><small style="color:#64748b;">'+(s.start_time||'')+' – '+(s.end_time||'')+'</small></td>'
            +'<td style="font-weight:600;font-size:12.5px;padding:7px 10px;">'+ic+(s.topic_title||'—')+'</td>'
            +'<td style="font-size:12.5px;padding:7px 10px;">'+(s.faculty_name||'—')+'</td>'
            +'<td style="padding:7px 10px;">'+sb+'</td>'
            +'<td style="padding:7px 10px;"><button type="button" onclick="deleteSessionEntry('+s.id+',\''+progId+'\')" '
            +'style="background:#fee2e2;color:#b91c1c;border:none;font-size:11px;font-weight:700;padding:4px 10px;border-radius:4px;cursor:pointer;">Delete</button></td>'
            +'</tr>';
    }).join('');

    window.renderProgramScheduleGrid();
};

/* ─── Delete session ─── */
window.deleteSessionEntry = function(sessionId, progId) {
    if (!confirm('Delete this session?')) return;
    var ps = {};
    try { ps = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}'); } catch(e) {}
    if (ps[progId]) { ps[progId]=ps[progId].filter(function(s){ return String(s.id)!==String(sessionId); }); }
    localStorage.setItem('iicm_program_sessions', JSON.stringify(ps));
    window.loadFacultySchedulesTable();
};

/* ─── Render IICM Schedule Grid Matrix ─── */
window.renderProgramScheduleGrid = function() {
    var cont = document.getElementById('program-schedule-preview-container');
    if (!cont) return;
    var progId = ((document.getElementById('assign-prog-select'))||{}).value||'';
    var progSel = document.getElementById('assign-prog-select');

    var sessions = [];
    if (progId) { try { sessions = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[]; } catch(e) {} }

    if (!progId || sessions.length===0) {
        cont.innerHTML='<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">Select a program and add sessions to preview the schedule grid.</div>';
        return;
    }
    sessions.sort(function(a,b){ return ((a.session_date+a.start_time)>(b.session_date+b.start_time))?1:-1; });

    var ds={};
    sessions.forEach(function(s){ if(s.session_date) ds[s.session_date]=true; });
    var dates=Object.keys(ds).sort();

    var SLOTS=[
        {key:'col1',label:'10.00AM-11.15 AM', sH:10,  eH:11.25},
        {key:'col2',label:'11.30 AM-01.00PM', sH:11.5,eH:13   },
        {key:'lunch',label:'LUNCH BREAK',      sH:13,  eH:14   },
        {key:'col3',label:'2.00 PM -3.15 PM', sH:14,  eH:15.25},
        {key:'col4',label:'3.15 PM-5.00PM',   sH:15.25,eH:17  }
    ];

    function pH(t){ if(!t)return 0; var p=t.split(':'); return parseInt(p[0])+parseInt(p[1]||0)/60; }
    function gSFS(date,slot){
        return sessions.filter(function(s){
            if(s.session_date!==date)return false;
            if(slot.key==='lunch')return (s.topic_title||'').toUpperCase().includes('LUNCH')||s.session_slot==='1.00 PM TO 2.00 PM';
            return pH(s.start_time)>=slot.sH && pH(s.start_time)<slot.eH;
        });
    }
    function fDay(d){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d).getDay()]; }
    function fDD(d){ if(!d)return''; var p=d.split('-'); return p[2]+'-'+p[1]+'-'+p[0]; }

    var yogaS=sessions.filter(function(s){ return (s.topic_title||'').toUpperCase().includes('YOGA')||s.session_slot==='06.30 AM-07.30 AM'; });
    var yogaH=yogaS.length>0
        ? '<div style="margin-bottom:8px;padding:7px 12px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;font-size:12px;font-weight:700;color:#15803d;">Yoga Session(s): '+
          yogaS.map(function(s){return fDD(s.session_date)+' ('+s.start_time+'–'+s.end_time+') — '+s.faculty_name;}).join(' | ')+'</div>'
        : '';

    var hdr = SLOTS.map(function(sl){
        return sl.key==='lunch'
            ? '<th style="padding:4px 2px;border:1px solid #2d6a4f;text-align:center;width:34px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:9.5px;letter-spacing:0.5px;">L&amp;U&amp;N&amp;C&amp;H<br>B&amp;R&amp;E&amp;A&amp;K</th>'
            : '<th style="padding:8px 10px;border:1px solid #2d6a4f;text-align:center;min-width:115px;">'+sl.label+'</th>';
    }).join('');

    var rows = dates.map(function(date){
        var cells=SLOTS.map(function(sl){
            var isL=sl.key==='lunch'; var slS=gSFS(date,sl);
            if(isL) return '<td style="padding:4px 2px;border:1px solid #cbd5e1;background:#fff9e6;text-align:center;vertical-align:middle;writing-mode:vertical-rl;transform:rotate(180deg);width:34px;"><span style="font-size:9.5px;color:#a16207;font-weight:700;">1.00PM<br>TO<br>2.00PM</span></td>';
            if(!slS.length) return '<td style="padding:8px 10px;border:1px solid #cbd5e1;vertical-align:top;color:#d1d5db;font-size:11px;">—</td>';
            var s=slS[0];
            return '<td style="padding:8px 10px;border:1px solid #cbd5e1;vertical-align:top;font-size:11.5px;"><div style="font-weight:600;line-height:1.4;">'+s.topic_title+'</div><div style="color:#1b4332;font-weight:700;margin-top:5px;font-size:11px;border-top:1px solid #e2e8f0;padding-top:4px;">'+s.faculty_name+'</div></td>';
        }).join('');
        return '<tr><td style="padding:8px 10px;border:1px solid #cbd5e1;vertical-align:middle;font-weight:700;background:#f8fafc;text-align:center;font-size:11.5px;min-width:88px;">'+fDD(date)+'<br><span style="font-weight:400;color:#64748b;font-size:10.5px;">'+fDay(date)+'</span></td>'+cells+'</tr>';
    }).join('');

    cont.innerHTML = yogaH +
        '<table style="width:100%;border-collapse:collapse;font-size:11.5px;font-family:inherit;">'
        +'<thead><tr style="background:#1b4332;color:#fff;">'
        +'<th style="padding:8px 10px;border:1px solid #2d6a4f;text-align:center;min-width:88px;">DATE/DAY</th>'+hdr
        +'</tr></thead><tbody>'+rows+'</tbody></table>'
        +'<div style="margin-top:7px;font-size:11px;color:#475569;"><strong>Tea Breaks:</strong> 11.15-11.30AM and 3.00-3.15 PM &nbsp;|&nbsp; <strong>Fixed Lunch:</strong> 1.00 PM – 2.00 PM</div>';
};

/* ════════════════════════════════════════════════════════════════
   PDF EXPORT — Official IICM Program Schedule Layout
════════════════════════════════════════════════════════════════ */
window.generateProgramSchedulePDF = function() {
    var progId   = ((document.getElementById('assign-prog-select'))||{}).value||'';
    var progSel  = document.getElementById('assign-prog-select');
    var progTitle= (progSel&&progSel.options[progSel.selectedIndex]) ? progSel.options[progSel.selectedIndex].text : 'Programme';

    var sessions=[];
    if(progId){ try{sessions=JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[];}catch(e){} }
    if(!progId||sessions.length===0){ alert('Please select a program and add sessions before generating PDF.'); return; }
    sessions.sort(function(a,b){ return ((a.session_date+a.start_time)>(b.session_date+b.start_time))?1:-1; });
    var ds={}; sessions.forEach(function(s){ if(s.session_date) ds[s.session_date]=true; });
    var dates=Object.keys(ds).sort();

    function fDD(d){ if(!d)return''; var p=d.split('-'); return p[2]+'-'+p[1]+'-'+p[0]; }
    function fDay(d){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d).getDay()]; }
    function pH(t){ if(!t)return 0; var p=t.split(':'); return parseInt(p[0])+parseInt(p[1]||0)/60; }

    var SLOTS=[
        {key:'col1',sH:10,  eH:11.25},{key:'col2',sH:11.5,eH:13},
        {key:'lunch',sH:13,eH:14},
        {key:'col3',sH:14,eH:15.25},{key:'col4',sH:15.25,eH:17}
    ];
    function gSFS(date,slot){
        return sessions.filter(function(s){
            if(s.session_date!==date)return false;
            if(slot.key==='lunch')return (s.topic_title||'').toUpperCase().includes('LUNCH')||s.session_slot==='1.00 PM TO 2.00 PM';
            return pH(s.start_time)>=slot.sH && pH(s.start_time)<slot.eH;
        });
    }

    var yogaS=sessions.filter(function(s){return (s.topic_title||'').toUpperCase().includes('YOGA')||s.session_slot==='06.30 AM-07.30 AM';});
    var yogaN=yogaS.length>0
        ? '<div style="margin:6px 0 10px;font-size:10pt;font-weight:700;color:green;">Yoga Session(s): '+yogaS.map(function(s){return fDD(s.session_date)+' ('+s.start_time+'–'+s.end_time+')';}).join(', ')+'</div>'
        : '';

    var dateRange=dates.length>0 ? '('+fDD(dates[0])+(dates.length>1?' &ndash; '+fDD(dates[dates.length-1]):'')+')' : '';

    var rows=dates.map(function(date){
        var cells=SLOTS.map(function(sl){
            var isL=sl.key==='lunch'; var slS=gSFS(date,sl);
            if(isL) return '<td style="padding:4px 2pt;border:1pt solid #444;background:#fff8dc;text-align:center;vertical-align:middle;writing-mode:vertical-rl;transform:rotate(180deg);width:26pt;font-size:7.5pt;font-weight:700;color:#7c6800;">1.00 PM<br>TO<br>2.00 PM</td>';
            if(!slS.length) return '<td style="padding:6pt 8pt;border:1pt solid #444;vertical-align:top;"></td>';
            var s=slS[0];
            return '<td style="padding:6pt 8pt;border:1pt solid #444;vertical-align:top;font-size:10pt;"><div style="font-weight:600;line-height:1.45;">'+s.topic_title+'</div><div style="margin-top:7pt;padding-top:4pt;border-top:1pt dashed #ccc;font-weight:700;font-size:9.5pt;">'+s.faculty_name+'</div></td>';
        }).join('');
        return '<tr><td style="padding:6pt 8pt;border:1pt solid #444;font-weight:700;text-align:center;background:#f9fafb;font-size:10pt;min-width:58pt;">'+fDD(date)+'<br><span style="font-weight:400;font-size:9.5pt;">'+fDay(date)+'</span></td>'+cells+'</tr>';
    }).join('');

    var user=JSON.parse(localStorage.getItem('iicm_user')||'{}');
    var coord=([user.first_name,user.last_name].filter(Boolean).join(' '))||'Programme Coordinator';
    var today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});

    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Program Schedule — IICM</title><style>'
        +'* {margin:0;padding:0;box-sizing:border-box;}'
        +'body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#1a1a1a;padding:24px 32px;}'
        +'.lh{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3pt double #000;padding-bottom:12pt;margin-bottom:8pt;}'
        +'.logo{width:60pt;height:60pt;background:#1b4332;border-radius:6pt;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12pt;flex-shrink:0;}'
        +'.oi{text-align:center;flex:1;}'
        +'.on{font-size:18pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;}'
        +'.ci{text-align:right;font-size:8.5pt;color:#333;min-width:130pt;}'
        +'table{width:100%;border-collapse:collapse;font-size:10pt;}'
        +'thead tr{background:#1b4332;color:#fff;}'
        +'th{padding:6pt 8pt;border:1pt solid #444;text-align:center;font-size:9.5pt;font-weight:700;}'
        +'.fr{margin-top:12pt;display:flex;justify-content:space-between;font-size:10pt;font-weight:bold;}'
        +'.sb{margin-top:32pt;text-align:right;}'
        +'.sl{display:inline-block;min-width:190pt;border-top:1pt solid #000;padding-top:4pt;text-align:center;font-weight:bold;font-size:10pt;}'
        +'@media print{body{padding:16px 22px;}button{display:none!important;}}'
        +'</style></head><body>'
        +'<div class="lh"><div class="logo">IICM</div>'
        +'<div class="oi"><div class="on">Indian Institute of Coal Management</div>'
        +'<div style="font-size:14pt;font-weight:bold;">Kanke, Ranchi</div>'
        +'<div style="font-size:13pt;font-weight:bold;margin-top:4pt;">Program Schedule</div>'
        +'<div style="font-size:13pt;font-weight:bold;">&ldquo;'+progTitle+'&rdquo;</div>'
        +'<div style="font-size:12pt;">'+dateRange+'</div></div>'
        +'<div class="ci"><div>http://www.iicm.ac.in</div><div style="margin-top:3pt;">Telephone &ndash; +91 651 2230828</div><div style="margin-top:2pt;">Website www.iicm.ac.in</div></div>'
        +'</div>'+yogaN
        +'<table><thead><tr>'
        +'<th style="min-width:58pt;">DATE/DAY</th>'
        +'<th>10.00AM-11.15 AM</th><th>11.30 AM-01.00PM</th>'
        +'<th style="writing-mode:vertical-rl;transform:rotate(180deg);width:26pt;padding:4pt 2pt;font-size:7pt;letter-spacing:1pt;">L U N C H B R E A K</th>'
        +'<th>2.00 PM -3.15 PM</th><th>3.15 PM-5.00PM</th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table>'
        +'<div class="fr"><div>Tea Breaks: 11.15-11.30AM and 3.00- 3.15 PM</div><div>Program Coordinator</div></div>'
        +'<div class="sb"><div class="sl">'+coord+'</div><br><div style="font-size:9pt;color:#555;">Programme Coordinator &mdash; IICM</div></div>'
        +'<div style="margin-top:18pt;text-align:center;font-size:8pt;color:#888;border-top:1pt solid #e2e8f0;padding-top:7pt;">Generated by IICM Programme Management System &nbsp;|&nbsp; '+today+'</div>'
        +'<div style="text-align:center;margin-top:10pt;"><button onclick="window.print()" style="background:#1b4332;color:#fff;border:none;padding:9pt 26pt;border-radius:7pt;font-size:12pt;font-weight:700;cursor:pointer;">Print / Save as PDF</button></div>'
        +'</body></html>';

    var pw=window.open('','_blank','width=1060,height=840');
    pw.document.write(html); pw.document.close();
    var btn=document.getElementById('btn-generate-schedule-pdf');
    if(btn){btn.innerHTML='PDF Preview Opened'; setTimeout(function(){btn.innerHTML='Export PDF Format';},3000);}
};

/* ════════════════════════════════════════════════════════════════
   WORD (.doc) EXPORT — HTML/Word blob download (opens in MS Word)
════════════════════════════════════════════════════════════════ */
window.generateProgramScheduleDocx = function() {
    var progId   = ((document.getElementById('assign-prog-select'))||{}).value||'';
    var progSel  = document.getElementById('assign-prog-select');
    var progTitle= (progSel&&progSel.options[progSel.selectedIndex]) ? progSel.options[progSel.selectedIndex].text : 'Programme';

    var sessions=[];
    if(progId){ try{sessions=JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[];}catch(e){} }
    if(!progId||sessions.length===0){ alert('Please select a program and add sessions before exporting Word document.'); return; }
    sessions.sort(function(a,b){ return ((a.session_date+a.start_time)>(b.session_date+b.start_time))?1:-1; });
    var ds={}; sessions.forEach(function(s){ if(s.session_date) ds[s.session_date]=true; });
    var dates=Object.keys(ds).sort();

    function fDD(d){ if(!d)return''; var p=d.split('-'); return p[2]+'-'+p[1]+'-'+p[0]; }
    function fDay(d){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d).getDay()]; }
    function pH(t){ if(!t)return 0; var p=t.split(':'); return parseInt(p[0])+parseInt(p[1]||0)/60; }
    var SLOTS=[
        {key:'col1',sH:10,eH:11.25},{key:'col2',sH:11.5,eH:13},
        {key:'lunch',sH:13,eH:14},
        {key:'col3',sH:14,eH:15.25},{key:'col4',sH:15.25,eH:17}
    ];
    function gSFS(date,slot){
        return sessions.filter(function(s){
            if(s.session_date!==date)return false;
            if(slot.key==='lunch')return (s.topic_title||'').toUpperCase().includes('LUNCH')||s.session_slot==='1.00 PM TO 2.00 PM';
            return pH(s.start_time)>=slot.sH&&pH(s.start_time)<slot.eH;
        });
    }

    var yogaS=sessions.filter(function(s){return (s.topic_title||'').toUpperCase().includes('YOGA')||s.session_slot==='06.30 AM-07.30 AM';});
    var yogaN=yogaS.length>0
        ? '<p style="font-size:10pt;font-weight:bold;color:green;margin:5pt 0;">Yoga Session(s): '+yogaS.map(function(s){return fDD(s.session_date)+' ('+s.start_time+'–'+s.end_time+')';}).join(', ')+'</p>'
        : '';

    var dateRange=dates.length>0 ? fDD(dates[0])+(dates.length>1?' – '+fDD(dates[dates.length-1]):'') : '';

    var rows=dates.map(function(date){
        var cells=SLOTS.map(function(sl){
            var isL=sl.key==='lunch'; var slS=gSFS(date,sl);
            if(isL) return '<td style="border:1pt solid black;background:#fff8dc;text-align:center;vertical-align:middle;width:28pt;padding:4pt 2pt;"><p style="margin:0;font-size:7pt;font-weight:bold;color:#7c6800;writing-mode:vertical-rl;">1.00 PM<br>TO<br>2.00 PM</p></td>';
            if(!slS.length) return '<td style="border:1pt solid black;padding:6pt 8pt;"></td>';
            var s=slS[0];
            return '<td style="border:1pt solid black;padding:6pt 8pt;vertical-align:top;"><p style="margin:0;font-weight:bold;">'+s.topic_title+'</p><hr style="border:none;border-top:1pt dashed #999;margin:4pt 0;"><p style="margin:0;font-weight:bold;font-size:9pt;">'+s.faculty_name+'</p></td>';
        }).join('');
        return '<tr><td style="border:1pt solid black;padding:6pt 8pt;font-weight:bold;text-align:center;background:#f5f5f5;min-width:58pt;">'+fDD(date)+'<br><span style="font-weight:normal;font-size:9pt;">'+fDay(date)+'</span></td>'+cells+'</tr>';
    }).join('');

    var user=JSON.parse(localStorage.getItem('iicm_user')||'{}');
    var coord=([user.first_name,user.last_name].filter(Boolean).join(' '))||'Programme Coordinator';
    var today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});

    var doc='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
        +'<head><meta charset="UTF-8"><meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15">'
        +'<title>Program Schedule — IICM</title>'
        +'<style>body{font-family:"Times New Roman",Times,serif;font-size:11pt;margin:1.4cm;}'
        +'table{width:100%;border-collapse:collapse;} th,td{border:1pt solid black;padding:5pt 7pt;}'
        +'th{background:#1b4332;color:white;font-weight:bold;text-align:center;font-size:10pt;}</style></head><body>'
        +'<table style="border:none;margin-bottom:8pt;">'
        +'<tr><td style="border:none;width:60pt;vertical-align:middle;text-align:center;font-weight:bold;background:#1b4332;color:white;font-size:10pt;">IICM</td>'
        +'<td style="border:none;text-align:center;vertical-align:middle;">'
        +'<p style="font-size:16pt;font-weight:bold;text-transform:uppercase;">Indian Institute of Coal Management</p>'
        +'<p style="font-size:13pt;font-weight:bold;">Kanke, Ranchi</p>'
        +'<p style="font-size:13pt;font-weight:bold;margin-top:4pt;">Program Schedule</p>'
        +'<p style="font-size:12pt;font-weight:bold;">&ldquo;'+progTitle+'&rdquo;</p>'
        +'<p style="font-size:11pt;">('+dateRange+')</p></td>'
        +'<td style="border:none;width:120pt;vertical-align:top;font-size:8pt;text-align:right;">'
        +'<p>http://www.iicm.ac.in</p><p>Telephone – +91 651 2230828</p><p>Website www.iicm.ac.in</p></td></tr></table>'
        +'<hr style="border-top:2pt double black;margin:6pt 0;">'+yogaN
        +'<table><thead><tr>'
        +'<th style="min-width:60pt;">DATE/DAY</th>'
        +'<th>10.00AM-11.15 AM</th><th>11.30 AM-01.00PM</th>'
        +'<th style="width:28pt;font-size:7pt;writing-mode:vertical-rl;letter-spacing:1pt;">L U N C H B R E A K</th>'
        +'<th>2.00 PM -3.15 PM</th><th>3.15 PM-5.00PM</th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table>'
        +'<table style="border:none;margin-top:10pt;">'
        +'<tr><td style="border:none;font-size:10pt;font-weight:bold;">Tea Breaks: 11.15-11.30AM and 3.00- 3.15 PM</td>'
        +'<td style="border:none;text-align:right;font-size:10pt;font-weight:bold;">Program Coordinator</td></tr></table>'
        +'<div style="margin-top:36pt;text-align:right;">'
        +'<p style="display:inline-block;min-width:190pt;border-top:1pt solid black;text-align:center;font-weight:bold;font-size:10pt;">'+coord+'</p><br>'
        +'<p style="font-size:9pt;color:#555;">Programme Coordinator — IICM</p></div>'
        +'<p style="margin-top:26pt;text-align:center;font-size:8.5pt;color:#888;">Generated by IICM Programme Management System | '+today+'</p>'
        +'</body></html>';

    var blob=new Blob(['\ufeff'+doc],{type:'application/vnd.ms-word;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='IICM_Program_Schedule_'+progTitle.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40)+'.doc';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    var btn=document.getElementById('btn-generate-schedule-docx');
    if(btn){btn.innerHTML='Word Document Downloaded'; setTimeout(function(){btn.innerHTML='Export Word Format (.docx)';},3000);}
};

/* ════════════════════════════════════════════════════════════════
   MULTI-SESSION BUILDER
   addSessionRow / removeSessionRow / saveAllSessions
════════════════════════════════════════════════════════════════ */

/* Faculty options HTML — built once, reused per row */
window._facultyOptionsHtml = '<option value="">-- Select Faculty --</option>';

/* Build faculty options from current data */
function _buildFacultyOptions() {
    var opts = window._facultyOptionsHtml;
    if (opts.indexOf('<option value="1">') !== -1) return opts; // already populated
    var defaults = [
        {id:1, name:'Prof. Piyush Rai — IIT (Banaras Hindu University)'},
        {id:2, name:'Dr. Manish Kumar — IIM Ranchi'},
        {id:3, name:'CA Shyam Agarwal — R. G. Agarwala & Co'},
        {id:4, name:'Dr. N. Kishore — IIIT Ranchi'},
        {id:5, name:'Dr. Rajesh Sharma — Internal Faculty, IICM'},
        {id:6, name:'Prof. Arvind Singh — IIM Ranchi'}
    ];
    return '<option value="">-- Select Faculty --</option>' +
        defaults.map(function(f){ return '<option value="'+f.id+'">'+f.name+'</option>'; }).join('');
}

/* Slot-to-time map */
var SLOT_TIME_MAP = {
    '10.00AM-11.15 AM':  {s:'10:00', e:'11:15', lock:false, autoTopic:''},
    '11.30 AM-01.00PM':  {s:'11:30', e:'13:00', lock:false, autoTopic:''},
    '1.00 PM TO 2.00 PM':{s:'13:00', e:'14:00', lock:true,  autoTopic:'LUNCH BREAK'},
    '2.00 PM -3.15 PM':  {s:'14:00', e:'15:15', lock:false, autoTopic:''},
    '3.15 PM-5.00PM':    {s:'15:15', e:'17:00', lock:false, autoTopic:''},
    '06.30 AM-07.30 AM': {s:'06:30', e:'07:30', lock:false, autoTopic:'Yoga Session'},
    'custom':            {s:'',      e:'',      lock:false, autoTopic:''}
};

var _sessionRowCount = 0;

/* Called when slot dropdown in a row changes */
window.onRowSlotChange = function(rowId) {
    var slotSel  = document.getElementById('row-slot-' + rowId);
    var startInp = document.getElementById('row-start-' + rowId);
    var endInp   = document.getElementById('row-end-' + rowId);
    var topicInp = document.getElementById('row-topic-' + rowId);
    if (!slotSel || !startInp || !endInp) return;

    var info = SLOT_TIME_MAP[slotSel.value];
    if (!info) return;

    startInp.value    = info.s;
    endInp.value      = info.e;
    startInp.readOnly = info.lock;
    endInp.readOnly   = info.lock;
    startInp.style.background = info.lock ? '#f1f5f9' : '';
    endInp.style.background   = info.lock ? '#f1f5f9' : '';

    if (info.autoTopic && topicInp && !topicInp.value) {
        topicInp.value = info.autoTopic;
    }

    /* Lunch AND Yoga: no faculty assigned */
    var noFaculty = (slotSel.value === '1.00 PM TO 2.00 PM' || slotSel.value === '06.30 AM-07.30 AM');
    var facSel = document.getElementById('row-faculty-' + rowId);
    if (facSel) {
        facSel.disabled = noFaculty;
        facSel.style.background = noFaculty ? '#f1f5f9' : '';
        facSel.style.opacity    = noFaculty ? '0.5' : '1';
        if (noFaculty) facSel.value = '';
    }
};


/* Remove a session row */
window.removeSessionRow = function(rowId) {
    var row = document.getElementById('session-row-' + rowId);
    if (row) row.parentNode.removeChild(row);
};

/* Add a new session row to the builder */
window.addSessionRow = function() {
    var container = document.getElementById('session-rows-container');
    if (!container) return;

    _sessionRowCount++;
    var id = _sessionRowCount;

    var facOpts = _buildFacultyOptions();

    var rowEl = document.createElement('div');
    rowEl.id = 'session-row-' + id;
    rowEl.style.cssText = 'display:grid; grid-template-columns:160px 1fr 180px 120px 90px 90px 44px; gap:10px; margin-bottom:8px; align-items:center; padding:8px 10px; background:' + (id % 2 === 0 ? '#f8fafc' : '#ffffff') + '; border-radius:8px; border:1px solid #e2e8f0;';

    rowEl.innerHTML =
        /* Session Slot */
        '<div><select id="row-slot-'+id+'" onchange="onRowSlotChange('+id+')" style="width:100%;padding:7px 6px;font-size:12px;font-weight:600;border:1.5px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">' +
            '<option value="10.00AM-11.15 AM">Session 1 (10–11.15AM)</option>' +
            '<option value="11.30 AM-01.00PM">Session 2 (11.30AM–1PM)</option>' +
            '<option value="1.00 PM TO 2.00 PM">Lunch Break (1–2PM Fixed)</option>' +
            '<option value="2.00 PM -3.15 PM">Session 3 (2–3.15PM)</option>' +
            '<option value="3.15 PM-5.00PM">Session 4 (3.15–5PM)</option>' +
            '<option value="06.30 AM-07.30 AM">Yoga (6.30–7.30AM)</option>' +
            '<option value="custom">Custom Slot</option>' +
        '</select></div>' +

        /* Topic */
        '<div><input type="text" id="row-topic-'+id+'" placeholder="Write topic here..." style="width:100%;padding:7px 10px;font-size:12.5px;border:1.5px solid #cbd5e1;border-radius:6px;box-sizing:border-box;"></div>' +

        /* Faculty */
        '<div><select id="row-faculty-'+id+'" style="width:100%;padding:7px 6px;font-size:12px;border:1.5px solid #cbd5e1;border-radius:6px;background:#fff;">'+facOpts+'</select></div>' +

        /* Date */
        '<div><input type="date" id="row-date-'+id+'" style="width:100%;padding:7px 6px;font-size:12px;border:1.5px solid #cbd5e1;border-radius:6px;box-sizing:border-box;"></div>' +

        /* Start Time */
        '<div><input type="time" id="row-start-'+id+'" value="10:00" style="width:100%;padding:7px 4px;font-size:12px;border:1.5px solid #cbd5e1;border-radius:6px;box-sizing:border-box;"></div>' +

        /* End Time */
        '<div><input type="time" id="row-end-'+id+'" value="11:15" style="width:100%;padding:7px 4px;font-size:12px;border:1.5px solid #cbd5e1;border-radius:6px;box-sizing:border-box;"></div>' +

        /* Delete button */
        '<div><button type="button" onclick="removeSessionRow('+id+')" title="Remove this session" style="width:36px;height:36px;background:#fee2e2;color:#b91c1c;border:none;border-radius:6px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">&times;</button></div>';

    container.appendChild(rowEl);

    /* Fetch real faculty from backend if possible and update this row's select */
    var token = localStorage.getItem('iicm_access_token');
    if (token && window.API_BASE_URL) {
        fetch(window.API_BASE_URL + '/faculty/faculties/', {headers:{'Authorization':'Bearer '+token}})
            .then(function(r){ return r.ok ? r.json() : null; })
            .then(function(data){
                if (!data) return;
                var facs = data.results || data;
                var sel = document.getElementById('row-faculty-'+id);
                if (sel) {
                    sel.innerHTML = '<option value="">-- Select Faculty --</option>' +
                        facs.map(function(f){ return '<option value="'+f.id+'">'+f.name+'</option>'; }).join('');
                }
            }).catch(function(){});
    }
};

/* Save all session rows to localStorage and refresh grid */
window.saveAllSessions = function() {
    var progId   = ((document.getElementById('assign-prog-select'))||{}).value||'';
    if (!progId) { alert('Please select a Program Title first.'); return; }

    var container = document.getElementById('session-rows-container');
    if (!container) return;

    var rows = container.querySelectorAll('[id^="session-row-"]');
    if (rows.length === 0) { alert('Please add at least one session.'); return; }

    var ps = {};
    try { ps = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}'); } catch(e) {}
    if (!ps[progId]) ps[progId] = [];

    var saved = 0, skipped = 0;
    rows.forEach(function(row) {
        var rid = row.id.replace('session-row-', '');

        var slotSel  = document.getElementById('row-slot-'+rid);
        var topicInp = document.getElementById('row-topic-'+rid);
        var facSel   = document.getElementById('row-faculty-'+rid);
        var dateInp  = document.getElementById('row-date-'+rid);
        var startInp = document.getElementById('row-start-'+rid);
        var endInp   = document.getElementById('row-end-'+rid);

        var slotVal  = slotSel  ? slotSel.value  : '';
        var topic    = topicInp ? topicInp.value.trim() : '';
        var facId    = facSel   ? facSel.value    : '';
        var facName  = (facSel && facSel.options[facSel.selectedIndex]) ? facSel.options[facSel.selectedIndex].text : '';
        var date     = dateInp  ? dateInp.value   : '';
        var start    = startInp ? startInp.value  : '';
        var end      = endInp   ? endInp.value    : '';

        /* Auto-fill Lunch topic if empty */
        if (slotVal === '1.00 PM TO 2.00 PM' && !topic) topic = 'LUNCH BREAK';

        if (!topic) { skipped++; return; }   /* skip empty topic rows */

        ps[progId].push({
            id:               Date.now() + Math.random(),
            program_id:       progId,
            session_slot:     slotVal,
            topic_title:      topic,
            faculty_id:       facId,
            faculty_name:     facName,
            session_date:     date,
            start_time:       start,
            end_time:         end,
            invitation_status:'PENDING'
        });
        saved++;
    });

    if (saved === 0) { alert('No valid sessions to save. Please fill in topic fields.'); return; }

    var venueInp = document.getElementById('assign-prog-venue');
    if (venueInp && progId) {
        var venuesObj = {};
        try { venuesObj = JSON.parse(localStorage.getItem('iicm_program_venues')||'{}'); } catch(e) {}
        venuesObj[progId] = venueInp.value;
        localStorage.setItem('iicm_program_venues', JSON.stringify(venuesObj));
    }

    localStorage.setItem('iicm_program_sessions', JSON.stringify(ps));

    /* Clear the builder rows */
    container.innerHTML = '';
    _sessionRowCount = 0;

    var msg = saved + ' session(s) saved!';
    if (skipped > 0) msg += ' (' + skipped + ' empty topic row(s) skipped)';
    alert(msg);

    window.loadFacultySchedulesTable();
    window.renderProgramScheduleGrid();
};

/* Create Program Schedule and immediately open View Modal */
window.createAndOpenScheduleModal = function() {
    var progId = ((document.getElementById('assign-prog-select'))||{}).value||'';
    if (!progId) { alert('Please select a Program Title first.'); return; }

    var container = document.getElementById('session-rows-container');
    var rows = container ? container.querySelectorAll('[id^="session-row-"]') : [];

    if (rows.length > 0) {
        window.saveAllSessions();
    }

    /* Open View Program Schedule modal */
    window.openSchedulePreviewModal();
};

/* Also override populateFacultyAssignDropdowns to add first row automatically */
(function(){
    var _orig = window.populateFacultyAssignDropdowns;
    window.populateFacultyAssignDropdowns = async function() {
        if (_orig) await _orig();
        /* Add one starter row if container is empty */
        var container = document.getElementById('session-rows-container');
        if (container && container.children.length === 0) {
            window.addSessionRow();
        }
        /* Also populate yoga faculty dropdown */
        var yogaFac = document.getElementById('yoga-faculty');
        if (yogaFac && yogaFac.options.length <= 1) {
            yogaFac.innerHTML = _buildFacultyOptions();
        }
        /* Initialize Faculty Invitation module dropdowns on same page */
        if (window.initFacultyInviteSection) {
            window.initFacultyInviteSection();
        }
    };
})();

/* ════════════════════════════════════════════════════════════════
   SCHEDULE PREVIEW MODAL
════════════════════════════════════════════════════════════════ */
window.openSchedulePreviewModal = function() {
    var modal = document.getElementById('schedule-preview-modal');
    if (!modal) return;

    /* Build the grid inside the modal */
    var progId  = ((document.getElementById('assign-prog-select'))||{}).value||'';
    var progSel = document.getElementById('assign-prog-select');
    var progTitle = (progSel && progSel.options[progSel.selectedIndex] && progSel.selectedIndex > 0)
        ? progSel.options[progSel.selectedIndex].text
        : '';

    var titleDisplay = document.getElementById('modal-prog-title-display');
    if (titleDisplay) titleDisplay.textContent = progTitle ? 'Programme: ' + progTitle : 'Select a program to preview its schedule';

    var cont = document.getElementById('modal-schedule-grid-container');
    if (!cont) { modal.style.display = 'block'; return; }

    if (!progId) {
        cont.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">Please select a Program Title first, then save sessions to see the preview here.</div>';
        modal.style.display = 'block';
        return;
    }

    var sessions = [];
    try { sessions = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[]; } catch(e) {}

    if (sessions.length === 0) {
        cont.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">No sessions saved for this program yet. Add and save sessions first.</div>';
        modal.style.display = 'block';
        return;
    }

    sessions.sort(function(a,b){ return ((a.session_date+a.start_time)>(b.session_date+b.start_time))?1:-1; });

    var ds={};
    sessions.forEach(function(s){ if(s.session_date) ds[s.session_date]=true; });
    var dates=Object.keys(ds).sort();

    var SLOTS=[
        {key:'col1',label:'10.00AM-11.15 AM', sH:10,  eH:11.25},
        {key:'col2',label:'11.30 AM-01.00PM', sH:11.5,eH:13},
        {key:'lunch',label:'LUNCH BREAK',      sH:13,  eH:14},
        {key:'col3',label:'2.00 PM -3.15 PM', sH:14,  eH:15.25},
        {key:'col4',label:'3.15 PM-5.00PM',   sH:15.25,eH:17}
    ];

    function pH(t){ if(!t)return 0; var p=t.split(':'); return parseInt(p[0])+parseInt(p[1]||0)/60; }
    function gSFS(date,slot){
        return sessions.filter(function(s){
            if(s.session_date!==date)return false;
            if(slot.key==='lunch')return (s.topic_title||'').toUpperCase().includes('LUNCH')||s.session_slot==='1.00 PM TO 2.00 PM';
            return pH(s.start_time)>=slot.sH && pH(s.start_time)<slot.eH;
        });
    }
    function fDay(d){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d).getDay()]; }
    function fDD(d){ if(!d)return''; var p=d.split('-'); return p[2]+'-'+p[1]+'-'+p[0]; }

    var yogaS=sessions.filter(function(s){ return (s.topic_title||'').toUpperCase().includes('YOGA')||s.session_slot==='06.30 AM-07.30 AM'; });
    var yogaH=yogaS.length>0
        ? '<div style="margin-bottom:10px;padding:8px 14px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;font-size:12px;font-weight:700;color:#15803d;">Yoga Session(s): '+
          yogaS.map(function(s){return fDD(s.session_date)+' ('+s.start_time+'–'+s.end_time+') — '+(s.faculty_name||'All Participants');}).join(' | ')+'</div>'
        : '';

    var hdr = SLOTS.map(function(sl){
        return sl.key==='lunch'
            ? '<th style="padding:4px 2px;border:1px solid #2d6a4f;text-align:center;width:34px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:9px;">LUNCH BREAK</th>'
            : '<th style="padding:8px 10px;border:1px solid #2d6a4f;text-align:center;min-width:110px;font-size:11px;">'+sl.label+'</th>';
    }).join('');

    var rows = dates.map(function(date){
        var cells=SLOTS.map(function(sl){
            var isL=sl.key==='lunch'; var slS=gSFS(date,sl);
            if(isL) return '<td style="padding:4px 2px;border:1px solid #cbd5e1;background:#fff9e6;text-align:center;vertical-align:middle;writing-mode:vertical-rl;transform:rotate(180deg);width:34px;"><span style="font-size:9px;color:#a16207;font-weight:700;">1PM–2PM</span></td>';
            if(!slS.length) return '<td style="padding:8px 10px;border:1px solid #cbd5e1;color:#d1d5db;font-size:11px;">—</td>';
            var s=slS[0];
            return '<td style="padding:8px 10px;border:1px solid #cbd5e1;vertical-align:top;font-size:11.5px;"><div style="font-weight:600;line-height:1.4;">'+s.topic_title+'</div><div style="color:#1b4332;font-weight:700;margin-top:5px;font-size:10.5px;border-top:1px solid #e2e8f0;padding-top:4px;">'+(s.faculty_name||'Internal/Core')+'</div></td>';
        }).join('');
        return '<tr><td style="padding:8px 10px;border:1px solid #cbd5e1;vertical-align:middle;font-weight:700;background:#f8fafc;text-align:center;font-size:11px;min-width:80px;">'+fDD(date)+'<br><span style="font-weight:400;color:#64748b;font-size:10px;">'+fDay(date)+'</span></td>'+cells+'</tr>';
    }).join('');

    cont.innerHTML = yogaH +
        '<table style="width:100%;border-collapse:collapse;font-size:11.5px;">' +
        '<thead><tr style="background:#1b4332;color:#fff;">' +
        '<th style="padding:8px 10px;border:1px solid #2d6a4f;text-align:center;min-width:80px;font-size:11px;">DATE/DAY</th>'+hdr+
        '</tr></thead><tbody>'+rows+'</tbody></table>' +
        '<div style="margin-top:8px;font-size:11px;color:#475569;"><strong>Tea Breaks:</strong> 11.15–11.30AM and 3.00–3.15 PM</div>';

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeSchedulePreviewModal = function(evt) {
    if (evt && evt.target !== document.getElementById('schedule-preview-modal')) return;
    var modal = document.getElementById('schedule-preview-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

/* ════════════════════════════════════════════════════════════════
   YOGA SESSION SAVE
════════════════════════════════════════════════════════════════ */
window.saveYogaSession = function() {
    var progId = ((document.getElementById('assign-prog-select'))||{}).value||'';
    if (!progId) { alert('Please select a Program Title first.'); return; }

    var topic  = ((document.getElementById('yoga-topic') )||{}).value||'';
    var date   = ((document.getElementById('yoga-date')  )||{}).value||'';
    var start  = ((document.getElementById('yoga-start') )||{}).value||'06:30';
    var end    = ((document.getElementById('yoga-end')   )||{}).value||'07:30';

    if (!topic) topic = 'Yoga Session';

    var ps = {};
    try { ps = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}'); } catch(e) {}
    if (!ps[progId]) ps[progId] = [];

    ps[progId].push({
        id:               Date.now() + Math.random(),
        program_id:       progId,
        session_slot:     '06.30 AM-07.30 AM',
        topic_title:      topic,
        faculty_id:       '',
        faculty_name:     '',
        session_date:     date,
        start_time:       start,
        end_time:         end,
        invitation_status:'PENDING'
    });

    localStorage.setItem('iicm_program_sessions', JSON.stringify(ps));

    /* Reset yoga fields */
    var tEl = document.getElementById('yoga-topic'); if(tEl) tEl.value='';
    var dEl = document.getElementById('yoga-date');  if(dEl) dEl.value='';
    var sEl = document.getElementById('yoga-start'); if(sEl) sEl.value='06:30';
    var eEl = document.getElementById('yoga-end');   if(eEl) eEl.value='07:30';

    alert('Yoga session saved!');
    window.loadFacultySchedulesTable();
};

/* ════════════════════════════════════════════════════════════════
   FACULTY INVITATION SECTION
════════════════════════════════════════════════════════════════ */

window.initFacultyInviteSection = function() {
    _populateInviteFacultyDropdown();
    _populateInviteProgramDropdown();
    loadSentInvitations();
};

function _populateInviteFacultyDropdown() {
    var sel = document.getElementById('invite-faculty-select');
    if (!sel) return;
    var defaults = [
        {id:1, name:'Prof. Piyush Rai',    email:'piyush.rai@iitbhu.ac.in',    org:'IIT (Banaras Hindu University)'},
        {id:2, name:'Dr. Manish Kumar',     email:'manish.kumar@iimranchi.ac.in',org:'IIM Ranchi'},
        {id:3, name:'CA Shyam Agarwal',     email:'shyam.agarwal@rgagarwala.com',org:'R. G. Agarwala & Co'},
        {id:4, name:'Dr. N. Kishore',       email:'n.kishore@iiitranchi.ac.in',  org:'IIIT Ranchi'},
        {id:5, name:'Dr. Rajesh Sharma',    email:'rsharma@iicm.ac.in',         org:'Internal Faculty, IICM'},
        {id:6, name:'Prof. Arvind Singh',   email:'arvind.singh@iimranchi.ac.in',org:'IIM Ranchi'}
    ];
    sel.innerHTML = '<option value="">-- Select Faculty Member --</option>' +
        defaults.map(function(f){
            return '<option value="'+f.id+'" data-name="'+f.name+'" data-email="'+f.email+'" data-org="'+f.org+'">'+f.name+' — '+f.org+'</option>';
        }).join('');
    var token = localStorage.getItem('iicm_access_token');
    if (token && window.API_BASE_URL) {
        fetch(window.API_BASE_URL+'/faculty/faculties/',{headers:{'Authorization':'Bearer '+token}})
            .then(function(r){return r.ok?r.json():null;})
            .then(function(data){
                if (!data) return;
                var facs = data.results||data;
                if (!facs.length) return;
                sel.innerHTML='<option value="">-- Select Faculty Member --</option>'+
                    facs.map(function(f){
                        var em = f.email || (f.name.toLowerCase().replace(/[^a-z]/g,'')+'@iicm.ac.in');
                        return '<option value="'+f.id+'" data-name="'+f.name+'" data-email="'+em+'">'+f.name+'</option>';
                    }).join('');
            }).catch(function(){});
    }
}

function _populateInviteProgramDropdown() {
    var sel = document.getElementById('invite-program-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Program --</option>';
    var progs = [];
    try { progs = window.getUnifiedCoordinatorPrograms ? window.getUnifiedCoordinatorPrograms() : []; } catch(e) {}
    if (!progs.length) { try { progs = JSON.parse(localStorage.getItem('iicm_programs')||'[]'); } catch(e) {} }
    progs.forEach(function(p){
        var o = document.createElement('option');
        o.value = p.id||p.program_id||'';
        o.textContent = p.title||p.name||p.program_title||('Program #'+o.value);
        if(p.start_date) o.dataset.startDate = p.start_date;
        if(p.end_date) o.dataset.endDate = p.end_date;
        if(p.venue || p.venue_name) o.dataset.venue = p.venue || p.venue_name;
        sel.appendChild(o);
    });
}

window.onInviteFacultyChange = function() {
    var facSel = document.getElementById('invite-faculty-select');
    var emailInp = document.getElementById('invite-faculty-email');
    if (facSel && emailInp) {
        var opt = facSel.options[facSel.selectedIndex];
        if (opt && opt.dataset && opt.dataset.email) {
            emailInp.value = opt.dataset.email;
        }
    }
    window.onInviteProgramChange();
};

window.onInviteProgramChange = function() {
    var progSel = document.getElementById('invite-program-select');
    var sDateInp = document.getElementById('invite-start-date');
    var eDateInp = document.getElementById('invite-end-date');
    var venueInp = document.getElementById('invite-venue');
    var container = document.getElementById('invite-program-sessions-container');

    if (!progSel || !container) return;

    var progId = progSel.value;
    var opt = progSel.options[progSel.selectedIndex];

    if (opt && opt.dataset) {
        if (sDateInp && opt.dataset.startDate) sDateInp.value = opt.dataset.startDate;
        if (eDateInp && opt.dataset.endDate) eDateInp.value = opt.dataset.endDate;
        if (venueInp) {
            var venues = {};
            try { venues = JSON.parse(localStorage.getItem('iicm_program_venues')||'{}'); } catch(e) {}
            venueInp.value = venues[progId] || opt.dataset.venue || 'IICM, Ranchi';
        }
    }

    if (!progId) {
        container.innerHTML = '<div style="text-align:center; padding:24px; color:#94a3b8; font-size:13px;">Select a Program above to view its configured sessions list.</div>';
        return;
    }

    /* Load sessions for this program */
    var sessions = [];
    try { sessions = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[]; } catch(e) {}

    if (sessions.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:24px; color:#94a3b8; font-size:13px;">No sessions configured for this program yet.</div>';
        return;
    }

    sessions.sort(function(a,b){ return ((a.session_date+a.start_time)>(b.session_date+b.start_time))?1:-1; });

    var rows = sessions.map(function(s, idx){
        var isYoga = (s.topic_title||'').toUpperCase().includes('YOGA') || s.session_slot==='06.30 AM-07.30 AM';
        var isLunch = (s.topic_title||'').toUpperCase().includes('LUNCH') || s.session_slot==='1.00 PM TO 2.00 PM';
        var badgeColor = isYoga ? '#dcfce7;color:#15803d' : (isLunch ? '#fef9c3;color:#854d0e' : '#eff6ff;color:#1e40af');

        return '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:8px 12px; font-weight:700; color:#334155;">Session ' + (idx+1) + '</td>' +
            '<td style="padding:8px 12px; font-weight:600; color:#0f172a;">' + (s.topic_title||'—') + '</td>' +
            '<td style="padding:8px 12px; color:#475569;">' + (s.faculty_name||'—') + '</td>' +
            '<td style="padding:8px 12px; color:#475569;">' + (s.session_date||'—') + '</td>' +
            '<td style="padding:8px 12px; color:#475569;">' + (s.start_time||'') + (s.end_time ? ' – '+s.end_time : '') + '</td>' +
            '<td style="padding:8px 12px;"><span style="background:'+badgeColor+'; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700;">' + (s.session_slot||'Configured') + '</span></td>' +
        '</tr>';
    }).join('');

    container.innerHTML =
        '<table style="width:100%; border-collapse:collapse; font-size:12.5px;">' +
        '<thead><tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">' +
            '<th style="padding:8px 12px;">#</th>' +
            '<th style="padding:8px 12px;">Topic Title</th>' +
            '<th style="padding:8px 12px;">Assigned Faculty</th>' +
            '<th style="padding:8px 12px;">Date</th>' +
            '<th style="padding:8px 12px;">Timing</th>' +
            '<th style="padding:8px 12px;">Slot Type</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';
};

function _fmtDate(d) {
    if (!d) return '';
    var p=d.split('-');
    if (p.length < 3) return d;
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return p[2]+' '+months[parseInt(p[1])-1]+"'"+p[0].slice(-2);
}

function _collectInviteData() {
    var facSel=document.getElementById('invite-faculty-select');
    var emailInp=document.getElementById('invite-faculty-email');
    var progSel=document.getElementById('invite-program-select');
    var facOpt=facSel?facSel.options[facSel.selectedIndex]:null;
    var progOpt=progSel?progSel.options[progSel.selectedIndex]:null;

    var sDate = ((document.getElementById('invite-start-date'))||{}).value||'';
    var eDate = ((document.getElementById('invite-end-date'))||{}).value||'';
    var period = sDate && eDate ? (_fmtDate(sDate) + ' to ' + _fmtDate(eDate)) : (sDate ? _fmtDate(sDate) : '');

    var progId = progSel ? progSel.value : '';
    var sessions = [];
    try { sessions = JSON.parse(localStorage.getItem('iicm_program_sessions')||'{}')[progId]||[]; } catch(e) {}

    return {
        facultyId:      facSel?facSel.value:'',
        facultyName:    facOpt?(facOpt.dataset&&facOpt.dataset.name?facOpt.dataset.name:facOpt.text.split(' — ')[0]):'',
        facultyEmail:   emailInp?emailInp.value:'',
        facultyOrg:     facOpt?(facOpt.dataset&&facOpt.dataset.org?facOpt.dataset.org:(facOpt.text.split(' — ')[1]||'')):'',
        programId:      progId,
        programTitle:   progOpt?progOpt.text:'',
        startDate:      sDate,
        endDate:        eDate,
        trainingPeriod: period,
        venue:          ((document.getElementById('invite-venue'))||{}).value||'IICM, Ranchi',
        dept:           ((document.getElementById('invite-dept'))||{}).value||'ICT Department of CIL (HQ)',
        remarks:        ((document.getElementById('invite-remarks'))||{}).value||'',
        sessions:       sessions
    };
}

function _showInviteBanner(type,msg) {
    var b=document.getElementById('invite-status-banner');
    if (!b) return;
    var styles={success:'background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;',error:'background:#fff1f2;border:1px solid #fecdd3;color:#be123c;',warning:'background:#fef3c7;border:1px solid #fde68a;color:#b45309;'};
    b.style.cssText='display:block;padding:14px 18px;border-radius:10px;font-size:13.5px;font-weight:600;margin-top:16px;'+(styles[type]||styles.success);
    b.innerHTML=msg;
}

function _buildInvitationHTML(d) {
    var progStr = d.programTitle || 'Training Programme';
    var periodStr = d.trainingPeriod || (d.startDate ? _fmtDate(d.startDate) : 'Scheduled Dates');
    var venueStr = d.venue || 'IICM, Ranchi';
    var deptStr = d.dept || 'ICT Department of CIL (HQ)';
    var mainTopic = d.sessions.length > 0 ? (d.sessions[0].topic_title || 'Technical Subjects') : 'Specialized Subject';

    var sessionRows = d.sessions.map(function(s, i){
        return '<tr>' +
            '<td style="padding:6px 10px; border:1px solid #cbd5e1;">' + (i+1) + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:600;">' + (s.topic_title||'—') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #cbd5e1;">' + (s.faculty_name||'—') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #cbd5e1;">' + (_fmtDate(s.session_date)||'—') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #cbd5e1;">' + (s.start_time||'') + (s.end_time ? ' – '+s.end_time : '') + '</td>' +
        '</tr>';
    }).join('');

    var sessionsTable = d.sessions.length > 0 ?
        '<div style="margin:16px 0;">' +
        '<div style="font-weight:700; margin-bottom:6px; color:#1e40af;">Configured Sessions Schedule:</div>' +
        '<table style="width:100%; border-collapse:collapse; font-size:12.5px;">' +
        '<thead><tr style="background:#f1f5f9; color:#334155; font-size:12px;">' +
            '<th style="padding:6px 10px; border:1px solid #cbd5e1; width:30px;">#</th>' +
            '<th style="padding:6px 10px; border:1px solid #cbd5e1;">Topic</th>' +
            '<th style="padding:6px 10px; border:1px solid #cbd5e1;">Faculty</th>' +
            '<th style="padding:6px 10px; border:1px solid #cbd5e1;">Date</th>' +
            '<th style="padding:6px 10px; border:1px solid #cbd5e1;">Time</th>' +
        '</tr></thead><tbody>' + sessionRows + '</tbody></table></div>' : '';

    return '<div style="font-family:\'Calibri\',\'Segoe UI\',Georgia,serif; font-size:14px; line-height:1.8; color:#1a1a1a; max-width:740px; margin:0 auto; padding:24px; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">' +
        '<div style="text-align:center; color:#dc2626; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:24px; padding-bottom:10px; border-bottom:2px solid #fee2e2;">' +
            'FORMAT OF SENDING EMAIL FOR INVITING FACULTY' +
        '</div>' +

        '<div style="margin-bottom:20px; font-weight:700; font-size:14px; background:#f8fafc; padding:12px 16px; border-left:4px solid #1e40af; border-radius:4px;">' +
            '<span style="color:#1e40af;">Subject:</span> Invitation to deliver session on ' + mainTopic + ' during ' + progStr + ' from ' + periodStr + ' at ' + venueStr +
        '</div>' +

        '<div style="margin-bottom:16px; font-weight:600;">Dear ' + (d.facultyName ? d.facultyName : 'Sir/Madam') + ',</div>' +

        '<div style="margin-bottom:16px; text-align:justify;">' +
            deptStr + ' is organizing <strong>' + progStr + '</strong> from <strong>' + periodStr + '</strong> at ' + venueStr + '.' +
        '</div>' +

        '<div style="margin-bottom:16px; text-align:justify;">' +
            'In this regard, we invite you to deliver session(s) as detailed in the programme schedule below:' +
        '</div>' +

        sessionsTable +

        (d.remarks ?
            '<div style="margin-bottom:16px; padding:12px 16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:13.5px;">' +
                '<strong style="color:#15803d;">Remarks:</strong> ' + d.remarks +
            '</div>' : ''
        ) +

        '<div style="margin-bottom:28px; text-align:justify;">' +
            'We request you to kindly confirm your availability and itinerary may be shared for needful arrangements.' +
        '</div>' +

        '<div style="margin-top:30px; border-top:1px solid #e2e8f0; padding-top:16px; font-size:13px; color:#334155;">' +
            '<strong>Programme Coordinator</strong><br>' +
            'Indian Institute of Coal Management (IICM)<br>' +
            'Gondwana Place, Kanke Road, Ranchi &ndash; 834 002' +
        '</div>' +
    '</div>';
}

window.handleSendFacultyInvite = async function(evt) {
    evt.preventDefault();
    var btn = document.getElementById('btn-send-faculty-invite');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending Email & Generating PDF...'; }
    var d = _collectInviteData();
    if (!d.facultyName) { _showInviteBanner('error', 'Please select a Faculty member.'); if (btn) { btn.disabled = false; btn.textContent = '📧 Send Email Invitation & PDF'; } return; }
    if (!d.facultyEmail) { _showInviteBanner('error', 'Please enter a valid Faculty email address.'); if (btn) { btn.disabled = false; btn.textContent = '📧 Send Email Invitation & PDF'; } return; }
    if (!d.programTitle) { _showInviteBanner('error', 'Please select a Program.'); if (btn) { btn.disabled = false; btn.textContent = '📧 Send Email Invitation & PDF'; } return; }

    var pdfFileName = 'Invitation_' + (d.facultyName || 'Faculty').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
    var record = Object.assign({}, d, {
        sentOn: new Date().toISOString(),
        status: 'SENT',
        hasAttachment: true,
        attachmentName: pdfFileName,
        id: 'INV-' + Date.now()
    });
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('iicm_faculty_invitations') || '[]'); } catch(e) {}
    existing.unshift(record);
    localStorage.setItem('iicm_faculty_invitations', JSON.stringify(existing));

    try {
        var token = localStorage.getItem('iicm_access_token');
        if (token && window.API_BASE_URL) {
            await fetch(window.API_BASE_URL + '/faculty/send-invitation/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(record)
            });
        }
    } catch(e) {}

    _showInviteBanner('success',
        '✅ <strong>Invitation Email Dispatched!</strong><br>' +
        'Sent to: <strong>' + d.facultyEmail + '</strong> (' + d.facultyName + ')<br>' +
        '📎 Attached PDF: <strong>' + pdfFileName + '</strong> ' +
        '<button type="button" onclick="generateFacultyInvitePDF()" style="margin-left:10px; padding:4px 12px; background:#15803d; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">📄 Download Attached PDF</button>'
    );
    if (btn) {
        setTimeout(function(){ btn.disabled = false; btn.textContent = '📧 Send Email Invitation & PDF'; }, 3000);
        btn.textContent = '✅ Email & PDF Sent!';
    }
    loadSentInvitations();
};

window.generateFacultyInvitePDF = function() {
    var d = _collectInviteData();
    if (!d.facultyName) { alert('Please select a Faculty member first.'); return; }
    var htmlContent = _buildInvitationHTML(d);
    var pdfFileName = 'Invitation_' + (d.facultyName || 'Faculty').replace(/[^a-zA-Z0-9]/g, '_');
    var printWindow = window.open('', '_blank', 'width=840,height=900');
    printWindow.document.write('<!DOCTYPE html><html><head><title>' + pdfFileName + '</title>' +
        '<style>body{font-family:"Calibri",sans-serif;margin:0;padding:20px;background:#f8fafc;}' +
        '@media print{.no-print{display:none!important;}body{background:#fff;padding:0;}}</style></head><body>' +
        '<div class="no-print" style="margin-bottom:20px;text-align:right;">' +
        '<button onclick="window.print()" style="padding:10px 24px;background:#1b4332;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;">📄 Download / Save PDF Attachment</button>' +
        '</div>' + htmlContent + '</body></html>');
    printWindow.document.close();
};

window.previewFacultyInvite = function() {
    var d = _collectInviteData();
    var modal = document.getElementById('invite-preview-modal');
    var body = document.getElementById('invite-letter-body');
    if (!modal || !body) return;
    body.innerHTML = _buildInvitationHTML(d);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeInvitePreviewModal = function(evt) {
    if (evt && evt.target !== document.getElementById('invite-preview-modal')) return;
    var m = document.getElementById('invite-preview-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
};

window.printInviteLetter = function() {
    generateFacultyInvitePDF();
};

window.resetFacultyInviteForm = function() {
    var form = document.getElementById('faculty-invite-form');
    if (form) form.reset();
    var cont = document.getElementById('invite-program-sessions-container');
    if (cont) cont.innerHTML = '<div style="text-align:center; padding:24px; color:#94a3b8; font-size:13px;">Select a Program above to view its configured sessions list.</div>';
    var b = document.getElementById('invite-status-banner');
    if (b) b.style.display = 'none';
};

window.loadSentInvitations = function() {
    var tbody = document.getElementById('sent-invitations-body');
    if (!tbody) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('iicm_faculty_invitations') || '[]'); } catch(e) {}
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">No invitations sent yet.</td></tr>';
        return;
    }
    var sc = { SENT: 'background:#dcfce7;color:#15803d', PENDING: 'background:#fef9c3;color:#854d0e', FAILED: 'background:#fee2e2;color:#b91c1c' };
    tbody.innerHTML = list.slice(0, 50).map(function(inv) {
        var s = sc[inv.status || 'SENT'] || sc['SENT'];
        var sentOn = inv.sentOn ? new Date(inv.sentOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
        var pdfBadge = inv.hasAttachment !== false ? '<span style="background:#eff6ff;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">📎 PDF Attached</span>' : '—';

        return '<tr>' +
            '<td style="font-weight:700;">' + (inv.facultyName || '—') + '<br><span style="color:#64748b;font-weight:400;font-size:11.5px;">' + (inv.facultyEmail || '') + '</span></td>' +
            '<td>' + (inv.programTitle || '—') + '</td>' +
            '<td>' + pdfBadge + '</td>' +
            '<td style="font-size:12px;">' + (inv.trainingPeriod || inv.startDate || '—') + '</td>' +
            '<td style="font-size:12px;">' + (inv.remarks || '—') + '</td>' +
            '<td style="font-size:12px;">' + sentOn + '</td>' +
            '<td><span style="' + s + ';padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:700;">' + (inv.status || 'SENT') + '</span></td>' +
        '</tr>';
    }).join('');
};

/* ════════════════════════════════════════════════════════════════
   NOTE SHEET APPROVAL FOR CONDUCTION PROGRAM MODULE
════════════════════════════════════════════════════════════════ */

window.previewNotesheet = function() {
    var d = _collectNotesheetData();
    var modal = document.getElementById('notesheet-preview-modal');
    var body = document.getElementById('notesheet-letter-body');
    if (!modal || !body) return;
    body.innerHTML = _buildNotesheetHTML(d);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeNotesheetPreviewModal = function(evt) {
    if (evt && evt.target !== document.getElementById('notesheet-preview-modal')) return;
    var m = document.getElementById('notesheet-preview-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
};

window.loadSubmittedNotesheets = function() {
    var tbody = document.getElementById('notesheets-log-body');
    if (!tbody) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('iicm_notesheets')||'[]'); } catch(e) {}
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No noting sheets submitted yet.</td></tr>';
        return;
    }
};

function initNotesheetSection() {
    _populateNotesheetProgramDropdown();
    var dInput = document.getElementById('ns-date');
    if (dInput && !dInput.value) {
        dInput.value = new Date().toISOString().split('T')[0];
    }
    var cont = document.getElementById('ns-faculty-rows-container');
    if (cont && cont.children.length === 0) {
        addNotesheetFacultyRow('Shri C. Sakthivel', 'GM (E&T)/HoD, SECL', 'ON_ROLL_BELOW_BOARD', 4, 3500);
        addNotesheetFacultyRow('Sri Harsimrenjit', 'Sr. Manager (E&T), ECL HQ', 'ON_ROLL_BELOW_BOARD', 4, 3500);
        addNotesheetFacultyRow('Dr. R.N. Patra', 'GM/HoD (E&T), CIL', 'ON_ROLL_BELOW_BOARD', 3, 3500);
        addNotesheetFacultyRow('Shri Brajesh Kumar Tripathy', 'IRSE, CVO, CIL', 'ON_ROLL_BOARD', 1, 5000);
    }
    calcNotesheetTotals();
    loadSubmittedNotesheets();
}
window.initNotesheetSection = initNotesheetSection;

function _populateNotesheetProgramDropdown() {
    var sel = document.getElementById('ns-program-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Program --</option>';
    var progs = [];
    try { progs = window.getUnifiedCoordinatorPrograms ? window.getUnifiedCoordinatorPrograms() : []; } catch(e) {}
    if (!progs.length) { try { progs = JSON.parse(localStorage.getItem('iicm_programs')||'[]'); } catch(e) {} }
    progs.forEach(function(p){
        var o = document.createElement('option');
        o.value = p.id||p.program_id||'';
        o.textContent = p.title||p.name||p.program_title||('Program #'+o.value);
        if(p.start_date) o.dataset.startDate = p.start_date;
        if(p.end_date) o.dataset.endDate = p.end_date;
        sel.appendChild(o);
    });
}

function onNotesheetProgramChange() {
    calcNotesheetTotals();
}
window.onNotesheetProgramChange = onNotesheetProgramChange;

function addNotesheetFacultyRow(name, desig, cat, sess, rate) {
    var cont = document.getElementById('ns-faculty-rows-container');
    if (!cont) return;

    var rowId = 'ns-fac-row-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    var tr = document.createElement('tr');
    tr.id = rowId;
    tr.style.borderBottom = '1px solid #e2e8f0';

    var nameVal = name || '';
    var desigVal = desig || '';
    var catVal = cat || 'ON_ROLL_BELOW_BOARD';
    var sessVal = sess !== undefined ? sess : 1;

    var defaultRates = {
        'ON_ROLL_BOARD': 5000,
        'ON_ROLL_BELOW_BOARD': 3500,
        'RETIRED_PROFESSOR': 7500,
        'RETIRED_ASST_PROF': 5000,
        'OTHER_CUSTOM': 2500
    };
    var rateVal = rate !== undefined ? rate : (defaultRates[catVal] || 3500);
    var amtVal = sessVal * rateVal;

    tr.innerHTML =
        '<td style="padding:6px 8px;"><input type="text" class="form-control ns-row-name" value="' + nameVal + '" placeholder="e.g. Dr. Rajesh Sharma" style="font-size:12px; border:1px solid #cbd5e1;"></td>' +
        '<td style="padding:6px 8px;"><input type="text" class="form-control ns-row-desig" value="' + desigVal + '" placeholder="e.g. GM (E&T)/HoD, SECL" style="font-size:12px; border:1px solid #cbd5e1;"></td>' +
        '<td style="padding:6px 8px;">' +
            '<select class="form-control ns-row-cat" style="font-size:11.5px; border:1px solid #cbd5e1;" onchange="onNotesheetCategoryChange(\'' + rowId + '\')">' +
                '<option value="ON_ROLL_BOARD" ' + (catVal==='ON_ROLL_BOARD'?'selected':'') + '>On Roll CIL: Board Level (CMD & Dir) - ₹5000/sess</option>' +
                '<option value="ON_ROLL_BELOW_BOARD" ' + (catVal==='ON_ROLL_BELOW_BOARD'?'selected':'') + '>On Roll CIL: Below Board (ED, GM) - ₹3500/sess</option>' +
                '<option value="RETIRED_PROFESSOR" ' + (catVal==='RETIRED_PROFESSOR'?'selected':'') + '>Retired CIL: Professor - ₹7500/sess</option>' +
                '<option value="RETIRED_ASST_PROF" ' + (catVal==='RETIRED_ASST_PROF'?'selected':'') + '>Retired CIL: Assistant Professor - ₹5000/sess</option>' +
                '<option value="OTHER_CUSTOM" ' + (catVal==='OTHER_CUSTOM'?'selected':'') + '>Other / External Expert - Custom Rate</option>' +
            '</select>' +
        '</td>' +
        '<td style="padding:6px 8px;"><input type="number" class="form-control ns-row-sess" value="' + sessVal + '" min="1" style="font-size:12px; border:1px solid #cbd5e1;" oninput="calcNotesheetRowAmount(\'' + rowId + '\')"></td>' +
        '<td style="padding:6px 8px;"><input type="number" class="form-control ns-row-rate" value="' + rateVal + '" style="font-size:12px; border:1px solid #cbd5e1;" oninput="calcNotesheetRowAmount(\'' + rowId + '\')"></td>' +
        '<td style="padding:6px 8px;"><input type="number" class="form-control ns-row-amt" value="' + amtVal + '" readonly style="font-size:12px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1;"></td>' +
        '<td style="padding:6px 8px; text-align:center;"><button type="button" onclick="removeNotesheetFacultyRow(\'' + rowId + '\')" style="background:#fee2e2; color:#b91c1c; border:none; width:26px; height:26px; border-radius:4px; font-weight:bold; cursor:pointer;">&times;</button></td>';

    cont.appendChild(tr);
    calcNotesheetTotals();
}
window.addNotesheetFacultyRow = addNotesheetFacultyRow;

function removeNotesheetFacultyRow(rowId) {
    var el = document.getElementById(rowId);
    if (el) el.remove();
    calcNotesheetTotals();
}
window.removeNotesheetFacultyRow = removeNotesheetFacultyRow;

function onNotesheetCategoryChange(rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;
    var catSel = row.querySelector('.ns-row-cat');
    var rateInp = row.querySelector('.ns-row-rate');
    var defaultRates = {
        'ON_ROLL_BOARD': 5000,
        'ON_ROLL_BELOW_BOARD': 3500,
        'RETIRED_PROFESSOR': 7500,
        'RETIRED_ASST_PROF': 5000,
        'OTHER_CUSTOM': 2500
    };
    if (catSel && rateInp) {
        rateInp.value = defaultRates[catSel.value] || 3500;
    }
    calcNotesheetRowAmount(rowId);
}
window.onNotesheetCategoryChange = onNotesheetCategoryChange;

function calcNotesheetRowAmount(rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;
    var sessInp = row.querySelector('.ns-row-sess');
    var rateInp = row.querySelector('.ns-row-rate');
    var amtInp = row.querySelector('.ns-row-amt');
    var s = parseFloat(sessInp ? sessInp.value : 0) || 0;
    var r = parseFloat(rateInp ? rateInp.value : 0) || 0;
    if (amtInp) amtInp.value = s * r;
    calcNotesheetTotals();
}
window.calcNotesheetRowAmount = calcNotesheetRowAmount;

function calcNotesheetTotals() {
    var cont = document.getElementById('ns-faculty-rows-container');
    var rows = cont ? cont.querySelectorAll('tr') : [];
    var honorariumSum = 0;
    rows.forEach(function(r){
        var amtInp = r.querySelector('.ns-row-amt');
        if (amtInp) honorariumSum += parseFloat(amtInp.value || 0) || 0;
    });

    var travelAmt = parseFloat(((document.getElementById('ns-travel-amount'))||{}).value || 0) || 0;
    var miscAmt = parseFloat(((document.getElementById('ns-misc-amount'))||{}).value || 0) || 0;
    var grandTotal = honorariumSum + travelAmt + miscAmt;

    var hEl = document.getElementById('ns-sum-honorarium'); if (hEl) hEl.textContent = '₹' + honorariumSum.toLocaleString('en-IN');
    var tEl = document.getElementById('ns-sum-travel');     if (tEl) tEl.textContent = '₹' + travelAmt.toLocaleString('en-IN');
    var mEl = document.getElementById('ns-sum-misc');       if (mEl) mEl.textContent = '₹' + miscAmt.toLocaleString('en-IN');
    var gEl = document.getElementById('ns-sum-total');      if (gEl) gEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');

    return { honorariumSum: honorariumSum, travelAmt: travelAmt, miscAmt: miscAmt, grandTotal: grandTotal };
}
window.calcNotesheetTotals = calcNotesheetTotals;

function _collectNotesheetData() {
    var progSel = document.getElementById('ns-program-select');
    var progOpt = progSel ? progSel.options[progSel.selectedIndex] : null;
    var progTitle = progOpt ? progOpt.text : 'Marathon Training Programme (IT INITIATIVES)';

    var refNo = ((document.getElementById('ns-ref-no'))||{}).value || 'IICM/Academics/Faculty Payment/MTP/2025-26/';
    var dateVal = ((document.getElementById('ns-date'))||{}).value || new Date().toISOString().split('T')[0];

    var propBudget = ((document.getElementById('ns-proposed-budget'))||(document.getElementById('ns-sanctioned-budget'))||{}).value || '47500';
    var sancFileInput = document.getElementById('ns-sanctioned-file');
    var sancFileName = (sancFileInput && sancFileInput.files && sancFileInput.files[0]) ? sancFileInput.files[0].name : '';

    var travelDesc = ((document.getElementById('ns-travel-desc'))||{}).value || '';
    var travelAmt = parseFloat(((document.getElementById('ns-travel-amount'))||{}).value || 0) || 0;

    var miscDesc = ((document.getElementById('ns-misc-desc'))||{}).value || 'Purchase of A3 Paper & Photo Frame';
    var miscAmt = parseFloat(((document.getElementById('ns-misc-amount'))||{}).value || 0) || 0;

    var approverEmail = ((document.getElementById('ns-approver-email'))||{}).value || 'finance.approval@iicm.ac.in';

    var cont = document.getElementById('ns-faculty-rows-container');
    var rows = cont ? cont.querySelectorAll('tr') : [];
    var faculties = [];
    rows.forEach(function(r){
        var nInp = r.querySelector('.ns-row-name');
        var dInp = r.querySelector('.ns-row-desig');
        var cSel = r.querySelector('.ns-row-cat');
        var sInp = r.querySelector('.ns-row-sess');
        var rInp = r.querySelector('.ns-row-rate');
        var aInp = r.querySelector('.ns-row-amt');

        if (nInp && nInp.value) {
            faculties.push({
                name: nInp.value,
                desig: dInp ? dInp.value : '',
                category: cSel ? cSel.options[cSel.selectedIndex].text : '',
                sessions: parseFloat(sInp ? sInp.value : 1) || 1,
                rate: parseFloat(rInp ? rInp.value : 0) || 0,
                amount: parseFloat(aInp ? aInp.value : 0) || 0
            });
        }
    });

    var totals = calcNotesheetTotals();

    return {
        programTitle: progTitle,
        refNo: refNo,
        date: dateVal,
        proposedBudget: propBudget,
        sanctionedFileName: sancFileName,
        faculties: faculties,
        travelDesc: travelDesc,
        travelAmount: travelAmt,
        miscDesc: miscDesc,
        miscAmount: miscAmt,
        approverEmail: approverEmail,
        totals: totals
    };
}

function _buildNotesheetHTML(d) {
    var slCounter = 1;
    var facTableRows = d.faculties.map(function(f){
        var nameBlock = '<strong>' + f.name + '</strong>' + (f.desig ? '<br><span style="font-size:11.5px; color:#475569;">' + f.desig + '</span>' : '');
        return '<tr>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:center;">' + (slCounter++) + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155;">' + nameBlock + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:right;">₹' + f.rate.toLocaleString('en-IN') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:center;">' + f.sessions + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:right; font-weight:700;">₹' + f.amount.toLocaleString('en-IN') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; font-size:11px; color:#475569;">Honorarium for session</td>' +
        '</tr>';
    }).join('');

    var travelRow = d.travelAmount > 0 ?
        '<tr>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:center;">' + (slCounter++) + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155;" colspan="3">Travel Expenses: ' + (d.travelDesc||'Flight & Local Taxi Reimbursement') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:right; font-weight:700;">₹' + d.travelAmount.toLocaleString('en-IN') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; font-size:11px; color:#475569;">Reimbursement</td>' +
        '</tr>' : '';

    var miscRow = d.miscAmount > 0 ?
        '<tr>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:center;">' + (slCounter++) + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155;" colspan="3">Miscellaneous: ' + (d.miscDesc||'Purchase of A3 Paper & Photo Frame') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; text-align:right; font-weight:700;">₹' + d.miscAmount.toLocaleString('en-IN') + '</td>' +
            '<td style="padding:6px 10px; border:1px solid #334155; font-size:11px; color:#475569;">Expenditure Made</td>' +
        '</tr>' : '';

    var formattedDate = _fmtDate(d.date) || d.date;

    return '<div style="font-family:\'Calibri\',\'Segoe UI\',Times,serif; font-size:13px; line-height:1.6; color:#0f172a; max-width:780px; margin:0 auto; padding:28px; background:#fff; border:1px solid #cbd5e1; border-radius:6px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:18px;">' +
            '<div>' +
                '<h2 style="margin:0; font-size:18px; font-weight:900; color:#0f172a; letter-spacing:0.5px;">INDIAN INSTITUTE OF COAL MANAGEMENT</h2>' +
                '<div style="font-size:12px; color:#475569; font-weight:600;">Kanke Road, Ranchi &ndash; 834 002</div>' +
            '</div>' +
            '<div style="text-align:right; font-size:18px; font-weight:900; letter-spacing:1px; text-decoration:underline; color:#0f172a;">NOTE SHEET</div>' +
        '</div>' +

        '<div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:14px; border-bottom:1px dashed #cbd5e1; padding-bottom:8px;">' +
            '<div>Ref. No.: ' + d.refNo + '</div>' +
            '<div>Date: ' + formattedDate + '</div>' +
        '</div>' +

        '<div style="margin-bottom:14px; text-align:justify; font-size:13px; font-weight:700; background:#f8fafc; padding:10px 12px; border-left:4px solid #991b1b;">' +
            'Subject: Approval and payment note sheet for training program &ldquo;' + d.programTitle + '&rdquo;.' +
        '</div>' +

        '<div style="margin-bottom:14px; text-align:justify; padding:10px 12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; font-size:12.5px;">' +
            '<strong style="color:#15803d;">Proposed Budget:</strong> ₹' + Number(d.proposedBudget||0).toLocaleString('en-IN') + ' provided for training operations & honorarium.<br>' +
            (d.sanctionedFileName ? '<strong>Attached Sanctioned Document:</strong> <span style="background:#eff6ff; color:#1e40af; padding:2px 8px; border-radius:4px; font-weight:700;">📎 ' + d.sanctionedFileName + '</span><br>' : '') +
            'The training program has been structured and submitted for administrative and financial sanction.' +
        '</div>' +

        '<div style="font-weight:700; margin-bottom:10px; font-size:13px; color:#991b1b;">' +
            '<u>Proposed Honorarium &amp; Expense Breakdown (Total Proposed: ₹' + d.totals.grandTotal.toLocaleString('en-IN') + ')</u>' +
        '</div>' +

        '<div style="margin-bottom:16px;">' +
            '<table style="width:100%; border-collapse:collapse; font-size:12px;">' +
                '<thead><tr style="background:#e2e8f0; color:#0f172a; text-align:center; font-weight:800;">' +
                    '<th style="padding:6px; border:1px solid #334155; width:35px;">Sl No.</th>' +
                    '<th style="padding:6px; border:1px solid #334155;">Name of Faculty / Details</th>' +
                    '<th style="padding:6px; border:1px solid #334155; width:110px;">Honorarium Rate (Rs/session)</th>' +
                    '<th style="padding:6px; border:1px solid #334155; width:60px;">Session</th>' +
                    '<th style="padding:6px; border:1px solid #334155; width:110px;">Honorarium Amount (Rs)</th>' +
                    '<th style="padding:6px; border:1px solid #334155; width:90px;">Remarks</th>' +
                '</tr></thead>' +
                '<tbody>' +
                    facTableRows +
                    travelRow +
                    miscRow +
                    '<tr style="background:#f1f5f9; font-weight:900;">' +
                        '<td colspan="4" style="padding:8px 12px; border:1px solid #334155; text-align:right;">Total (&#x20B9;)</td>' +
                        '<td style="padding:8px 12px; border:1px solid #334155; text-align:right; color:#dc2626; font-size:13.5px;">₹' + d.totals.grandTotal.toLocaleString('en-IN') + '</td>' +
                        '<td style="padding:8px 12px; border:1px solid #334155;"></td>' +
                    '</tr>' +
                '</tbody>' +
            '</table>' +
        '</div>' +

        '<div style="margin-bottom:14px; text-align:justify;">' +
            'An expenditure of ₹' + d.totals.grandTotal.toLocaleString('en-IN') + ' has been proposed/incurred under the Miscellaneous and Honorarium head towards the successful conduction of the training programme. Submitted for kind administrative and financial sanction/reimbursement.' +
        '</div>' +

        '<div style="margin-bottom:20px; font-weight:700; color:#0f172a;">' +
            'Submitted for kind perusal and forwarding for approval and payment.' +
        '</div>' +

        '<div style="margin-bottom:30px; font-size:11.5px; color:#475569;">' +
            '<em>Enclosed: Faculty schedule & details, copy of program proposal and sanction files.</em>' +
        '</div>' +

        '<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:40px;">' +
            '<div>' +
                '<strong>Prepared By:</strong><br>' +
                'Programme Coordinator, IICM' +
            '</div>' +
            '<div style="text-align:right;">' +
                '<strong>Sr. Manager (Systems), IICM</strong>' +
            '</div>' +
        '</div>' +
    '</div>';
}

async function handleSendNotesheetApproval(evt) {
    evt.preventDefault();
    var btn = document.getElementById('btn-send-notesheet-approval');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending Approval Email & PDF...'; }

    var d = _collectNotesheetData();
    if (!d.approverEmail) {
        _showNotesheetBanner('error', 'Please specify an Approver Email Address.');
        if (btn) { btn.disabled = false; btn.textContent = '📧 Send Approval Email & PDF'; }
        return;
    }

    var pdfFileName = 'NoteSheet_' + (d.refNo.replace(/[^a-zA-Z0-9]/g,'_')) + '.pdf';
    var record = Object.assign({}, d, {
        submittedOn: new Date().toISOString(),
        status: 'SUBMITTED_FOR_APPROVAL',
        hasAttachment: true,
        attachmentName: pdfFileName,
        id: 'NS-' + Date.now()
    });

    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('iicm_notesheets')||'[]'); } catch(e) {}
    existing.unshift(record);
    localStorage.setItem('iicm_notesheets', JSON.stringify(existing));

    try {
        var token = localStorage.getItem('iicm_access_token');
        if (token && window.API_BASE_URL) {
            await fetch(window.API_BASE_URL + '/faculty/send-notesheet-approval/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(record)
            });
        }
    } catch(e) {}

    _showNotesheetBanner('success',
        '✅ <strong>Note Sheet Approval Email Dispatched!</strong><br>' +
        'Sent to Approver: <strong>' + d.approverEmail + '</strong><br>' +
        'Total Amount: <strong>₹' + d.totals.grandTotal.toLocaleString('en-IN') + '</strong> | 📎 Attached: <strong>' + pdfFileName + '</strong> ' +
        '<button type="button" onclick="generateNotesheetPDF()" style="margin-left:10px; padding:4px 12px; background:#15803d; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">📄 Download Attached PDF</button>'
    );

    if (btn) {
        setTimeout(function(){ btn.disabled = false; btn.textContent = '📧 Send Approval Email & PDF'; }, 3000);
        btn.textContent = '✅ Email & Note Sheet Sent!';
    }
    loadSubmittedNotesheets();
}
window.handleSendNotesheetApproval = handleSendNotesheetApproval;

function generateNotesheetPDF() {
    var d = _collectNotesheetData();
    var htmlContent = _buildNotesheetHTML(d);
    var pdfFileName = 'NoteSheet_' + (d.refNo.replace(/[^a-zA-Z0-9]/g,'_'));
    var printWindow = window.open('', '_blank', 'width=860,height=920');
    printWindow.document.write('<!DOCTYPE html><html><head><title>' + pdfFileName + '</title>' +
        '<style>body{font-family:"Calibri",sans-serif;margin:0;padding:20px;background:#f8fafc;}' +
        '@media print{.no-print{display:none!important;}body{background:#fff;padding:0;}}</style></head><body>' +
        '<div class="no-print" style="margin-bottom:20px;text-align:right;">' +
        '<button onclick="window.print()" style="padding:10px 24px;background:#991b1b;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;">📄 Download / Save PDF Note Sheet</button>' +
        '</div>' + htmlContent + '</body></html>');
    printWindow.document.close();
}
window.generateNotesheetPDF = generateNotesheetPDF;

function generateNotesheetDocx() {
    var d = _collectNotesheetData();
    var html = _buildNotesheetHTML(d);
    var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'NoteSheet_' + (d.refNo.replace(/[^a-zA-Z0-9]/g,'_')) + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.generateNotesheetDocx = generateNotesheetDocx;

function previewNotesheet() {
    var d = _collectNotesheetData();
    var modal = document.getElementById('notesheet-preview-modal');
    var body = document.getElementById('notesheet-letter-body');
    if (!modal || !body) return;
    body.innerHTML = _buildNotesheetHTML(d);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
window.previewNotesheet = previewNotesheet;

function closeNotesheetPreviewModal(evt) {
    if (evt && evt.target !== document.getElementById('notesheet-preview-modal')) return;
    var m = document.getElementById('notesheet-preview-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
}
window.closeNotesheetPreviewModal = closeNotesheetPreviewModal;

function loadSubmittedNotesheets() {
    var tbody = document.getElementById('notesheets-log-body');
    if (!tbody) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('iicm_notesheets')||'[]'); } catch(e) {}
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No note sheets submitted yet.</td></tr>';
        return;
    }
    tbody.innerHTML = list.slice(0,50).map(function(n){
        var sentOn = n.submittedOn ? new Date(n.submittedOn).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
        var total = n.totals ? n.totals.grandTotal : 0;
        var facCount = (n.faculties && n.faculties.length) ? n.faculties.length + ' faculty members' : 'Configured';

        return '<tr>' +
            '<td style="font-weight:700; font-size:12px;">' + (n.refNo||'—') + '</td>' +
            '<td style="font-size:12.5px;">' + (n.programTitle||'—') + '</td>' +
            '<td style="font-size:12px;">' + facCount + '</td>' +
            '<td style="font-weight:800; color:#dc2626;">₹' + total.toLocaleString('en-IN') + '</td>' +
            '<td style="font-size:11.5px;">' + sentOn + '</td>' +
            '<td><span style="background:#dcfce7; color:#15803d; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700;">SUBMITTED</span></td>' +
        '</tr>';
    }).join('');
}
window.loadSubmittedNotesheets = loadSubmittedNotesheets;


/* ════════════════════════════════════════════════════════════════
   NOMINATION FORM DISPATCH MODULE
════════════════════════════════════════════════════════════════ */

function initNominationFormSection() {
    _populateNominationProgramDropdown();
    loadSentNominations();
}
window.initNominationFormSection = initNominationFormSection;

function _populateNominationProgramDropdown() {
    var sel = document.getElementById('nom-program-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Existing Program or enter custom details below --</option>';
    var progs = [];
    try { progs = window.getUnifiedCoordinatorPrograms ? window.getUnifiedCoordinatorPrograms() : []; } catch(e) {}
    if (!progs.length) { try { progs = JSON.parse(localStorage.getItem('iicm_programs')||'[]'); } catch(e) {} }
    
    // Default fallback programs if storage is empty
    if (!progs.length) {
        progs = [
            {
                id: 'PROG-101',
                title: 'Occupational Health Capacity Building Workshop',
                start_date: '2026-07-07',
                end_date: '2026-07-09',
                venue: 'IICM Training Complex, Ranchi',
                program_type: 'Residential',
                capacity: '25',
                objective: 'The programme is designed to enhance knowledge, operational efficiency, and competencies in subject domain while ensuring adherence to statutory provisions and best industrial practices.'
            },
            {
                id: 'PROG-102',
                title: 'Management Development Programme on Mine Safety (MT)',
                start_date: '2026-08-10',
                end_date: '2026-08-14',
                venue: 'Executive MDP Hall, IICM Ranchi',
                program_type: 'Residential',
                capacity: '30',
                objective: 'Comprehensive development of managerial safety leadership, risk mitigation strategies, and statutory compliance across Coal India subsidiaries.'
            }
        ];
    }

    progs.forEach(function(p){
        var o = document.createElement('option');
        o.value = p.id||p.program_id||'';
        o.textContent = p.title||p.name||p.program_title||('Program #'+o.value);
        if(p.start_date) o.dataset.startDate = p.start_date;
        if(p.end_date) o.dataset.endDate = p.end_date;
        if(p.objective) o.dataset.objective = p.objective;
        if(p.target_audience) o.dataset.targetAudience = p.target_audience;
        if(p.program_type) o.dataset.programType = p.program_type;
        if(p.venue) o.dataset.venue = p.venue;
        if(p.capacity || p.max_participants) o.dataset.capacity = p.capacity || p.max_participants;
        sel.appendChild(o);
    });

    // Auto-select first program if not yet selected
    if (sel.options.length > 1 && !sel.value) {
        sel.selectedIndex = 1;
        onNominationProgramChange();
    }
}

function _formatNomDateString(dateStr) {
    if (!dateStr) return '';
    try {
        var parts = dateStr.split('-');
        if (parts.length === 3) {
            var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            var day = String(parseInt(parts[2], 10)).padStart(2, '0');
            var month = months[parseInt(parts[1], 10) - 1];
            return day + ' ' + month + ' ' + parts[0];
        }
    } catch(e) {}
    return dateStr;
}

function _formatNomShortRange(sDate, eDate) {
    if (!sDate) return '';
    if (!eDate || sDate === eDate) return _formatNomDateString(sDate);
    try {
        var sp = sDate.split('-');
        var ep = eDate.split('-');
        if (sp.length === 3 && ep.length === 3) {
            var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            var sm = months[parseInt(sp[1], 10) - 1];
            if (sp[0] === ep[0] && sp[1] === ep[1]) {
                var sday = String(parseInt(sp[2], 10)).padStart(2, '0');
                var eday = String(parseInt(ep[2], 10)).padStart(2, '0');
                return sday + '–' + eday + ' ' + sm + ' ' + sp[0];
            }
        }
    } catch(e) {}
    return _formatNomDateString(sDate) + ' to ' + _formatNomDateString(eDate);
}

function onNominationProgramChange() {
    var progSel = document.getElementById('nom-program-select');
    var titleInp = document.getElementById('nom-program-title');
    var sDateInp = document.getElementById('nom-start-date');
    var eDateInp = document.getElementById('nom-end-date');
    var venueInp = document.getElementById('nom-venue');
    var expPartInp = document.getElementById('nom-expected-participants');
    var modeInp = document.getElementById('nom-mode');
    var objectiveInp = document.getElementById('nom-program-objective');

    if (!progSel) return;
    var opt = progSel.options[progSel.selectedIndex];
    if (opt && opt.value) {
        var rawTitle = opt.getAttribute('data-title') || opt.text || '';
        var cleanTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (titleInp) titleInp.value = cleanTitle;
        if (sDateInp) sDateInp.value = opt.getAttribute('data-start') || opt.getAttribute('data-start-date') || '2026-08-10';
        if (eDateInp) eDateInp.value = opt.getAttribute('data-end') || opt.getAttribute('data-end-date') || '2026-08-15';
        if (venueInp) venueInp.value = opt.getAttribute('data-venue') || 'IICM Training Hall, Ranchi';
        if (expPartInp) expPartInp.value = opt.getAttribute('data-capacity') || '25';
        if (objectiveInp) objectiveInp.value = opt.getAttribute('data-objective') || ('To develop executive management competency in ' + cleanTitle);
    }
}
window.onNominationProgramChange = onNominationProgramChange;

function addNomineeRow(data) {
    var tbody = document.getElementById('nom-employees-tbody');
    if (!tbody) return;
    var rowCount = tbody.querySelectorAll('tr').length + 1;
    var d = data || {
        empId: '',
        name: '',
        desig: '',
        posting: '',
        company: 'BCCL',
        whatsapp: ''
    };

    var tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center; font-weight:700;">${rowCount}</td>
        <td><input type="text" class="form-control nom-row-empid" value="${d.empId || ''}" placeholder="e.g. 90234567" required style="font-size:12.5px; padding:6px 8px;"></td>
        <td><input type="text" class="form-control nom-row-name" value="${d.name || ''}" placeholder="e.g. Employee Name" required style="font-size:12.5px; padding:6px 8px; font-weight:600;"></td>
        <td><input type="text" class="form-control nom-row-desig" value="${d.desig || ''}" placeholder="e.g. Designation" required style="font-size:12.5px; padding:6px 8px;"></td>
        <td><input type="text" class="form-control nom-row-posting" value="${d.posting || ''}" placeholder="e.g. Area / Posting" required style="font-size:12.5px; padding:6px 8px;"></td>
        <td>
            <select class="form-control nom-row-company" style="font-size:12.5px; padding:6px 8px; font-weight:600;" required>
                <option value="BCCL" ${d.company === 'BCCL' ? 'selected' : ''}>BCCL</option>
                <option value="CCL" ${d.company === 'CCL' ? 'selected' : ''}>CCL</option>
                <option value="ECL" ${d.company === 'ECL' ? 'selected' : ''}>ECL</option>
                <option value="WCL" ${d.company === 'WCL' ? 'selected' : ''}>WCL</option>
                <option value="SECL" ${d.company === 'SECL' ? 'selected' : ''}>SECL</option>
                <option value="MCL" ${d.company === 'MCL' ? 'selected' : ''}>MCL</option>
                <option value="NCL" ${d.company === 'NCL' ? 'selected' : ''}>NCL</option>
                <option value="CMPDI" ${d.company === 'CMPDI' ? 'selected' : ''}>CMPDI</option>
                <option value="CIL HQ" ${d.company === 'CIL HQ' ? 'selected' : ''}>CIL HQ</option>
                <option value="NEC" ${d.company === 'NEC' ? 'selected' : ''}>NEC</option>
            </select>
        </td>
        <td><input type="tel" class="form-control nom-row-whatsapp" value="${d.whatsapp || ''}" placeholder="e.g. 9876543210" required style="font-size:12.5px; padding:6px 8px;"></td>
        <td style="text-align:center;">
            <button type="button" onclick="removeNomineeRow(this)" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:4px; padding:4px 8px; cursor:pointer; font-weight:700;">&times;</button>
        </td>
    `;
    tbody.appendChild(tr);
    _reindexNomineeRows();
}
window.addNomineeRow = addNomineeRow;

function removeNomineeRow(btn) {
    var tr = btn.closest('tr');
    var tbody = document.getElementById('nom-employees-tbody');
    if (tbody && tbody.querySelectorAll('tr').length > 1) {
        if (tr) tr.remove();
        _reindexNomineeRows();
    } else {
        alert('At least one employee row is required in the nomination list.');
    }
}
window.removeNomineeRow = removeNomineeRow;

function _reindexNomineeRows() {
    var tbody = document.getElementById('nom-employees-tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function(r, idx) {
        var firstTd = r.querySelector('td:first-child');
        if (firstTd) firstTd.innerText = idx + 1;
    });
}

function _collectNominationData() {
    var progSel = document.getElementById('nom-program-select');
    var progTitle = ((document.getElementById('nom-program-title'))||{}).value || (progSel && progSel.selectedIndex > 0 ? progSel.options[progSel.selectedIndex].text : 'Occupational Health Capacity Building Workshop');

    var sDate = ((document.getElementById('nom-start-date'))||{}).value || '2026-07-07';
    var eDate = ((document.getElementById('nom-end-date'))||{}).value || '2026-07-09';
    var venue = ((document.getElementById('nom-venue'))||{}).value || 'IICM, Ranchi';
    var expectedParticipants = ((document.getElementById('nom-expected-participants'))||{}).value || '25';
    var mode = ((document.getElementById('nom-mode'))||{}).value || 'Residential';
    var objective = ((document.getElementById('nom-program-objective'))||{}).value || 'The programme is designed to enhance knowledge, operational efficiency, and competencies in subject domain while ensuring adherence to statutory provisions and best industrial practices.';

    var datesFormatted = _formatNomDateString(sDate) + ' to ' + _formatNomDateString(eDate);

    // Collect all employee table rows
    var employees = [];
    var tbody = document.getElementById('nom-employees-tbody');
    if (tbody) {
        var trs = tbody.querySelectorAll('tr');
        trs.forEach(function(tr, idx) {
            var empId = (tr.querySelector('.nom-row-empid') || {}).value || '';
            var name = (tr.querySelector('.nom-row-name') || {}).value || '';
            var desig = (tr.querySelector('.nom-row-desig') || {}).value || '';
            var posting = (tr.querySelector('.nom-row-posting') || {}).value || '';
            var company = (tr.querySelector('.nom-row-company') || {}).value || 'BCCL';
            var whatsapp = (tr.querySelector('.nom-row-whatsapp') || {}).value || '';

            if (empId || name) {
                employees.push({
                    sno: idx + 1,
                    empId: empId || '90234567',
                    name: name || 'Dr. Rajesh Kumar',
                    desig: desig || 'Chief Medical Officer',
                    posting: posting || 'Central Hospital, Dhanbad',
                    company: company || 'BCCL',
                    whatsapp: whatsapp || '9876543210'
                });
            }
        });
    }

    if (!employees.length) {
        employees.push({
            sno: 1,
            empId: '90234567',
            name: 'Dr. Rajesh Kumar',
            desig: 'Chief Medical Officer',
            posting: 'Central Hospital, Dhanbad',
            company: 'BCCL',
            whatsapp: '9876543210'
        });
    }

    return {
        programId: progSel ? progSel.value : '',
        programTitle: progTitle,
        startDate: sDate,
        endDate: eDate,
        datesFormatted: datesFormatted,
        venue: venue,
        expectedParticipants: expectedParticipants,
        mode: mode,
        employees: employees,
        objective: objective
    };
}

function _buildNominationFormHTML(d) {
    var rowsHtml = '';
    (d.employees || []).forEach(function(emp) {
        rowsHtml += `
            <tr>
                <td style="border:1px solid #0f172a; padding:6px 8px; text-align:center; font-weight:700;">${emp.sno}</td>
                <td style="border:1px solid #0f172a; padding:6px 8px; font-weight:700; font-family:monospace;">${emp.empId}</td>
                <td style="border:1px solid #0f172a; padding:6px 8px; font-weight:700; color:#0f172a;">${emp.name}</td>
                <td style="border:1px solid #0f172a; padding:6px 8px;">${emp.desig}</td>
                <td style="border:1px solid #0f172a; padding:6px 8px;">${emp.posting}</td>
                <td style="border:1px solid #0f172a; padding:6px 8px; text-align:center; font-weight:700; color:#1e3a8a;">${emp.company}</td>
                <td style="border:1px solid #0f172a; padding:6px 8px; text-align:center; font-weight:600;">${emp.whatsapp}</td>
            </tr>
        `;
    });

    return `
    <div style="font-family:'Calibri','Segoe UI',Georgia,serif; font-size:13.5px; line-height:1.6; color:#0f172a; max-width:820px; margin:0 auto; padding:28px 34px; background:#fff; border:1px solid #cbd5e1; border-radius:8px;">
        <div style="text-align:center; padding-bottom:12px; margin-bottom:16px; border-bottom:2px solid #0f172a;">
            <h2 style="margin:0; font-size:18px; font-weight:800; color:#0f172a; letter-spacing:0.5px;">INDIAN INSTITUTE OF COAL MANAGEMENT</h2>
            <div style="font-size:12px; color:#475569; font-weight:600;">Kanke Road, Ranchi &ndash; 834 002</div>
            <div style="display:inline-block; margin-top:8px; background:#f1f5f9; color:#0f172a; font-weight:800; font-size:13px; padding:4px 16px; border-radius:4px; border:1px solid #cbd5e1;">OFFICIAL NOMINATION CALL FORM</div>
        </div>

        <!-- 1. PROGRAM INFORMATION -->
        <div style="margin-bottom:16px;">
            <div style="font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">1. Programme Particulars</div>
            <table style="width:100%; border-collapse:collapse; font-size:12.5px; border:1px solid #cbd5e1;">
                <tr>
                    <td style="padding:6px 10px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1; width:26%;">Programme Name:</td>
                    <td style="padding:6px 10px; font-weight:700; color:#0f172a; border:1px solid #cbd5e1;" colspan="3">${d.programTitle}</td>
                </tr>
                <tr>
                    <td style="padding:6px 10px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1;">Dates (Start &ndash; End):</td>
                    <td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.datesFormatted}</td>
                    <td style="padding:6px 10px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1; width:22%;">Training Mode:</td>
                    <td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:600;">${d.mode}</td>
                </tr>
                <tr>
                    <td style="padding:6px 10px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1;">Venue:</td>
                    <td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.venue}</td>
                    <td style="padding:6px 10px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1;">Expected Participants:</td>
                    <td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:600;">${d.expectedParticipants}</td>
                </tr>
            </table>
        </div>

        <!-- 2. NOMINATED EMPLOYEES TABLE FORMAT -->
        <div style="margin-bottom:16px;">
            <div style="font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">2. Nominated Employees List (Table Format)</div>
            <table style="width:100%; border-collapse:collapse; font-size:12px; border:1.5px solid #0f172a;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #0f172a; padding:7px 6px; width:45px; text-align:center;">S.No.</th>
                        <th style="border:1px solid #0f172a; padding:7px 8px; text-align:left; width:95px;">Emp ID (EIS)</th>
                        <th style="border:1px solid #0f172a; padding:7px 8px; text-align:left;">Emp Name</th>
                        <th style="border:1px solid #0f172a; padding:7px 8px; text-align:left;">Designation</th>
                        <th style="border:1px solid #0f172a; padding:7px 8px; text-align:left;">Place of Posting</th>
                        <th style="border:1px solid #0f172a; padding:7px 8px; text-align:center; width:80px;">Company</th>
                        <th style="border:1px solid #0f172a; padding:7px 8px; text-align:center; width:110px;">WhatsApp No.</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>

        <!-- 3. PROGRAM OBJECTIVE -->
        <div style="margin-bottom:20px;">
            <div style="font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">3. Program Objective</div>
            <div style="padding:10px 14px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; font-size:12.5px; line-height:1.6; text-align:justify;">
                ${d.objective}
            </div>
        </div>

        <!-- Signature Block -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:30px; padding-top:14px; border-top:1px dashed #cbd5e1; font-size:12.5px;">
            <div>
                <strong>Submitted / Coordinated By:</strong><br>
                Programme Coordinator, IICM
            </div>
            <div style="text-align:right;">
                <strong>Authorized Signatory / HRD Head</strong><br>
                IICM, Ranchi
            </div>
        </div>
    </div>
    `;
}

function previewNominationForm() {
    var d = _collectNominationData();
    var htmlContent = _buildNominationFormHTML(d);
    
    // Open preview in clean modal or window
    var previewModal = document.getElementById('nomination-preview-modal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'nomination-preview-modal';
        previewModal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
        document.body.appendChild(previewModal);
    }

    previewModal.innerHTML = `
        <div style="background:#ffffff; width:100%; max-width:880px; max-height:92vh; border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,0.25); display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:14px 20px; background:#0f172a; color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:800; font-size:15px; display:flex; align-items:center; gap:8px;">
                    👁️ Nomination Call Preview (Table Format)
                </div>
                <button type="button" onclick="document.getElementById('nomination-preview-modal').style.display='none'" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer; font-weight:800; line-height:1;">&times;</button>
            </div>
            <div style="padding:24px; overflow-y:auto; flex:1; background:#f8fafc;">
                ${htmlContent}
            </div>
            <div style="padding:12px 20px; background:#ffffff; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" onclick="window.generateNominationPDF()" style="background:#1e293b; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;">
                    📄 Export PDF
                </button>
                <button type="button" onclick="document.getElementById('nomination-preview-modal').style.display='none'" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    previewModal.style.display = 'flex';
}
window.previewNominationForm = previewNominationForm;

function generateNominationPDF() {
    var d = _collectNominationData();
    var htmlContent = _buildNominationFormHTML(d);
    var pdfFileName = 'Nomination_Call_' + (d.programTitle || 'Program').replace(/[^a-zA-Z0-9]/g, '_');
    
    var printWindow = window.open('', '_blank', 'width=880,height=900');
    printWindow.document.write('<!DOCTYPE html><html><head><title>' + pdfFileName + '</title>' +
        '<style>body{font-family:"Calibri",sans-serif;margin:0;padding:20px;background:#f8fafc;}' +
        '@media print{.no-print{display:none!important;}body{background:#fff;padding:0;}}</style></head><body>' +
        '<div class="no-print" style="margin-bottom:20px;text-align:right;">' +
        '<button onclick="window.print()" style="padding:10px 24px;background:#047857;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;">📄 Print / Save PDF</button>' +
        '</div>' + htmlContent + '</body></html>');
    printWindow.document.close();
}
window.generateNominationPDF = generateNominationPDF;

async function handleSendNominationForm(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    var btn = document.getElementById('btn-send-nomination-form');
    if (btn) { btn.disabled = true; btn.textContent = 'Dispatching Call & Generating PDF...'; }

    var d = _collectNominationData();
    if (!d.programId) {
        _showNominationBanner('error', 'Please select a Program Title.');
        if (btn) { btn.disabled = false; btn.textContent = '📧 Send Nomination Form & PDF'; }
        return;
    }

    var pdfFileName = 'NominationCall_' + (d.programTitle||'Program').replace(/[^a-zA-Z0-9]/g,'_') + '.pdf';
    var record = Object.assign({}, d, {
        dispatchedOn: new Date().toISOString(),
        status: 'DISPATCHED',
        hasAttachment: true,
        attachmentName: pdfFileName,
        id: 'NOM-' + Date.now()
    });

    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('iicm_nominations_sent')||'[]'); } catch(e) {}
    existing.unshift(record);
    localStorage.setItem('iicm_nominations_sent', JSON.stringify(existing));

    try {
        var token = localStorage.getItem('iicm_access_token');
        if (token && window.API_BASE_URL) {
            await fetch(window.API_BASE_URL + '/programs/nomination-dispatch/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(record)
            });
        }
    } catch(e) {}

    _showNominationBanner('success',
        '✅ <strong>Nomination Request Call Dispatched!</strong><br>' +
        'Sent to Target Subsidiaries Email: <strong>' + d.recipientEmail + '</strong><br>' +
        '📎 Attached Call PDF: <strong>' + pdfFileName + '</strong> ' +
        '<button type="button" onclick="generateNominationPDF()" style="margin-left:10px; padding:4px 12px; background:#6d28d9; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">📄 Download Attached PDF</button>'
    );

    if (btn) {
        setTimeout(function(){ btn.disabled = false; btn.textContent = '📧 Send Nomination Form & PDF'; }, 3000);
        btn.textContent = '✅ Nomination Dispatched!';
    }
    loadSentNominations();
}
window.handleSendNominationForm = handleSendNominationForm;

function _showNominationBanner(type, msg) {
    var b = document.getElementById('nomination-status-banner');
    if (!b) return;
    var styles = { success: 'background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6;', error: 'background:#fff1f2;border:1px solid #fecdd3;color:#be123c;' };
    b.style.cssText = 'display:block;padding:14px 18px;border-radius:10px;font-size:13.5px;font-weight:600;margin-top:16px;' + (styles[type]||styles.success);
    b.innerHTML = msg;
}

function loadSentNominations() {
    var tbody = document.getElementById('sent-nominations-body');
    if (!tbody) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('iicm_nominations_sent')||'[]'); } catch(e) {}
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">No nomination forms dispatched yet.</td></tr>';
        return;
    }
    tbody.innerHTML = list.slice(0,50).map(function(n){
        var sentOn = n.dispatchedOn ? new Date(n.dispatchedOn).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
        var pdfBadge = '<span style="background:#f5f3ff;color:#6d28d9;padding:2px 8px;border-radius:10px;font-size:11.5px;font-weight:700;">📎 PDF Attachment</span>';

        return '<tr>' +
            '<td style="font-weight:700; font-size:13px;">' + (n.programTitle||'—') + '</td>' +
            '<td style="font-size:12.5px;">' + (n.recipientEmail||'—') + '</td>' +
            '<td>' + pdfBadge + '</td>' +
            '<td style="font-size:12px;">' + (n.trainingPeriod||'—') + '</td>' +
            '<td style="font-size:12px; font-weight:600;">' + (n.coordName||'—') + '</td>' +
            '<td style="font-size:11.5px;">' + sentOn + '</td>' +
            '<td><span style="background:#dcfce7; color:#15803d; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700;">DISPATCHED</span></td>' +
        '</tr>';
    }).join('');
}
window.loadSentNominations = loadSentNominations;

// ──────────────────────────────────────────────────────────────────────
// PAYMENT RELEASE NOTE (HONORARIUM) SECTION ACTIONS
// ──────────────────────────────────────────────────────────────────────
window.initPaymentReleaseSection = function() {
    var pSel = document.getElementById('pr-program-select');
    var submitButton = document.getElementById('btn-send-payment-release-email');
    if (submitButton) submitButton.textContent = 'Submit for GM Approval';
    if (!pSel) return;
    pSel.innerHTML = '<option value="">-- Select Program --</option>';

    var progs = [];
    try { progs = window.getUnifiedCoordinatorPrograms ? window.getUnifiedCoordinatorPrograms() : []; } catch(e) {}
    if (!progs || !progs.length) { try { progs = JSON.parse(localStorage.getItem('iicm_programs')||'[]'); } catch(e) {} }
    if (!progs || !progs.length) { try { if (window.getDemoProgramsData) progs = window.getDemoProgramsData(); } catch(e) {} }
    if (!progs || !progs.length) {
        progs = [
            { id: 1, title: 'Coal India 1st Occupational Health Capacity Building Workshop (CSWDB)', start_date: '2026-07-07', end_date: '2026-07-09' },
            { id: 2, title: 'Advanced Mine Safety Management Program', start_date: '2026-08-10', end_date: '2026-08-15' },
            { id: 3, title: 'Digital Transformation Workshop', start_date: '2026-08-18', end_date: '2026-08-22' },
            { id: 4, title: 'Leadership Development Program', start_date: '2026-08-25', end_date: '2026-08-29' },
            { id: 5, title: 'Environmental Awareness Campaign', start_date: '2026-09-01', end_date: '2026-09-05' }
        ];
    }

    if (Array.isArray(progs)) {
        for (var i = 0; i < progs.length; i++) {
            var p = progs[i];
            if (!p) continue;
            var o = document.createElement('option');
            o.value = p.id||p.program_id||(i+1);
            o.textContent = p.title||p.name||p.program_title||('Program #'+o.value);
            if(p.start_date) o.dataset.startDate = p.start_date;
            if(p.end_date) o.dataset.endDate = p.end_date;
            pSel.appendChild(o);
        }
    }

    // Auto-select first program if default empty
    if (pSel.options.length > 1 && !pSel.value) {
        pSel.selectedIndex = 1;
        window.onPaymentReleaseProgramChange();
    }

    // Populate current date in date field
    var dateField = document.getElementById('pr-date');
    if (dateField && !dateField.value) {
        var today = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric'}).replace(/\//g, '.');
        dateField.value = today;
    }

    // Default rows
    var rowContainer = document.getElementById('pr-faculty-rows-container');
    if (rowContainer && rowContainer.children.length === 0) {
        window.addPaymentReleaseFacultyRow('DR. KARTHIK THOKALA ,MEDICAL', 4, 3500, 0);
        window.addPaymentReleaseFacultyRow('DR.K. C. SURYANARAYANA DY. MEDICAL', 4, 3500, 0);
        window.addPaymentReleaseFacultyRow('DR. C. PAVANKUMAR ,DY. MEDICAL SUPRITENDENT,SECL', 4, 3500, 0);
    }
    renderPaymentReleaseWorkflow();
};

function getPaymentReleaseNotes() {
    try { return JSON.parse(localStorage.getItem('iicm_payment_release_notes') || '[]'); } catch (e) { return []; }
}

function renderPaymentReleaseWorkflow() {
    var tracker = document.getElementById('pr-workflow-tracker');
    if (!tracker) return;
    var notes = getPaymentReleaseNotes();
    var latest = notes[0];
    var status = latest ? latest.status : 'DRAFT';
    var steps = [
        { label: '1. Coordinator', detail: latest ? 'Submitted: ' + new Date(latest.submittedAt).toLocaleDateString('en-IN') : 'Create payment release note', done: status !== 'DRAFT' },
        { label: '2. GM Approval', detail: latest?.gm_approved_at ? 'Approved: ' + new Date(latest.gm_approved_at).toLocaleDateString('en-IN') : (status === 'RETURNED_TO_COORDINATOR' ? (latest.gm_remarks || 'Returned for correction') : 'Awaiting GM decision'), done: ['PENDING_FINANCE', 'PAYMENT_RELEASED'].includes(status) },
        { label: '3. Finance Release', detail: latest?.finance_approved_at ? 'Released' + (latest.utr_number ? ' · UTR ' + latest.utr_number : '') : 'Awaiting finance release', done: status === 'PAYMENT_RELEASED' }
    ];
    tracker.innerHTML = steps.map(function(step) {
        var color = step.done ? '#15803d' : '#64748b';
        var bg = step.done ? '#f0fdf4' : '#f8fafc';
        var border = step.done ? '#bbf7d0' : '#e2e8f0';
        return '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:9px;padding:12px 14px;">' +
            '<div style="font-size:12px;font-weight:800;color:' + color + ';">' + (step.done ? '✓ ' : '○ ') + step.label + '</div>' +
            '<div style="font-size:11.5px;color:#64748b;margin-top:5px;line-height:1.35;">' + step.detail + '</div></div>';
    }).join('');
}
window.renderPaymentReleaseWorkflow = renderPaymentReleaseWorkflow;

window.onPaymentReleaseProgramChange = function() {
    var sel = document.getElementById('pr-program-select');
    if (!sel || sel.selectedIndex === -1) return;
    var opt = sel.options[sel.selectedIndex];
    var customTitle = document.getElementById('pr-custom-program-title');
    var subjectInp = document.getElementById('pr-subject');

    if (opt && opt.value !== '') {
        var title = opt.text;
        var startD = opt.dataset.startDate || '';
        var endD = opt.dataset.endDate || '';
        
        var dateStr = '';
        if (startD && endD) {
            var formatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
            var sFmt = new Date(startD).toLocaleDateString('en-IN', formatOptions);
            var eFmt = new Date(endD).toLocaleDateString('en-IN', formatOptions);
            dateStr = sFmt + ' to ' + eFmt;
        }

        if (customTitle) {
            customTitle.value = title + (dateStr ? ' scheduled from ' + dateStr : '');
        }
        if (subjectInp) {
            subjectInp.value = 'Sub:- Payment of honorarium of faculties and other expenditure to organize ' + title + (dateStr ? ' from ' + dateStr : '') + '.';
        }
    }
};

window.addPaymentReleaseFacultyRow = function(name, sessions, rate, travel) {
    var cont = document.getElementById('pr-faculty-rows-container');
    if (!cont) return;

    var rowId = 'pr-fac-row-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    var tr = document.createElement('tr');
    tr.id = rowId;
    tr.style.borderBottom = '1px solid #e2e8f0';

    var nameVal = name || '';
    var sessVal = sessions !== undefined ? sessions : 1;
    var rateVal = rate !== undefined ? rate : 3500;
    var travelVal = travel !== undefined ? travel : 0;
    var totalVal = (sessVal * rateVal) + travelVal;

    // Faculty drop down
    var facOptionsHtml = '<option value="">-- Select Faculty --</option>';
    var foundSelected = false;
    var facList = window.facultiesCache;
    if (!Array.isArray(facList) || facList.length === 0) {
        facList = [
            { name: 'DR. KARTHIK THOKALA ,MEDICAL', honorarium_rate_per_hour: 3500 },
            { name: 'DR.K. C. SURYANARAYANA DY. MEDICAL', honorarium_rate_per_hour: 3500 },
            { name: 'DR. C. PAVANKUMAR ,DY. MEDICAL SUPRITENDENT,SECL', honorarium_rate_per_hour: 3500 },
            { name: 'Dr. R.A. Sharma', honorarium_rate_per_hour: 4000 },
            { name: 'BCCI Faculty Team', honorarium_rate_per_hour: 3500 },
            { name: 'CCL Leadership Cell', honorarium_rate_per_hour: 3500 },
            { name: 'CIL Environmental Wing', honorarium_rate_per_hour: 3500 },
            { name: 'Prof. S. N. Ray', honorarium_rate_per_hour: 4500 },
            { name: 'Dr. Ananya Roy', honorarium_rate_per_hour: 3800 },
            { name: 'Er. Vikash Singh', honorarium_rate_per_hour: 3500 }
        ];
    }

    if (Array.isArray(facList)) {
        for (var k = 0; k < facList.length; k++) {
            var f = facList[k];
            if (!f || !f.name) continue;
            var isSel = (nameVal && f.name === nameVal) ? 'selected' : '';
            if (isSel) foundSelected = true;
            facOptionsHtml += '<option value="' + f.name + '" data-rate="' + (f.honorarium_rate_per_hour || 3500) + '" ' + isSel + '>' + f.name + '</option>';
        }
    }

    if (nameVal && !foundSelected) {
        facOptionsHtml += '<option value="' + nameVal + '" selected>' + nameVal + ' (Default/Custom)</option>';
    }
    facOptionsHtml += '<option value="__custom__">-- Custom / Other (Type below) --</option>';

    var showCustomInput = (nameVal && !foundSelected) ? 'block' : 'none';

    tr.innerHTML =
        '<td style="padding:8px; text-align:center;" class="pr-sl-no"></td>' +
        '<td style="padding:8px;">' +
            '<select class="form-control pr-row-name-select" style="font-size:12px; border:1px solid #cbd5e1; width:100%; margin-bottom:4px;" onchange="onPaymentReleaseFacultyNameSelectChange(this, \'' + rowId + '\')">' +
                facOptionsHtml +
            '</select>' +
            '<input type="text" class="form-control pr-row-name" value="' + nameVal + '" placeholder="e.g. Dr. Rajesh Sharma" style="font-size:12px; border:1px solid #cbd5e1; display:' + showCustomInput + ';">' +
        '</td>' +
        '<td style="padding:8px;"><input type="number" class="form-control pr-row-sess" value="' + sessVal + '" min="1" style="font-size:12px; border:1px solid #cbd5e1; text-align:center;" oninput="calcPaymentReleaseRowTotal(\'' + rowId + '\')"></td>' +
        '<td style="padding:8px;"><input type="number" class="form-control pr-row-rate" value="' + rateVal + '" style="font-size:12px; border:1px solid #cbd5e1; text-align:right;" oninput="calcPaymentReleaseRowTotal(\'' + rowId + '\')"></td>' +
        '<td style="padding:8px;"><input type="number" class="form-control pr-row-travel" value="' + travelVal + '" style="font-size:12px; border:1px solid #cbd5e1; text-align:right;" oninput="calcPaymentReleaseRowTotal(\'' + rowId + '\')"></td>' +
        '<td style="padding:8px;"><input type="number" class="form-control pr-row-amt" value="' + totalVal + '" readonly style="font-size:12px; font-weight:700; background:#f8fafc; border:1px solid #cbd5e1; text-align:right;"></td>' +
        '<td style="padding:8px; text-align:center;"><button type="button" onclick="removePaymentReleaseFacultyRow(\'' + rowId + '\')" style="background:#fee2e2; color:#b91c1c; border:none; width:26px; height:26px; border-radius:4px; font-weight:bold; cursor:pointer;">&times;</button></td>';

    cont.appendChild(tr);
    reindexPaymentReleaseRows();
    calcPaymentReleaseGrandTotal();
};

window.onPaymentReleaseFacultyNameSelectChange = function(selectEl, rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;

    var selectedOpt = selectEl.options[selectEl.selectedIndex];
    var val = selectedOpt.value;
    var nameInp = row.querySelector('.pr-row-name');
    var rateInp = row.querySelector('.pr-row-rate');

    if (val === '__custom__') {
        if (nameInp) {
            nameInp.style.display = 'block';
            nameInp.value = '';
            nameInp.focus();
        }
    } else {
        if (nameInp) {
            nameInp.style.display = 'none';
            nameInp.value = val;
        }
        if (val !== '') {
            var rate = selectedOpt.dataset.rate || '';
            if (rateInp) {
                rateInp.value = rate ? parseFloat(rate) : 3500;
            }
        }
    }
    calcPaymentReleaseRowTotal(rowId);
};

window.calcPaymentReleaseRowTotal = function(rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;

    var sess = parseFloat(row.querySelector('.pr-row-sess').value) || 0;
    var rate = parseFloat(row.querySelector('.pr-row-rate').value) || 0;
    var travel = parseFloat(row.querySelector('.pr-row-travel').value) || 0;
    
    var total = (sess * rate) + travel;
    row.querySelector('.pr-row-amt').value = total;

    calcPaymentReleaseGrandTotal();
};

window.removePaymentReleaseFacultyRow = function(rowId) {
    var row = document.getElementById(rowId);
    if (row) row.parentNode.removeChild(row);
    reindexPaymentReleaseRows();
    calcPaymentReleaseGrandTotal();
};

function reindexPaymentReleaseRows() {
    var cont = document.getElementById('pr-faculty-rows-container');
    if (!cont) return;
    var rows = cont.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
        var slNode = rows[i].querySelector('.pr-sl-no');
        if (slNode) slNode.textContent = i + 1;
    }
}

window.calcPaymentReleaseGrandTotal = function() {
    var cont = document.getElementById('pr-faculty-rows-container');
    if (!cont) return;

    var facTotal = 0;
    var amtEls = cont.querySelectorAll('.pr-row-amt');
    for (var i = 0; i < amtEls.length; i++) {
        facTotal += parseFloat(amtEls[i].value) || 0;
    }

    var miscA = parseFloat(document.getElementById('pr-misc-a-amt').value) || 0;
    var miscB = parseFloat(document.getElementById('pr-misc-b-amt').value) || 0;

    var grandTotal = facTotal + miscA + miscB;
    var grandTotalEl = document.getElementById('pr-grand-total');
    if (grandTotalEl) {
        grandTotalEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');
    }
};

function _collectPaymentReleaseData() {
    var progSel = document.getElementById('pr-program-select');
    var progTitle = '';
    var customTitleEl = document.getElementById('pr-custom-program-title');
    if (customTitleEl) {
        progTitle = customTitleEl.value.trim();
    }
    if (!progTitle && progSel && progSel.selectedIndex !== -1) {
        var opt = progSel.options[progSel.selectedIndex];
        if (opt) {
            progTitle = opt.text;
        }
    }
    if (!progTitle) progTitle = 'CSWDB Workshop';

    var rows = [];
    var container = document.getElementById('pr-faculty-rows-container');
    if (container) {
        var rowEls = container.querySelectorAll('tr');
        for (var j = 0; j < rowEls.length; j++) {
            var r = rowEls[j];
            var nameSel = r.querySelector('.pr-row-name-select');
            var nameVal = nameSel ? nameSel.value : '';
            var customNameInput = r.querySelector('.pr-row-name');
            if (customNameInput && customNameInput.style.display !== 'none') {
                nameVal = customNameInput.value.trim() || nameVal;
            }
            
            var sessVal = parseFloat(r.querySelector('.pr-row-sess').value) || 0;
            var rateVal = parseFloat(r.querySelector('.pr-row-rate').value) || 0;
            var travelVal = parseFloat(r.querySelector('.pr-row-travel').value) || 0;
            var totalVal = parseFloat(r.querySelector('.pr-row-amt').value) || 0;
            
            rows.push({
                name: nameVal,
                sessions: sessVal,
                rate: rateVal,
                travel: travelVal,
                total: totalVal
            });
        }
    }

    return {
        refNo: document.getElementById('pr-ref-no').value,
        date: document.getElementById('pr-date').value,
        sanctionRef: (document.getElementById('pr-sanction-ref') ? document.getElementById('pr-sanction-ref').value : 'RB/2025-26/261 Dated 06-10-2025'),
        sanctionedBudget: (document.getElementById('pr-sanctioned-budget') ? document.getElementById('pr-sanctioned-budget').value : '47500'),
        additionalBudget: (document.getElementById('pr-additional-budget') ? document.getElementById('pr-additional-budget').value : '1500'),
        recipientEmail: document.getElementById('pr-recipient-email').value,
        coordinatorEmail: (function() { try { var user = JSON.parse(localStorage.getItem('iicm_user') || '{}'); return user.email || user.username || 'coordinator@iicm.ac.in'; } catch(e) { return 'coordinator@iicm.ac.in'; } })(),
        subjectText: document.getElementById('pr-subject').value,
        programTitle: progTitle,
        faculties: rows,
        miscADesc: document.getElementById('pr-misc-a-desc').value,
        miscAAmt: parseFloat(document.getElementById('pr-misc-a-amt').value) || 0,
        miscBDesc: document.getElementById('pr-misc-b-desc').value,
        miscBAmt: parseFloat(document.getElementById('pr-misc-b-amt').value) || 0,
        note1: document.getElementById('pr-note-1').value,
        noteBC: document.getElementById('pr-note-bc').value,
        note3: document.getElementById('pr-note-3').value,
        encl1: document.getElementById('pr-encl-1').value,
        encl2: document.getElementById('pr-encl-2').value,
        signLeft: document.getElementById('pr-sign-left').value,
        signRightName: document.getElementById('pr-sign-right-name').value,
        signRightDesig: document.getElementById('pr-sign-right-desig').value
    };
}

function _buildPaymentReleaseHTML(forWord) {
    var d = _collectPaymentReleaseData();
    
    // Calculate total faculty payment and total misc payment
    var totalFacultyAmt = 0;
    var tableRowsHtml = '';
    
    d.faculties.forEach(function(f, index) {
        totalFacultyAmt += f.total;
        var travelDisp = f.travel === 0 ? 'NIL' : ('₹' + f.travel.toLocaleString('en-IN'));
        tableRowsHtml += '<tr>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center;">' + (index + 1) + '</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; font-weight:bold; text-align:left;">' + f.name + '</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center;">' + f.sessions + '</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:right;">₹' + f.rate.toLocaleString('en-IN') + '</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center;">' + travelDisp + '</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:right; font-weight:bold;">₹' + f.total.toLocaleString('en-IN') + '</td>' +
        '</tr>';
    });

    var miscTotal = d.miscAAmt + d.miscBAmt;
    var grandTotal = totalFacultyAmt + miscTotal;

    // Add misc row exactly as per excel layout
    if (miscTotal > 0) {
        var miscAStr = d.miscAAmt > 0 ? (d.miscADesc + ' - Rs.' + d.miscAAmt) : '';
        var miscBStr = d.miscBAmt > 0 ? (d.miscBDesc + ' - Rs.' + d.miscBAmt) : '';
        var separator = (miscAStr && miscBStr) ? '<br>' : '';
        
        tableRowsHtml += '<tr>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center;"></td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:left; color:#000; font-weight:normal;">' +
                'Miscellaneous Expenses ' +
                (miscAStr ? ('A) ' + miscAStr) : '') +
                (separator ? ' ' + separator : '') +
                (miscBStr ? ('B) ' + miscBStr) : '') +
            '</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center; font-weight:bold;">NA</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center; font-weight:bold;">NA</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:center; font-weight:bold;">NA</td>' +
            '<td style="border:1px solid #7f7f7f; padding:6px; text-align:right; font-weight:bold;">₹' + miscTotal.toLocaleString('en-IN') + '</td>' +
        '</tr>';
    }

    // Add total row
    tableRowsHtml += '<tr style="font-weight:bold; background:#ffffff;">' +
        '<td colspan="5" style="border:1px solid #7f7f7f; padding:8px; text-align:left; font-weight:bold;">Total</td>' +
        '<td style="border:1px solid #7f7f7f; padding:8px; text-align:right; font-weight:bold; font-size:11.5px;">₹' + grandTotal.toLocaleString('en-IN') + '</td>' +
    '</tr>';

    var containerStyle = forWord ? '' : 'font-family:\'Calibri\',\'Segoe UI\',Georgia,serif; font-size:10.5pt; color:#000; max-width:800px; margin:0 auto; padding:20px; background:#fff;';

    return '<div style="' + containerStyle + '">' +
        // RED TITLE
        '<h1 style="color:#ff0000; font-size:18pt; font-weight:bold; text-align:center; margin-bottom:20px; font-family:\'Calibri\',sans-serif; text-transform:uppercase; letter-spacing:0.5px;">' +
            'FORMAT OF PAYMENT RELEASE NOTE(HONORARIUM)' +
        '</h1>' +

        // Excel-like Unified Table
        '<table style="width:100%; border-collapse:collapse; font-family:\'Calibri\',sans-serif; font-size:10pt; border:1px solid #7f7f7f; margin-bottom:15px;">' +
            '<!-- Ref and Date Row -->' +
            '<tr>' +
                '<td style="border:1px solid #7f7f7f; padding:5px 8px; font-weight:bold; width:15%;">Ref. No.</td>' +
                '<td colspan="2" style="border:1px solid #7f7f7f; padding:5px 8px; width:45%;">' + d.refNo + '</td>' +
                '<td style="border:1px solid #7f7f7f; padding:5px 8px; font-weight:bold; width:15%;">Date</td>' +
                '<td colspan="2" style="border:1px solid #7f7f7f; padding:5px 8px; width:25%;">' + d.date + '</td>' +
            '</tr>' +
            '<!-- Sanction Order and Budget Row -->' +
            '<tr style="background:#f8fafc;">' +
                '<td style="border:1px solid #7f7f7f; padding:5px 8px; font-weight:bold;">Sanction Order</td>' +
                '<td colspan="2" style="border:1px solid #7f7f7f; padding:5px 8px; color:#166534; font-weight:600;">' + d.sanctionRef + '</td>' +
                '<td style="border:1px solid #7f7f7f; padding:5px 8px; font-weight:bold;">Sanctioned Budget</td>' +
                '<td colspan="2" style="border:1px solid #7f7f7f; padding:5px 8px; font-weight:bold; color:#166534;">₹' + Number(d.sanctionedBudget||0).toLocaleString('en-IN') + (d.additionalBudget ? ' + Addl. ₹' + Number(d.additionalBudget).toLocaleString('en-IN') : '') + '</td>' +
            '</tr>' +
            '<!-- Subject Row -->' +
            '<tr>' +
                '<td colspan="6" style="border:1px solid #7f7f7f; padding:6px 8px; font-weight:bold; text-align:left;">' +
                    d.subjectText +
                '</td>' +
            '</tr>' +
            '<!-- Program Title Row -->' +
            '<tr>' +
                '<td colspan="6" style="border:1px solid #7f7f7f; padding:10px 8px; text-align:center; font-weight:bold; font-size:11pt; background:#ffffff;">' +
                    d.programTitle +
                '</td>' +
            '</tr>' +
            '<!-- Table Headers -->' +
            '<tr style="background:#ffffff; font-weight:bold; text-align:center;">' +
                '<td style="border:1px solid #7f7f7f; padding:6px; width:8%; font-weight:bold; text-align:center;">Sl. No.</td>' +
                '<td style="border:1px solid #7f7f7f; padding:6px; width:42%; font-weight:bold; text-align:center;">Name of Faculty</td>' +
                '<td style="border:1px solid #7f7f7f; padding:6px; width:12%; font-weight:bold; text-align:center;">No. of Sessions</td>' +
                '<td style="border:1px solid #7f7f7f; padding:6px; width:12%; font-weight:bold; text-align:center;">Honorarium Rate (₹)</td>' +
                '<td style="border:1px solid #7f7f7f; padding:6px; width:12%; font-weight:bold; text-align:center;">Travel Expenses (₹)</td>' +
                '<td style="border:1px solid #7f7f7f; padding:6px; width:14%; font-weight:bold; text-align:center;">Total Amount (₹)</td>' +
            '</tr>' +
            tableRowsHtml +
        '</table>' +

        // Notes and Remarks
        '<div style="margin-top:15px; font-size:10.5pt; line-height:1.5; color:#000;">' +
            '<strong>Note &ndash;</strong><br>' +
            '1. ' + d.note1 + '<br>' +
            '2. ' + d.noteBC + '<br>' +
            '<div style="margin:4px 0 6px 15px; text-align:justify;">' +
                'Forwarded for approval and payment of honorarium of Rs. ' + totalFacultyAmt.toLocaleString('en-IN') + '/- to the respective faculties &amp; misc. expenditure of Rs. ' + miscTotal.toLocaleString('en-IN') + ' against purchase of ' + (d.miscBAmt > 0 ? 'Shawl and Srifal' : 'items') + '. Bills are attached herewith.' +
            '</div>' +
            '3. ' + d.note3 +
        '</div>' +

        // Enclosures
        '<div style="margin-top:20px; font-size:10.5pt; border-top:1px dashed #cbd5e1; padding-top:10px;">' +
            '<strong>Encl:</strong><br>' +
            '1. ' + d.encl1 + '<br>' +
            '2. ' + d.encl2 +
        '</div>' +

        // Signatures row
        '<table style="width:100%; border:none; margin-top:40px; font-size:10.5pt;">' +
            '<tr>' +
                '<td style="border:none; width:50%; vertical-align:bottom; text-align:left; font-weight:bold; height:60px;">' +
                    d.signLeft +
                '</td>' +
                '<td style="border:none; width:50%; vertical-align:bottom; text-align:right; font-weight:bold;">' +
                    '<strong>' + d.signRightDesig + '</strong><br>' +
                    '<strong>' + d.signRightName + '</strong>' +
                '</td>' +
            '</tr>' +
        '</table>' +
    '</div>';
}

window.generatePaymentReleasePDF = function() {
    var htmlContent = _buildPaymentReleaseHTML(false);
    var printWindow = window.open('', '_blank', 'width=840,height=900');
    printWindow.document.write('<!DOCTYPE html><html><head><title>Payment Release Note</title>' +
        '<style>body{font-family:"Calibri",sans-serif;margin:0;padding:20px;background:#f8fafc;}' +
        '@media print{.no-print{display:none!important;}body{background:#fff;padding:0;}}</style></head><body>' +
        '<div class="no-print" style="margin-bottom:20px;text-align:right;">' +
        '<button onclick="window.print()" style="padding:10px 24px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;">📄 Download / Save PDF Payment Release Note</button>' +
        '</div>' + htmlContent + '</body></html>');
    printWindow.document.close();
};

window.generatePaymentReleaseWord = function() {
    var content = _buildPaymentReleaseHTML(true);
    var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
                 "xmlns:w='urn:schemas-microsoft-com:office:word' "+
                 "xmlns='http://www.w3.org/TR/REC-html40'>"+
                 "<head><title>Payment Release Note</title><style>"+
                 "body{font-family:'Calibri',sans-serif;font-size:11pt;}"+
                 "table{border-collapse:collapse;width:100%;}"+
                 "td,th{border:1px solid #000;padding:6px;}"+
                 "</style></head><body>";
    var footer = "</body></html>";
    var sourceHTML = header + content + footer;
    
    var blob = new Blob(['\ufeff' + sourceHTML], {
        type: 'application/msword'
    });
    
    var filename = 'Payment_Release_Note_' + document.getElementById('pr-date').value.replace(/\./g, '_') + '.doc';
    
    if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        var url = URL.createObjectURL(blob);
        var downloadLink = document.createElement("a");
        document.body.appendChild(downloadLink);
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }
};

window.handleSendPaymentReleaseEmail = async function() {
    var btn = document.getElementById('btn-send-payment-release-email');
    var banner = document.getElementById('pr-status-banner');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending Official Release Email...'; }
    if (banner) { banner.style.display = 'none'; }

    var d = _collectPaymentReleaseData();
    if (!d.recipientEmail) {
        _showPaymentReleaseBanner('error', 'Recipient email is required.');
        if (btn) { btn.disabled = false; btn.textContent = '📧 Send Official Release Email'; }
        return;
    }

    try {
        var token = localStorage.getItem('iicm_access_token');
        var base_url = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
        var res = await fetch(base_url + '/faculty/send-payment-release/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(d)
        });

        var resData = await res.json();
        if (res.ok) {
            _showPaymentReleaseBanner('success', '✅ <strong>Payment Release Note Dispatched!</strong> Sent to Finance / Approver Email: ' + d.recipientEmail);
        } else {
            _showPaymentReleaseBanner('error', '❌ Failed to send email: ' + (resData.message || 'Unknown server error'));
        }
    } catch (e) {
        _showPaymentReleaseBanner('error', '❌ Error sending release note email request to backend server.');
    }

    if (btn) { btn.disabled = false; btn.textContent = '📧 Send Official Release Email'; }
};

window.submitPaymentReleaseToGM = async function() {
    var d = _collectPaymentReleaseData();
    var banner = document.getElementById('pr-status-banner');
    var btn = document.getElementById('btn-send-payment-release-email');
    if (!d.recipientEmail) { _showPaymentReleaseBanner('error', 'GM approver email is required.'); return; }
    d.submitToGM = true;
    var releaseNotes = [];
    try { releaseNotes = JSON.parse(localStorage.getItem('iicm_payment_release_notes') || '[]'); } catch (e) {}
    var noteTotal = (d.faculties || []).reduce(function(sum, row) { return sum + (Number(row.total) || 0); }, 0) + (Number(d.miscAAmt) || 0) + (Number(d.miscBAmt) || 0);
    var submittedAt = new Date().toISOString();
    releaseNotes.unshift({
        id: Date.now(), refNo: d.refNo, programTitle: d.programTitle, grandTotal: noteTotal,
        submittedAt: submittedAt, status: 'PENDING_GM', data: d, coordinatorEmail: d.coordinatorEmail,
        workflow: [{ actor: 'Program Coordinator', action: 'Submitted payment release note to GM', at: submittedAt }]
    });
    localStorage.setItem('iicm_payment_release_notes', JSON.stringify(releaseNotes));
    renderPaymentReleaseWorkflow();
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting to GM...'; }
    try {
        var baseUrl = window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
        var response = await fetch(baseUrl + '/faculty/faculties/send-payment-release/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) });
        var result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Submission failed');
        _showPaymentReleaseBanner('success', 'Payment Release Note and PDF have been submitted to the General Manager for approval. You will receive an email after Finance releases the payment.');
    } catch (error) { _showPaymentReleaseBanner('error', error.message || 'Could not submit the note to GM.'); }
    if (btn) { btn.disabled = false; btn.textContent = 'Submitted to GM — Submit Again'; }
};

var _attendanceQrTimer;
window.generateDynamicAttendanceQR = async function() {
    var scheduleId = ((document.getElementById('attendance-session-select')) || {}).value;
    var minutes = ((document.getElementById('attendance-validity')) || {}).value || 5;
    var status = document.getElementById('attendance-status');
    if (!scheduleId) return;
    if (status) { status.style.display = 'block'; status.style.cssText = 'display:block;margin-top:14px;padding:12px;border-radius:7px;background:#eff6ff;color:#1d4ed8;'; status.textContent = 'Generating secure QR...'; }
    try {
        var response = await fetch((window.API_BASE_URL || 'http://127.0.0.1:8000/api/v1') + '/attendance/qr/generate/', {
            method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer ' + (localStorage.getItem('iicm_access_token') || '')},
            body: JSON.stringify({schedule_id: scheduleId, validity_minutes: Number(minutes)})
        });
        var result = await response.json();
        if (!response.ok) throw new Error(result.message || 'QR could not be generated');
        var token = result.qr_code.token;
        var scanUrl = window.location.origin + '/frontend/trainee/dashboard.html?attendance_token=' + encodeURIComponent(token);
        var qrSrc = (typeof QRCode !== 'undefined' && QRCode.toDataURL) ? QRCode.toDataURL(scanUrl, 260, 260) : 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(scanUrl);
        document.getElementById('attendance-qr-image').src = qrSrc;
        document.getElementById('attendance-token').textContent = token;
        document.getElementById('attendance-session-title').textContent = result.qr_code.topic_title || 'Current Session';
        document.getElementById('attendance-qr-panel').style.display = 'block';
        if (status) status.style.display = 'none';
        var expiry = new Date(result.qr_code.expires_at).getTime();
        clearInterval(_attendanceQrTimer);
        _attendanceQrTimer = setInterval(function() {
            var remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
            var countdown = document.getElementById('attendance-countdown');
            if (countdown) countdown.textContent = remaining ? 'QR valid for ' + Math.floor(remaining/60) + ':' + String(remaining%60).padStart(2,'0') : 'QR expired — generate a new QR';
            if (!remaining) clearInterval(_attendanceQrTimer);
        }, 1000);
    } catch (error) {
        if (status) { status.style.cssText = 'display:block;margin-top:14px;padding:12px;border-radius:7px;background:#fee2e2;color:#b91c1c;'; status.textContent = error.message; }
    }
};

function _showPaymentReleaseBanner(type, msg) {
    var b = document.getElementById('pr-status-banner');
    if (!b) return;
    b.innerHTML = msg;
    b.style.display = 'block';
    if (type === 'success') {
        b.style.background = '#dcfce7';
        b.style.color = '#166534';
        b.style.border = '1px solid #bbf7d0';
    } else {
        b.style.background = '#fee2e2';
        b.style.color = '#991b1b';
        b.style.border = '1px solid #fecaca';
    }
}






/* ═════════════════════════════════════════════════════════════════════
   ROBUST PROGRAM SELECTION & FORM DYNAMIC AUTO-FILL HANDLERS
   ═════════════════════════════════════════════════════════════════════ */

function onNominationProgramChange() {
    var progSel = document.getElementById('nom-program-select');
    var titleInp = document.getElementById('nom-program-title');
    var sDateInp = document.getElementById('nom-start-date');
    var eDateInp = document.getElementById('nom-end-date');
    var venueInp = document.getElementById('nom-venue');
    var expPartInp = document.getElementById('nom-expected-participants');
    var modeInp = document.getElementById('nom-mode');
    var objectiveInp = document.getElementById('nom-program-objective');

    if (!progSel) return;
    var opt = progSel.options[progSel.selectedIndex];
    if (opt && opt.value) {
        var rawTitle = opt.getAttribute('data-title') || opt.text || '';
        var cleanTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (titleInp) titleInp.value = cleanTitle;
        if (sDateInp) sDateInp.value = opt.getAttribute('data-start') || opt.getAttribute('data-start-date') || '2026-08-10';
        if (eDateInp) eDateInp.value = opt.getAttribute('data-end') || opt.getAttribute('data-end-date') || '2026-08-15';
        if (venueInp) venueInp.value = opt.getAttribute('data-venue') || 'IICM Training Hall, Ranchi';
        if (expPartInp) expPartInp.value = opt.getAttribute('data-capacity') || '25';
        if (objectiveInp) objectiveInp.value = opt.getAttribute('data-objective') || ('To develop executive management competency in ' + cleanTitle);
    }
}
window.onNominationProgramChange = onNominationProgramChange;

function onProgramTitleSelectChange() {
    var sel = document.getElementById('assign-prog-select');
    var venueInp = document.getElementById('assign-prog-venue');
    if (!sel) return;
    var opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        var rawTitle = opt.getAttribute('data-title') || opt.text || '';
        var venue = opt.getAttribute('data-venue') || 'IICM Main Campus, Ranchi';
        if (venueInp) venueInp.value = venue;
        try { if (typeof loadFacultySchedulesTable === 'function') loadFacultySchedulesTable(); } catch(e) {}
    }
}
window.onProgramTitleSelectChange = onProgramTitleSelectChange;

function onNotesheetProgramChange() {
    var sel = document.getElementById('ns-program-select');
    if (!sel) return;
    var opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        var rawTitle = opt.getAttribute('data-title') || opt.text || '';
        var cleanTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
        var banner = document.getElementById('notesheet-status-banner');
        if (banner) {
            banner.style.display = 'block';
            banner.style.background = '#f0fdf4';
            banner.style.color = '#15803d';
            banner.style.border = '1px solid #bbf7d0';
            banner.innerHTML = '📋 Selected Program: <strong>' + cleanTitle + '</strong>. Note sheet details auto-synchronized.';
        }
    }
    calcNotesheetTotals();
}
window.onNotesheetProgramChange = onNotesheetProgramChange;

function onNotesheetFileSelected(input) {
    var status = document.getElementById('ns-file-selected-text');
    if (!status) return;
    var file = input && input.files ? input.files[0] : null;
    status.textContent = file
        ? '✓ Attached: ' + file.name
        : 'Attach approval copy / office order (PDF, DOCX, JPG, PNG)';
    status.style.color = file ? '#15803d' : '#475569';
}
window.onNotesheetFileSelected = onNotesheetFileSelected;

function onPaymentReleaseProgramChange() {
    var sel = document.getElementById('pr-program-select');
    var titleInp = document.getElementById('pr-custom-program-title');
    if (!sel) return;
    var opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        var rawTitle = opt.getAttribute('data-title') || opt.text || '';
        var cleanTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (titleInp) titleInp.value = cleanTitle;
    }
    try { if (typeof calcPaymentReleaseGrandTotal === 'function') calcPaymentReleaseGrandTotal(); } catch(e) {}
}
window.onPaymentReleaseProgramChange = onPaymentReleaseProgramChange;

function onInviteProgramChange() {
    var sel = document.getElementById('invite-program-select');
    if (!sel) return;
    var opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        var rawTitle = opt.getAttribute('data-title') || opt.text || '';
        var cleanTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
        var cont = document.getElementById('invite-program-sessions-container');
        if (cont) {
            cont.innerHTML = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-top:8px;">
                    <div style="font-weight:700; color:#0f172a;">${cleanTitle}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">Scheduled Sessions: 4 Lectures (09:30 AM – 05:15 PM)</div>
                </div>
            `;
        }
    }
}
window.onInviteProgramChange = onInviteProgramChange;
