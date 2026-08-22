# AuraScript

AuraScript is a lightweight digital prescription web app for doctors. It lets a doctor set up a local profile, create a patient prescription, generate a short access code and QR code, and store the encrypted prescription through a small Flask API for pharmacist retrieval.

## About

AuraScript focuses on quick prescription handoff without putting provider secrets in the browser. The frontend runs as a GitHub Pages-friendly Progressive Web App, while the backend exposes simple `/api/save`, `/api/get`, and `/api/health` endpoints for encrypted prescription payloads.

> **Note:** This project is a prototype. The current backend uses in-memory storage, so prescriptions are lost when the server restarts. Add a persistent database and formal clinical/compliance review before using it in production healthcare workflows.

## Features

- Doctor profile setup stored locally in the browser
- Patient, medication, dosage, timing, and notes form
- Medication autocomplete suggestions
- Encrypted prescription payload generation with CryptoJS AES
- 5-character OTP and QR code output for pharmacy lookup
- Downloadable branded QR card
- PWA manifest and service worker for static asset caching
- Flask API with CORS support for remote encrypted data handoff
- Regression tests to prevent accidental frontend secret exposure

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Browser libraries: CryptoJS, QRCode.js, html2canvas
- Backend: Python, Flask, Flask-CORS, Gunicorn
- Deployment: GitHub Pages for frontend, Render-compatible Flask service

## Project Structure

```text
.
├── login.html          # Doctor profile setup page
├── index.html          # Prescription form and QR modal
├── script.js           # Frontend logic, OTP/QR generation, API save call
├── style.css           # Responsive glassmorphism UI styles
├── manifest.json       # PWA metadata
├── sw.js               # Service worker cache rules
├── server.py           # Flask API for saving and fetching prescriptions
├── requirements.txt    # Python dependencies
├── render.yaml         # Render service configuration
├── Procfile            # Gunicorn process command
├── test_security.py    # Secret-exposure regression tests
└── .env.example        # Local backend environment template
```

## Local Development

### 1. Install backend dependencies

```bash
python -m venv .venv
source .venv/bin/activate  # Windows Git Bash / macOS / Linux
pip install -r requirements.txt
```

### 2. Run the API server

```bash
python server.py
```

The API starts on `http://localhost:5000` by default.

Health check:

```bash
curl http://localhost:5000/api/health
```

### 3. Open the frontend

Open `login.html` or serve the folder with any static file server, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/login.html`.

For production, `script.js` defaults to:

```js
https://pharmalink-api.onrender.com
```

You can override it before loading `script.js` by setting:

```html
<script>window.AURA_API_BASE_URL = 'https://your-api.example.com';</script>
```

## API Endpoints

### `GET /api/health`

Returns service status and the number of stored prescriptions.

### `POST /api/save`

Stores an encrypted prescription payload.

```json
{
  "otp": "ABCDE",
  "data": "encrypted-payload"
}
```

### `GET /api/get?otp=ABCDE`

Returns the encrypted payload for a matching OTP.

## Testing

Run the regression tests with:

```bash
python -m unittest -v
```

## Security Notes

- Do not commit `.env` or any API keys.
- Keep secrets on the server only; never embed them in `index.html`, `login.html`, or `script.js`.
- The current CryptoJS passphrase is client-side and intended only for prototype-level obfuscation, not production-grade medical data security.
- Replace in-memory storage with a durable database plus expiry, audit logging, authentication, rate limiting, and access controls before production use.


## Contributing

Issues and pull requests are welcome. If you spot a bug or have an idea for a feature, feel free to open an issue.

## License

This project is licensed under the MIT License.

---

<p align="center">Built by <a href="https://github.com/idxva">idxva</a></p>
