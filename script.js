// ─── Firebase Configuration ──────────────────────────────────────────────────
// ⚠️  Replace the values below with YOUR Firebase project config
// Get it from: Firebase Console → Project Settings → Your Apps → Web App
const firebaseConfig = {
    apiKey: "AIzaSyBjckGgFPBnI7h5xAscpoddbzthZb_C-ng",
    authDomain: "pharmalink-75382.firebaseapp.com",
    projectId: "pharmalink-75382",
    storageBucket: "pharmalink-75382.firebasestorage.app",
    messagingSenderId: "907666198541",
    appId: "1:907666198541:web:55b6401e1a8f036c0e8544"
};
// ─────────────────────────────────────────────────────────────────────────────
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

//---------------------------------------------------------------------------------
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // Check for profile
    const savedProfile = localStorage.getItem('aura_doctor_profile');
    if (!savedProfile && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        const drInput = document.getElementById('doctorName');
        const clInput = document.getElementById('clinicName');
        if (drInput) drInput.value = profile.doctorName;
        if (clInput) clInput.value = profile.clinicName;
    }
    const medList = document.getElementById('medicationList');
    const addMedBtn = document.getElementById('addMedication');
    const generateBtn = document.getElementById('generatePrescription');
    const modal = document.getElementById('resultModal');
    const closeBtn = document.querySelector('.close');
    const qrcodeDiv = document.getElementById('qrcode');
    const displayOTP = document.getElementById('displayOTP');
    const downloadBtn = document.getElementById('downloadQR');

    const commonMedications = [
        "Paracetamol", "Amoxicillin", "Metformin", "Atorvastatin", "Amlodipine",
        "Omeprazole", "Azithromycin", "Losartan", "Albuterol", "Gabapentin",
        "Hydrochlorothiazide", "Sertraline", "Simvastatin", "Lisinopril", "Levothyroxine",
        "Metoprolol", "Pantoprazole", "Escitalopram", "Rosuvastatin", "Bupropion",
        "Furosemide", "Fluticasone", "Prednisone", "Tamsulosin", "Duloxetine",
        "Ranitidine", "Venlafaxine", "Meloxicam", "Warpfarin", "Clopidogrel",
        "Aspirin", "Ibuprofen", "Naproxen", "Cetirizine", "Loratadine",
        "Montelukast", "Tramadol", "Oxycodone", "Hydrocodone", "Diazepam",
        "Lorazepam", "Alprazolam", "Zolpidem", "Ciprofloxacin", "Doxycycline",
        "Amoxicillin/Clavulanate", "Clarithromycin", "Fluconazole", "Nystatin", "Mupirocin"
    ];

    // Add new medication row
    addMedBtn.addEventListener('click', () => {
        const medItem = document.createElement('div');
        medItem.className = 'med-item';
        medItem.innerHTML = `
            <input type="text" class="med-name" placeholder="Medication Name" required autocomplete="off">
            <div class="dosage-group">
                <input type="number" class="med-dosage" placeholder="Dose" min="0" step="any" required>
                <select class="med-unit">
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="mcg">mcg</option>
                    <option value="g">g</option>
                </select>
            </div>
            <input type="text" class="med-duration" placeholder="Duration (e.g. 5 days)" required>
            <select class="med-timing">
                <option value="After Food">After Food</option>
                <option value="Before Food">Before Food</option>
                <option value="Empty Stomach">Empty Stomach</option>
                <option value="At Bedtime">At Bedtime</option>
            </select>
        `;
        medList.appendChild(medItem);
        setupAutocomplete(medItem.querySelector('.med-name'));
    });

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

            matches.forEach(match => {
                const item = document.createElement('div');
                item.setAttribute('class', 'suggestion-item');
                const index = match.toLowerCase().indexOf(val.toLowerCase());
                item.innerHTML = match.substr(0, index) + "<strong>" + match.substr(index, val.length) + "</strong>" + match.substr(index + val.length);
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
    setupAutocomplete(document.querySelector('.med-name'));

    // Generate Prescription
    generateBtn.addEventListener('click', () => {
        const patientData = {
            name: document.getElementById('patientName').value,
            age: document.getElementById('patientAge').value,
            gender: document.getElementById('patientGender').value
        };

        const medications = [];
        document.querySelectorAll('.med-item').forEach(item => {
            const dosageVal = item.querySelector('.med-dosage').value;
            const dosageUnit = item.querySelector('.med-unit').value;
            medications.push({
                name: item.querySelector('.med-name').value,
                dosage: dosageVal ? `${dosageVal} ${dosageUnit}` : '',
                duration: item.querySelector('.med-duration').value,
                timing: item.querySelector('.med-timing').value
            });
        });

        const doctorData = {
            name: document.getElementById('doctorName').value,
            clinic: document.getElementById('clinicName').value
        };

        if (!patientData.name || !doctorData.name || medications[0].name === "") {
            alert("Please fill in all required fields.");
            return;
        }

        const fullData = {
            patient: patientData,
            medications: medications,
            doctor: doctorData,
            notes: document.getElementById('additionalNotes').value,
            timestamp: new Date().toLocaleString()
        };

        // Generate 5-char alphanumeric OTP
        const otp = generateOTP(5);
        const secretKey = "AuraScript_Secret_Key";

        // Encrypt Data
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(fullData), secretKey).toString();

        // Save to localStorage as offline fallback (same device)
        localStorage.setItem(`aura_${otp}`, encryptedData);

        // Save to Firestore for cross-device access
        db.collection('prescriptions').doc(otp).set({
            data: encryptedData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => {
            console.warn('Firestore save failed (offline mode):', err);
        });

        // Show Modal
        displayOTP.textContent = otp;
        modal.style.display = 'flex';

        // Clear and Generate QR Code
        qrcodeDiv.innerHTML = "";
        new QRCode(qrcodeDiv, {
            text: otp,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        resetForm();
    });

    function resetForm() {
        document.getElementById('patientName').value = "";
        document.getElementById('patientAge').value = "";
        document.getElementById('patientGender').value = "";

        medList.innerHTML = `
            <div class="med-item">
                <input type="text" class="med-name" placeholder="Medication Name" required autocomplete="off">
                <div class="dosage-group">
                    <input type="number" class="med-dosage" placeholder="Dose" min="0" step="any" required>
                    <select class="med-unit">
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="mcg">mcg</option>
                        <option value="g">g</option>
                    </select>
                </div>
                <input type="text" class="med-duration" placeholder="Duration (e.g. 5 days)" required>
                <select class="med-timing">
                    <option value="After Food">After Food</option>
                    <option value="Before Food">Before Food</option>
                    <option value="Empty Stomach">Empty Stomach</option>
                    <option value="At Bedtime">At Bedtime</option>
                </select>
            </div>
        `;
        setupAutocomplete(medList.querySelector('.med-name'));
        document.getElementById('additionalNotes').value = "";
    }

    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    };

    downloadBtn.addEventListener('click', () => {
        const otp = displayOTP.textContent;

        const qrSourceCanvas = document.querySelector('#qrcode canvas');
        if (!qrSourceCanvas) {
            alert("QR code is not ready yet. Please try again.");
            return;
        }

        const scale = 2;
        const cardW = 320;
        const qrSize = 200;
        const cardH = 380;

        const offscreen = document.createElement('canvas');
        offscreen.width = cardW * scale;
        offscreen.height = cardH * scale;
        const ctx = offscreen.getContext('2d');
        ctx.scale(scale, scale);

        const grad = ctx.createLinearGradient(0, 0, 0, cardH);
        grad.addColorStop(0, '#520e72');
        grad.addColorStop(0.5, '#3709a1');
        grad.addColorStop(1, '#620288');
        ctx.fillStyle = grad;
        ctx.roundRect(0, 0, cardW, cardH, 20);
        ctx.fill();

        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('✨ AuraScript', cardW / 2, 40);
        ctx.font = '11px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('Digital Prescription', cardW / 2, 58);

        const qrBoxPad = 12;
        const qrBoxSize = qrSize + qrBoxPad * 2;
        const qrX = (cardW - qrBoxSize) / 2;
        const qrY = 75;
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, 12);
        ctx.fill();
        ctx.drawImage(qrSourceCanvas, qrX + qrBoxPad, qrY + qrBoxPad, qrSize, qrSize);

        const otpY = qrY + qrBoxSize + 30;
        ctx.font = 'bold 32px Outfit, sans-serif';
        ctx.fillStyle = '#b06fe4';
        ctx.fillText(otp, cardW / 2, otpY);

        ctx.font = '11px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText('PRESCRIPTION CODE', cardW / 2, otpY + 18);

        ctx.font = '10px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillText('Show this to your pharmacist', cardW / 2, otpY + 36);

        const url = offscreen.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `AuraScript_${otp}.png`;
        link.click();
    });

    function generateOTP(length) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
});

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { scope: '/AuraScript/' })
            .catch(err => console.warn('SW registration failed:', err));
    });
}
