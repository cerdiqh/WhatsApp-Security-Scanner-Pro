const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const dbPath = path.join(__dirname, 'data', 'scamNumbers.json');
let scamNumbers = [];

function loadNumbers() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    scamNumbers = JSON.parse(raw);
  } catch (e) {
    scamNumbers = [];
  }
}

loadNumbers();

app.get('/scam-numbers', (req, res) => {
  res.json({ numbers: scamNumbers });
});

app.post('/scan', (req, res) => {
  const { message = '', phone = '' } = req.body;
  if (!message.trim() || !phone.trim()) {
    return res.status(400).json({ error: 'Message and phone are required' });
  }
  if (!/^[+0-9]{10,16}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  const cleaned = phone.replace(/\D/g, '');
  const isScamNumber = scamNumbers.includes(cleaned);

  const patterns = [/urgent/i, /account/i, /payment/i, /government/i];
  let score = 0;
  patterns.forEach(p => {
    if (p.test(message)) score += 1;
  });
  if (isScamNumber) score += 2;
  const riskScore = Math.min(score * 25, 100);
  res.json({ isScam: isScamNumber, riskScore });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
