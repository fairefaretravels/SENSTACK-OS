require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint: the browser calls this, the server calls Anthropic with the real key.
app.post('/api/messages', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: 'Server is missing ANTHROPIC_API_KEY. Add it to your .env file and restart the server.'
    });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      const message = (data && data.error && data.error.message) || 'Anthropic API request failed.';
      return res.status(anthropicRes.status).json({ error: message });
    }

    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Could not reach the Anthropic API. Check your server\'s network connection.' });
  }
});

app.listen(PORT, () => {
  console.log(`Showdown Live is running at http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
  }
});
