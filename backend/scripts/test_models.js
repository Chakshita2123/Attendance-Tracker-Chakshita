const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API key:', apiKey ? (apiKey.slice(0, 10) + '...') : 'MISSING');
  if (!apiKey) return;

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    console.log('ListModels HTTP Status:', res.status);
    const data = await res.json();
    if (data.models) {
      console.log('\n--- Supported Models supporting generateContent ---');
      const supported = data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => ({
          name: m.name.replace('models/', ''),
          displayName: m.displayName,
          inputModalities: m.inputTokenLimit ? 'supported' : 'unknown'
        }));
      console.log(JSON.stringify(supported, null, 2));
    } else {
      console.log('Response body:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

listModels();
