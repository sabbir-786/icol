/**
 * IICM Executive Feedback Form Logic
 * Exactly matching Google Form:
 * "Feedback Form of Programme on “Artificial Intelligence and Digital Transformation” Duration 17 - 19 June 2026."
 */

// Total required fields (Q1, Q2, Q3, Q5, Q7, Q8, Q11, Q12, Q15, Q16, Q17, Q18, Q21, Q22, Q23, Q24, Q27[5 rows], Q30[2 rows], Q31)
const REQUIRED_FIELD_GROUPS = [
    'q1_participant_name',
    'q2_eis_no',
    'q3_subsidiary',
    'q5_prog_design',
    'q7_piyush_expectations',
    'q8_piyush_digital_journey',
    'q11_manish_ai_ml',
    'q12_manish_genai_diff',
    'q15_shyam_llm',
    'q16_shyam_prompt',
    'q17_shyam_productivity',
    'q18_shyam_finance',
    'q21_kishore_governance',
    'q22_kishore_cyber',
    'q23_kishore_mining',
    'q24_kishore_roadmap',
    'q27_av_aids',
    'q27_library',
    'q27_hostel',
    'q27_dining',
    'q27_recreation',
    'q30_comm_skill',
    'q30_overall_coord',
    'q31_overall_prog'
];

document.addEventListener('DOMContentLoaded', () => {
    initRatingPills();
    initUrlParams();
    initScrollSpy();
    updateProgress();

    // Listen for form inputs to update progress bar dynamically
    const form = document.getElementById('google-feedback-form');
    if (form) {
        form.addEventListener('change', updateProgress);
        form.addEventListener('input', updateProgress);
    }
});

// Setup clickable styled radio chips
function initRatingPills() {
    const labels = document.querySelectorAll('.rating-pill-label');
    labels.forEach(label => {
        const input = label.querySelector('input[type="radio"]');
        if (!input) return;

        label.addEventListener('click', () => {
            const groupName = input.name;
            const sameGroupLabels = document.querySelectorAll(`input[name="${groupName}"]`);
            sameGroupLabels.forEach(otherInput => {
                const parent = otherInput.closest('.rating-pill-label');
                if (parent) parent.classList.remove('active');
            });

            input.checked = true;
            label.classList.add('active');

            // Remove error highlight on parent question item
            const qItem = label.closest('.question-item');
            if (qItem) qItem.classList.remove('has-error');

            updateProgress();
        });
    });

    // Matrix radio buttons error clear
    const matrixRadios = document.querySelectorAll('.matrix-radio-btn');
    matrixRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const qItem = radio.closest('.question-item');
            if (qItem) qItem.classList.remove('has-error');
            updateProgress();
        });
    });

    // Text & select inputs error clear
    const standardInputs = document.querySelectorAll('.input-text, .input-select, .input-textarea');
    standardInputs.forEach(input => {
        input.addEventListener('input', () => {
            const qItem = input.closest('.question-item');
            if (qItem && input.value.trim() !== '') {
                qItem.classList.remove('has-error');
            }
            updateProgress();
        });
    });
}

// Prefill from URL query params (useful when linked from Trainee or Coordinator portal)
function initUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || params.get('participant');
    const eis = params.get('eis') || params.get('eis_no');
    const subsidiary = params.get('subsidiary');
    const prog = params.get('program') || params.get('title');

    if (name) {
        const el = document.getElementById('q1_participant_name');
        if (el) el.value = name;
    }
    if (eis) {
        const el = document.getElementById('q2_eis_no');
        if (el) el.value = eis;
    }
    if (subsidiary) {
        const el = document.getElementById('q3_subsidiary');
        if (el) {
            for (let opt of el.options) {
                if (opt.value.toLowerCase() === subsidiary.toLowerCase()) {
                    el.value = opt.value;
                    break;
                }
            }
        }
    }
    if (prog) {
        const progTitleEl = document.getElementById('form-program-title');
        if (progTitleEl && prog.trim() !== '') {
            progTitleEl.textContent = `Feedback Form of Programme on “${prog}”`;
        }
    }
}

// Calculate and update form completion progress
function updateProgress() {
    let answered = 0;
    const total = REQUIRED_FIELD_GROUPS.length;

    REQUIRED_FIELD_GROUPS.forEach(fieldName => {
        const textEl = document.getElementById(fieldName);
        if (textEl && (textEl.tagName === 'INPUT' || textEl.tagName === 'SELECT')) {
            if (textEl.value.trim() !== '') answered++;
            return;
        }

        const checkedRadio = document.querySelector(`input[name="${fieldName}"]:checked`);
        if (checkedRadio) answered++;
    });

    const percent = Math.round((answered / total) * 100);
    const fillEl = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');

    if (fillEl) fillEl.style.width = `${percent}%`;
    if (textEl) textEl.textContent = `${answered} / ${total} Required Answered (${percent}%)`;
}

