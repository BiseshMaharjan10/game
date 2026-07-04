const https = require('https');
const { log } = require('../utils/logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 30000;

function _buildPrompt(context) {
  const sections = [];

  sections.push('You are a professional newspaper journalist. Write a news article of approximately 100-120 words based ONLY on the supplied information.');

  if (context.headline) {
    sections.push(`\nHEADLINE: ${context.headline}`);
  }

  if (context.anonymousTip) {
    sections.push(`\nANONYMOUS TIP: ${context.anonymousTip}`);
  }

  if (context.backgroundNews && context.backgroundNews.length > 0) {
    sections.push('\nBACKGROUND CONTEXT:');
    for (const item of context.backgroundNews) {
      sections.push(`- ${item.text}`);
    }
  }

  if (context.discoveredEvidence && context.discoveredEvidence.length > 0) {
    sections.push('\nEVIDENCE DISCOVERED:');
    for (const ev of context.discoveredEvidence) {
      sections.push(`- ${ev.type}: ${ev.description}`);
    }
  }

  if (context.witnessStatements && context.witnessStatements.length > 0) {
    sections.push('\nWITNESS STATEMENTS:');
    for (const w of context.witnessStatements) {
      sections.push(`- ${w.description}`);
    }
  }

  sections.push(`
RULES:
- Write in a formal, neutral newspaper tone.
- Do NOT invent facts beyond the supplied evidence and tip.
- If evidence is incomplete or the tip is unverified, use cautious language (e.g. "allegedly", "claims", "reportedly").
- Do NOT reveal any facts that were not discovered during the investigation.
- Avoid sensationalism and emotional language.
- Keep the article between 100 and 120 words.
- Output plain text only — no markdown, no formatting, no headings.`);

  return sections.join('\n');
}

async function generateArticle(context) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = _buildPrompt(context);

  const payload = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
      topK: 40,
      topP: 0.95,
    },
  });

  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
  url.searchParams.set('key', GEMINI_API_KEY);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url.toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              const errMsg = parsed.error?.message || `Gemini API returned HTTP ${res.statusCode}`;
              log('ERROR', '[GEMINI] API error', { statusCode: res.statusCode, error: parsed.error });
              reject(new Error(errMsg));
              return;
            }

            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!text) {
              log('WARN', '[GEMINI] Empty response', { parsed });
              reject(new Error('Gemini returned an empty response'));
              return;
            }

            const cleaned = text.trim().replace(/^["']|["']$/g, '');
            resolve(cleaned);
          } catch (err) {
            log('ERROR', '[GEMINI] Response parse failed', { error: err.message, raw: data.slice(0, 500) });
            reject(new Error('Failed to parse Gemini response'));
          }
        });
      }
    );

    req.on('error', (err) => {
      log('ERROR', '[GEMINI] Request failed', { error: err.message });
      reject(new Error(`Gemini request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      log('ERROR', '[GEMINI] Request timed out');
      reject(new Error('Gemini request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { generateArticle, _buildPrompt };
