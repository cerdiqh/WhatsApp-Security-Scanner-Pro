# WhatsApp Security Scanner Pro

This project is a prototype tool for analyzing suspicious WhatsApp messages. It includes a simple web interface and a small Node.js server used for basic validation and phone number intelligence.

## Setup

1. Install [Node.js](https://nodejs.org/) (version 14 or higher).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `index.html` in your browser.

## API Endpoints

The server exposes two API endpoints used by the client:

- `POST /scan` – Validate a message and phone number. It returns a risk score and whether the number is known in the scam database.
- `GET /scam-numbers` – Retrieve the list of numbers stored in `data/scamNumbers.json`.

Example request for `/scan`:

```bash
curl -X POST http://localhost:3000/scan \
  -H "Content-Type: application/json" \
  -d '{"message":"send your account details","phone":"+2349031234567"}'
```

The response will look like:

```json
{"isScam": true, "riskScore": 100}
```

## Scam Number Database

Known scammer numbers are stored in `data/scamNumbers.json`. You can update this file to maintain a record of confirmed fraudulent numbers.

---

This tool is provided as a demonstration and should not be used as a sole means of determining fraud. Always perform additional verification when in doubt.