// Active section pill scrollspy
function initScrollSpy() {
    const sections = document.querySelectorAll('.form-section-card');
    const navPills = document.querySelectorAll('.form-nav-pill');

    window.addEventListener('scroll', () => {
        let currentSec = '';
        sections.forEach(sec => {
            const top = sec.offsetTop - 120;
            if (window.scrollY >= top) {
                currentSec = sec.getAttribute('id');
            }
        });

        navPills.forEach(pill => {
            pill.classList.remove('active');
            if (pill.getAttribute('href') === `#${currentSec}`) {
                pill.classList.add('active');
            }
        });
    });
}

// Validation & Submission
async function handleFeedbackSubmit(event) {
    event.preventDefault();

    let firstErrorEl = null;
    let isValid = true;

    // Validate standard text/select required inputs
    const reqTextInputs = ['q1_participant_name', 'q2_eis_no', 'q3_subsidiary'];
    reqTextInputs.forEach(id => {
        const el = document.getElementById(id);
        const qItem = el ? el.closest('.question-item') : null;
        if (el && el.value.trim() === '') {
            isValid = false;
            if (qItem) qItem.classList.add('has-error');
            if (!firstErrorEl) firstErrorEl = qItem || el;
        } else if (qItem) {
            qItem.classList.remove('has-error');
        }
    });

    // Validate single-choice radio groups
    const singleRadioGroups = [
        'q5_prog_design',
        'q7_piyush_expectations',
        'q8_piyush_digital_journey',
        'q11_manish_ai_ml',
        'q12_manish_genai_diff',
        'q15_shyam_llm',
        'q16_shyam_prompt',
        'q17_shyam_productivity',
        'q18_shyam_finance',
        'q21_kishore_governance',
        'q22_kishore_cyber',
        'q23_kishore_mining',
        'q24_kishore_roadmap',
        'q31_overall_prog'
    ];

    singleRadioGroups.forEach(name => {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        const sampleRadio = document.querySelector(`input[name="${name}"]`);
        const qItem = sampleRadio ? sampleRadio.closest('.question-item') : null;
        if (!checked) {
            isValid = false;
            if (qItem) qItem.classList.add('has-error');
            if (!firstErrorEl) firstErrorEl = qItem;
        } else if (qItem) {
            qItem.classList.remove('has-error');
        }
    });

    // Validate Services Matrix (Q27)
    const servicesRows = ['q27_av_aids', 'q27_library', 'q27_hostel', 'q27_dining', 'q27_recreation'];
    const servicesMatrixItem = document.querySelector('.question-item[data-qid="q27_matrix"]');
    let allServicesChecked = true;
    servicesRows.forEach(name => {
        if (!document.querySelector(`input[name="${name}"]:checked`)) {
            allServicesChecked = false;
        }
    });
    if (!allServicesChecked) {
        isValid = false;
        if (servicesMatrixItem) servicesMatrixItem.classList.add('has-error');
        if (!firstErrorEl) firstErrorEl = servicesMatrixItem;
    } else if (servicesMatrixItem) {
        servicesMatrixItem.classList.remove('has-error');
    }

    // Validate Coordinator Matrix (Q30)
    const coordRows = ['q30_comm_skill', 'q30_overall_coord'];
    const coordMatrixItem = document.querySelector('.question-item[data-qid="q30_matrix"]');
    let allCoordChecked = true;
    coordRows.forEach(name => {
        if (!document.querySelector(`input[name="${name}"]:checked`)) {
            allCoordChecked = false;
        }
    });
    if (!allCoordChecked) {
        isValid = false;
        if (coordMatrixItem) coordMatrixItem.classList.add('has-error');
        if (!firstErrorEl) firstErrorEl = coordMatrixItem;
    } else if (coordMatrixItem) {
        coordMatrixItem.classList.remove('has-error');
    }

    if (!isValid) {
        if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Gather full response payload matching all 33 questions
    const formData = new FormData(event.target);
    const getVal = (name) => (formData.get(name) || '').toString().trim();

    const responsePayload = {
        id: 'FB-' + Date.now(),
        submitted_at: new Date().toISOString(),
        program_title: document.getElementById('form-program-title')?.innerText?.trim() || 'AI and Digital Transformation',
        participant_name: getVal('q1_participant_name'),
        eis_no: getVal('q2_eis_no'),
        subsidiary: getVal('q3_subsidiary'),
        relevance: getVal('q4_relevance'),
        programme_design_rating: getVal('q5_prog_design'),
        additional_topics: getVal('q6_additional_topics'),
        
        // Faculty evaluations
        faculty_evaluations: {
            piyush_rai: {
                participant_expectations: getVal('q7_piyush_expectations'),
                digital_transformation: getVal('q8_piyush_digital_journey'),
                appreciated_notes: getVal('q9_piyush_thoughts'),
                improvement_suggestions: getVal('q10_piyush_improvement')
            },
            manish_kumar: {
                ai_ml_deep_learning: getVal('q11_manish_ai_ml'),
                genai_difference: getVal('q12_manish_genai_diff'),
                appreciated_notes: getVal('q13_manish_thoughts'),
                improvement_suggestions: getVal('q14_manish_improvement')
            },
            shyam_agarwal: {
                llm_models: getVal('q15_shyam_llm'),
                prompt_engineering: getVal('q16_shyam_prompt'),
                office_productivity: getVal('q17_shyam_productivity'),
                finance_analytics: getVal('q18_shyam_finance'),
                appreciated_notes: getVal('q19_shyam_thoughts'),
                improvement_suggestions: getVal('q20_shyam_improvement')
            },
            n_kishore: {
                governance_ethics: getVal('q21_kishore_governance'),
                cybersecurity_risk: getVal('q22_kishore_cyber'),
                mining_applications: getVal('q23_kishore_mining'),
                roadmap_adoption: getVal('q24_kishore_roadmap'),
                appreciated_notes: getVal('q25_kishore_thoughts'),
                improvement_suggestions: getVal('q26_kishore_improvement')
            }
        },

        // Services rating
        services_feedback: {
            audio_visual_aids: getVal('q27_av_aids'),
            library: getVal('q27_library'),
            hostel_services: getVal('q27_hostel'),
            dining_food: getVal('q27_dining'),
            recreation: getVal('q27_recreation'),
            key_issues_faced: getVal('q28_issues_faced'),
            suggestions: getVal('q29_hospitality_suggestions')
        },

        // Coordinator
        coordinator_feedback: {
            communication_skill: getVal('q30_comm_skill'),
            overall_coordination: getVal('q30_overall_coord')
        },

        // Overall
        overall_program_rating: getVal('q31_overall_prog'),
        overall_suggestions: getVal('q32_overall_suggestions'),
        remarks: getVal('q33_remarks')
    };

    // Save locally
    try {
        let existing = JSON.parse(localStorage.getItem('iicm_full_feedback_submissions') || '[]');
        existing.unshift(responsePayload);
        localStorage.setItem('iicm_full_feedback_submissions', JSON.stringify(existing));

        // Compatible coordinator record
        let coordinatorRecords = JSON.parse(localStorage.getItem('iicm_participant_feedback_responses') || '[]');
        coordinatorRecords.unshift({
            id: responsePayload.id,
            program: responsePayload.program_title,
            participant_name: responsePayload.participant_name,
            eis_number: responsePayload.eis_no,
            subsidiary: responsePayload.subsidiary,
            rating: ratingToStars(responsePayload.overall_program_rating),
            content_rating: ratingToStars(responsePayload.programme_design_rating),
            submitted_at: responsePayload.submitted_at,
            comments: responsePayload.remarks || responsePayload.overall_suggestions
        });
        localStorage.setItem('iicm_participant_feedback_responses', JSON.stringify(coordinatorRecords));
    } catch (err) {
        console.error('LocalStorage save error:', err);
    }

    // Try backend API if available
    try {
        if (window.fetch) {
            await fetch('/api/v1/feedback/submit_feedback/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(responsePayload)
            }).catch(() => {/* offline fallback */});
        }
    } catch (e) {}

    // Show Confirmation Receipt
    showSuccessReceipt(responsePayload);
}

