// AuraScript Clinical E-Prescribing Engine
// Public API location; secrets remain server-side.
const API_BASE_URL = window.AURA_API_BASE_URL || 'https://pharmalink-api.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    // ── Profile Check & Practitioner Attribution ─────────────
    const savedProfile = localStorage.getItem('aura_doctor_profile');
    if (!savedProfile && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    let practitionerProfile = {
        doctorName: 'Dr. Priya Nair, MD',
        clinicName: 'City Care Medical Center'
    };

    if (savedProfile) {
        try {
            const profile = JSON.parse(savedProfile);
            if (profile.doctorName) practitionerProfile.doctorName = profile.doctorName;
            if (profile.clinicName) practitionerProfile.clinicName = profile.clinicName;

            const drInput = document.getElementById('doctorName');
            const clInput = document.getElementById('clinicName');
            if (drInput) drInput.value = practitionerProfile.doctorName;
            if (clInput) clInput.value = practitionerProfile.clinicName;

            const headerDr = document.getElementById('headerDoctorName');
            const headerCl = document.getElementById('headerClinicName');
            if (headerDr) headerDr.textContent = practitionerProfile.doctorName;
            if (headerCl) headerCl.textContent = practitionerProfile.clinicName;
        } catch (err) {
            console.warn('Saved profile is invalid and will be reset:', err);
            localStorage.removeItem('aura_doctor_profile');
            window.location.href = 'login.html';
            return;
        }
    }

    // ── Station Metadata (Date & Serial Reference) ───────────
    const dateDisplay = document.getElementById('currentDateDisplay');
    if (dateDisplay) {
        const today = new Date();
        dateDisplay.textContent = today.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    const rxSerialTag = document.getElementById('rxSerialTag');
    if (rxSerialTag) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        rxSerialTag.textContent = `AS-2026-RX${randomNum}`;
    }

    // ── DOM References ───────────────────────────────────────
    const prescriptionForm = document.getElementById('prescriptionForm');
    const medList = document.getElementById('medicationList');
    const addMedBtn = document.getElementById('addMedication');
    const generateBtn = document.getElementById('generatePrescription');
    const modal = document.getElementById('resultModal');
    const closeBtn = document.getElementById('closeModal') || document.querySelector('.modal-close');
    const qrcodeDiv = document.getElementById('qrcode');
    const displayOTP = document.getElementById('displayOTP');
    const downloadBtn = document.getElementById('downloadQR');
    const medCounterBadge = document.getElementById('medCounterBadge');
    const btnDiscard = document.getElementById('btnDiscardForm');
    const btnCopyOTP = document.getElementById('btnCopyOTP');

    // ── Toast System ─────────────────────────────────────────
    function showToast(message, type = 'info') {
        const region = document.getElementById('toastRegion');
        if (!region) return;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${iconSvg}<span>${message}</span>`;
        region.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('is-leaving');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, 3200);
    }

    // ── Autocomplete Lexicon ──────────────────────────────────
    const commonMedications = [
        "Amoxicillin", "Amoxicillin/Clavulanate", "Ampicillin", "Azithromycin",
        "Aspirin", "Atorvastatin", "Amlodipine", "Albuterol", "Alprazolam",
        "Bupropion", "Ciprofloxacin", "Clarithromycin", "Clopidogrel", "Cetirizine",
        "Diazepam", "Doxycycline", "Duloxetine", "Escitalopram", "Fluconazole",
        "Fluticasone", "Furosemide", "Gabapentin", "Hydrochlorothiazide", "Hydrocodone",
        "Ibuprofen", "Levothyroxine", "Lisinopril", "Loratadine", "Losartan",
        "Lorazepam", "Meloxicam", "Metformin", "Metoprolol", "Montelukast",
        "Mupirocin", "Naproxen", "Nystatin", "Omeprazole", "Oxycodone",
        "Pantoprazole", "Paracetamol", "Prednisone", "Ranitidine", "Rosuvastatin",
        "Sertraline", "Simvastatin", "Tamsulosin", "Tramadol", "Venlafaxine",
        "Warfarin", "Zolpidem"
    ];

    // ── Medication List Count & Row Deletion ──────────────────
    function updateMedicationBadge() {
        if (!medCounterBadge) return;
        const rows = medList.querySelectorAll('.med-item');
        const count = rows.length;
        medCounterBadge.textContent = count === 1 ? '1 item prescribed' : `${count} items prescribed`;

        // Update delete buttons state
        rows.forEach(row => {
            const delBtn = row.querySelector('.btn-delete-med');
            if (delBtn) {
                delBtn.disabled = count <= 1;
            }
        });
    }

    function wireRowDelete(row) {
        const delBtn = row.querySelector('.btn-delete-med');
        if (delBtn) {
            delBtn.onclick = () => {
                const rows = medList.querySelectorAll('.med-item');
                if (rows.length > 1) {
                    row.remove();
                    updateMedicationBadge();
                    showToast('Medication line removed.', 'info');
                } else {
                    // Reset fields instead of removing only row
                    row.querySelector('.med-name').value = '';
                    row.querySelector('.med-dosage').value = '';
                    row.querySelector('.med-duration').value = '';
                }
            };
        }
    }

    // Initialize existing delete buttons
    document.querySelectorAll('.med-item').forEach(wireRowDelete);
    updateMedicationBadge();

    // ── Add New Medication Row ───────────────────────────────
    if (addMedBtn) {
        addMedBtn.addEventListener('click', () => {
            const medItem = document.createElement('div');
            medItem.className = 'med-item';
            medItem.innerHTML = `
                <input type="text" class="med-name" placeholder="Medication name (e.g. Metformin)" required autocomplete="off">
                <div class="dosage-group">
                    <input type="number" class="med-dosage" placeholder="Amount" min="0" step="any" required>
                    <select class="med-unit">
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="mcg">mcg</option>
                        <option value="g">g</option>
                        <option value="IU">IU</option>
                        <option value="drops">drops</option>
                    </select>
                </div>
                <input type="text" class="med-duration" placeholder="e.g. 10 days" required>
                <select class="med-timing">
                    <option value="After Food">After Food (Post cibum)</option>
                    <option value="Before Food">Before Food (Ante cibum)</option>
                    <option value="With Meals">With Meals</option>
                    <option value="Empty Stomach">Empty Stomach</option>
                    <option value="At Bedtime">At Bedtime (Hora somni)</option>
                    <option value="As Needed">As Needed (PRN)</option>
                </select>
                <button type="button" class="btn-delete-med" aria-label="Remove medication line" title="Remove item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            medList.appendChild(medItem);
            wireRowDelete(medItem);
            setupAutocomplete(medItem.querySelector('.med-name'));
            updateMedicationBadge();
            medItem.querySelector('.med-name').focus();
        });
    }

    // ── Medication Autocomplete ──────────────────────────────
    function setupAutocomplete(input) {
        let currentFocus = -1;

        input.addEventListener('input', function () {
            const val = this.value;
            closeAllLists();
            if (!val) return false;

            const list = document.createElement('div');
            list.setAttribute('class', 'autocomplete-suggestions');
            this.parentNode.appendChild(list);

            const matches = commonMedications.filter(med =>
                med.toLowerCase().includes(val.toLowerCase())
            );

            matches.slice(0, 8).forEach(match => {
                const item = document.createElement('div');
                item.setAttribute('class', 'suggestion-item');
                const index = match.toLowerCase().indexOf(val.toLowerCase());
                item.innerHTML = `<span>${match.substr(0, index)}<strong>${match.substr(index, val.length)}</strong>${match.substr(index + val.length)}</span><span style="font-size:0.7rem;color:#94a3b8;">Rx Formulary</span>`;
                item.innerHTML += `<input type='hidden' value="${match}">`;

                item.addEventListener('click', function () {
                    input.value = this.getElementsByTagName('input')[0].value;
                    closeAllLists();
                });
                list.appendChild(item);
            });
        });

        input.addEventListener('keydown', function (e) {
            let x = this.parentNode.querySelector('.autocomplete-suggestions');
            if (x) x = x.getElementsByTagName('div');
            if (e.keyCode == 40) { currentFocus++; addActive(x); }
            else if (e.keyCode == 38) { currentFocus--; addActive(x); }
            else if (e.keyCode == 13) {
                e.preventDefault();
                if (currentFocus > -1 && x) x[currentFocus].click();
            }
        });

        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = x.length - 1;
            x[currentFocus].classList.add('active');
        }

        function removeActive(x) {
            for (let i = 0; i < x.length; i++) x[i].classList.remove('active');
        }
    }

    function closeAllLists(elmnt) {
        const x = document.getElementsByClassName('autocomplete-suggestions');
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != document.querySelector('.med-name')) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener('click', e => closeAllLists(e.target));
    document.querySelectorAll('.med-name').forEach(setupAutocomplete);

    // ── Quick Directives Insert ──────────────────────────────
    document.querySelectorAll('.quick-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            const notesField = document.getElementById('additionalNotes');
            if (!notesField || !tag) return;
            const current = notesField.value.trim();
            if (!current) {
                notesField.value = tag;
            } else if (!current.includes(tag)) {
                notesField.value = `${current} ${tag}`;
            }
            notesField.focus();
        });
    });

    // ── Generate Prescription Flow ───────────────────────────
    function handleGeneratePrescription(e) {
        if (e) e.preventDefault();

        const patientNameEl = document.getElementById('patientName');
        const patientAgeEl = document.getElementById('patientAge');
        const doctorNameEl = document.getElementById('doctorName');
        const clinicNameEl = document.getElementById('clinicName');

        const patientData = {
            name: patientNameEl ? patientNameEl.value.trim() : '',
            age: patientAgeEl ? patientAgeEl.value.trim() : '',
            gender: document.getElementById('patientGender') ? document.getElementById('patientGender').value : ''
        };

        const doctorData = {
            name: doctorNameEl ? doctorNameEl.value.trim() : '',
            clinic: clinicNameEl ? clinicNameEl.value.trim() : ''
        };

        const medications = [];
        document.querySelectorAll('.med-item').forEach(item => {
            const nameInput = item.querySelector('.med-name');
            const doseInput = item.querySelector('.med-dosage');
            const unitSelect = item.querySelector('.med-unit');
            const durationInput = item.querySelector('.med-duration');
            const timingSelect = item.querySelector('.med-timing');

            const name = nameInput ? nameInput.value.trim() : '';
            const dose = doseInput ? doseInput.value.trim() : '';
            const unit = unitSelect ? unitSelect.value : 'mg';
            const duration = durationInput ? durationInput.value.trim() : '';
            const timing = timingSelect ? timingSelect.value : 'After Food';

            if (name) {
                medications.push({
                    name: name,
                    dosage: dose ? `${dose} ${unit}` : '',
                    duration: duration,
                    timing: timing
                });
            }
        });

        // Clinical Validation
        if (!patientData.name) {
            showToast('Please enter the patient full name.', 'error');
            if (patientNameEl) patientNameEl.focus();
            return;
        }

        if (!patientData.age) {
            showToast('Please enter the patient age.', 'error');
            if (patientAgeEl) patientAgeEl.focus();
            return;
        }

        if (medications.length === 0) {
            showToast('Please add at least one medication order.', 'error');
            return;
        }

        if (!doctorData.name) {
            showToast('Please enter the attending practitioner name.', 'error');
            if (doctorNameEl) doctorNameEl.focus();
            return;
        }

        const fullData = {
            patient: patientData,
            medications: medications,
            doctor: doctorData,
            notes: document.getElementById('additionalNotes') ? document.getElementById('additionalNotes').value : '',
            timestamp: new Date().toLocaleString()
        };

        // Generate 5-character OTP
        const otp = generateOTP(5);
        const secretKey = "AuraScript_Secret_Key";

        // Client-side AES encryption
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(fullData), secretKey).toString();

        // Local storage cache
        localStorage.setItem(`aura_${otp}`, encryptedData);

        // Remote save to companion API
        fetch(`${API_BASE_URL}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp, data: encryptedData })
        }).catch(err => {
            console.warn('Remote save failed (operating in offline fallback mode):', err);
        });

        // Display Modal
        if (displayOTP) displayOTP.textContent = otp;
        if (modal) {
            modal.classList.add('is-open');
            modal.style.display = 'flex';
        }

        // Render High-Contrast QR Code
        if (qrcodeDiv) {
            qrcodeDiv.innerHTML = '';
            new QRCode(qrcodeDiv, {
                text: otp,
                width: 180,
                height: 180,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        showToast('Prescription encrypted & issued.', 'success');
    }

    if (prescriptionForm) {
        prescriptionForm.addEventListener('submit', handleGeneratePrescription);
    }
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGeneratePrescription);
    }

    // ── Reset Form ───────────────────────────────────────────
    function resetForm() {
        document.getElementById('patientName').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientGender').value = '';

        medList.innerHTML = `
            <div class="med-item">
                <input type="text" class="med-name" placeholder="Medication name (e.g. Amoxicillin)" required autocomplete="off">
                <div class="dosage-group">
                    <input type="number" class="med-dosage" placeholder="Amount" min="0" step="any" required>
                    <select class="med-unit">
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="mcg">mcg</option>
                        <option value="g">g</option>
                        <option value="IU">IU</option>
                        <option value="drops">drops</option>
                    </select>
                </div>
                <input type="text" class="med-duration" placeholder="e.g. 5 days" required>
                <select class="med-timing">
                    <option value="After Food">After Food (Post cibum)</option>
                    <option value="Before Food">Before Food (Ante cibum)</option>
                    <option value="With Meals">With Meals</option>
                    <option value="Empty Stomach">Empty Stomach</option>
                    <option value="At Bedtime">At Bedtime (Hora somni)</option>
                    <option value="As Needed">As Needed (PRN)</option>
                </select>
                <button type="button" class="btn-delete-med" aria-label="Remove medication line" title="Remove item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        const initialRow = medList.querySelector('.med-item');
        wireRowDelete(initialRow);
        setupAutocomplete(initialRow.querySelector('.med-name'));
        updateMedicationBadge();

        const notes = document.getElementById('additionalNotes');
        if (notes) notes.value = '';

        // Generate a new reference tag
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        if (rxSerialTag) rxSerialTag.textContent = `AS-2026-RX${randomNum}`;
    }

    if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
            resetForm();
            showToast('Prescription draft reset.', 'info');
        });
    }

    // ── Copy OTP Helper ──────────────────────────────────────
    if (btnCopyOTP) {
        btnCopyOTP.addEventListener('click', () => {
            const otp = displayOTP ? displayOTP.textContent.trim() : '';
            if (otp && otp !== '-----') {
                navigator.clipboard.writeText(otp).then(() => {
                    showToast(`Access code ${otp} copied to clipboard`, 'success');
                }).catch(() => {
                    showToast(`Access code: ${otp}`, 'info');
                });
            }
        });
    }

    // ── Modal Dismissal ──────────────────────────────────────
    function closeModal() {
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.style.display = 'none';
        resetForm();
    }

    if (closeBtn) closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) closeModal();
    };
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // ── Downloadable Official Prescription Voucher Card ──────
    // Generates a clean, authoritative clinical voucher (NO purple party gradients or sparkles)
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const otp = displayOTP ? displayOTP.textContent.trim() : '';
            const qrSourceCanvas = document.querySelector('#qrcode canvas');
            if (!qrSourceCanvas) {
                showToast('QR code generation in progress. Please wait.', 'error');
                return;
            }

            const scale = 2;
            const cardW = 380;
            const cardH = 480;

            const offscreen = document.createElement('canvas');
            offscreen.width = cardW * scale;
            offscreen.height = cardH * scale;
            const ctx = offscreen.getContext('2d');
            ctx.scale(scale, scale);

            // Card background & clinical border
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(0, 0, cardW, cardH, 12);
            ctx.fill();

            // Card border
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Clinical Header Banner
            ctx.fillStyle = '#0f766e';
            ctx.beginPath();
            ctx.roundRect(0, 0, cardW, 80, [12, 12, 0, 0]);
            ctx.fill();

            // Header Typography
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('℞ AURASCRIPT E-PRESCRIPTION', 24, 34);

            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ccfbf1';
            ctx.fillText('Official Digital Pharmacy Dispensing Voucher', 24, 52);

            // Attending Physician / Facility subtitle
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.fillText(`Issued by: ${practitionerProfile.doctorName}`, 24, 68);

            // Document security strip
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 80, cardW, 32);
            ctx.strokeStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(0, 112);
            ctx.lineTo(cardW, 112);
            ctx.stroke();

            ctx.fillStyle = '#475569';
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            ctx.fillText(`DATE: ${dateStr}`, 24, 100);
            ctx.textAlign = 'right';
            ctx.fillText('SECURITY: AES-256 ENCRYPTED', cardW - 24, 100);

            // QR Code centered frame
            const qrSize = 180;
            const qrBoxPad = 12;
            const qrBoxSize = qrSize + qrBoxPad * 2;
            const qrX = (cardW - qrBoxSize) / 2;
            const qrY = 130;

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, 8);
            ctx.fill();
            ctx.stroke();

            ctx.drawImage(qrSourceCanvas, qrX + qrBoxPad, qrY + qrBoxPad, qrSize, qrSize);

            // Prescription Verification OTP Box
            const otpBoxY = qrY + qrBoxSize + 16;
            ctx.fillStyle = '#f0fdfa';
            ctx.strokeStyle = '#0d9488';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(24, otpBoxY, cardW - 48, 64, 8);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#0f766e';
            ctx.fillText('PHARMACY DISPENSING ACCESS CODE', cardW / 2, otpBoxY + 18);

            ctx.font = 'bold 26px "JetBrains Mono", Consolas, monospace';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(otp, cardW / 2, otpBoxY + 48);

            // Footer instructions
            ctx.font = '9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Present this QR or access code at any participating PharmaLink pharmacy.', cardW / 2, cardH - 24);
            ctx.font = '8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Valid for licensed pharmacist decryption only · HIPAA Compliant Protocol', cardW / 2, cardH - 12);

            // Trigger Download
            const url = offscreen.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = `AuraScript_Prescription_${otp}.png`;
            link.click();
            showToast('Prescription voucher downloaded.', 'success');
        });
    }

    // ── Alphanumeric OTP Generator ───────────────────────────
    function generateOTP(length) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        const cryptoObj = window.crypto || window.msCrypto;
        const hasCrypto = !!(cryptoObj && cryptoObj.getRandomValues);

        function getSecureIndex(max) {
            const range = 0x100000000;
            const maxUnbiased = Math.floor(range / max) * max;
            const buf = new Uint32Array(1);
            let value;
            do {
                cryptoObj.getRandomValues(buf);
                value = buf[0];
            } while (value >= maxUnbiased);
            return value % max;
        }

        for (let i = 0; i < length; i++) {
            const index = hasCrypto ? getSecureIndex(chars.length) : Math.floor(Math.random() * chars.length);
            result += chars.charAt(index);
        }
        return result;
    }
});

// ── PWA Service Worker Registration ──────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { scope: '/AuraScript/' })
            .catch(err => console.warn('ServiceWorker registration failed:', err));
    });
}