function ratingToStars(ratingText) {
    switch (ratingText) {
        case 'Excellent': return 5;
        case 'Very Good': return 4;
        case 'Good': return 3;
        case 'Average': return 2;
        case 'Poor': return 1;
        default: return 5;
    }
}

function showSuccessReceipt(data) {
    const detailsContainer = document.getElementById('receipt-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                <span style="color:#64748b;">Acknowledgement ID:</span>
                <strong style="color:#0B5D3B;">${data.id}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b;">Participant Name:</span>
                <strong>${data.participant_name}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b;">EIS Number:</span>
                <strong>${data.eis_no}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b;">Subsidiary:</span>
                <strong>${data.subsidiary}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b;">Overall Programme Rating:</span>
                <strong style="color:#059669;"><i class="fa-solid fa-star"></i> ${data.overall_program_rating}</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span style="color:#64748b;">Submission Time:</span>
                <span>${new Date(data.submitted_at).toLocaleString('en-IN')}</span>
            </div>
        `;
    }

    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
    if (confirm('Are you sure you want to reset all answers?')) {
        const form = document.getElementById('google-feedback-form');
        if (form) form.reset();

        document.querySelectorAll('.rating-pill-label').forEach(lbl => lbl.classList.remove('active'));
        document.querySelectorAll('.question-item').forEach(item => item.classList.remove('has-error'));

        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.handleFeedbackSubmit = handleFeedbackSubmit;
window.clearForm = clearForm;
window.closeSuccessModal = closeSuccessModal;
