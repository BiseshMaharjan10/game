const https = require('https');
const { log } = require('../utils/logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 30000;

function _buildPrompt(context) {
  const lines = [];

  lines.push('You are a professional newspaper fact-checker and media analyst.');
  lines.push('Analyze the following article against the supplied hidden truth and investigation data.');
  lines.push('');
  lines.push('--- HIDDEN TRUTH ---');

  if (context.hiddenTruth !== undefined) {
    lines.push(`The story is ${context.hiddenTruth ? 'TRUE' : 'FALSE'}.`);
  }

  if (context.hiddenFacts && Object.keys(context.hiddenFacts).length > 0) {
    lines.push('Hidden facts (what actually happened):');
    for (const [key, value] of Object.entries(context.hiddenFacts)) {
      lines.push(`  ${key}: ${value !== null ? value : '(not applicable)'}`);
    }
  }

  lines.push('');
  lines.push('--- WHAT THE JOURNALIST KNEW (Investigation Snapshot) ---');

  if (context.anonymousTip) {
    lines.push(`Anonymous Tip: ${context.anonymousTip}`);
  }

  if (context.discoveredEvidence && context.discoveredEvidence.length > 0) {
    lines.push('Discovered Evidence:');
    for (const ev of context.discoveredEvidence) {
      lines.push(`  [${ev.type}] ${ev.description}`);
    }
  }

  if (context.witnessStatements && context.witnessStatements.length > 0) {
    lines.push('Witness Statements:');
    for (const w of context.witnessStatements) {
      lines.push(`  ${w.description}`);
    }
  }

  if (context.backgroundNews && context.backgroundNews.length > 0) {
    lines.push('Background News:');
    for (const item of context.backgroundNews) {
      lines.push(`  ${item.text}`);
    }
  }

  lines.push('');
  lines.push('--- PUBLISHED ARTICLE ---');
  lines.push(`Headline: ${context.headline || '(no headline)'}`);
  lines.push(`Body: ${context.articleBody || '(no body)'}`);

  lines.push(`
---
INSTRUCTIONS:
- Evaluate the article using ONLY the supplied hidden truth and investigation data.
- Do NOT assume additional facts beyond what is provided.
- Do NOT reward information the journalist could not reasonably know.
- Identify every factual claim in the article and compare it against the hidden truth and evidence.
- For EACH claim, mark it as "supported" ONLY if the hidden truth OR the discovered evidence directly confirms it.
- If a claim contradicts the hidden truth, mark it as unsupported AND add it to falseClaims.
- If a fact from the hidden truth is important and completely missing from the article, add it to missingFacts.
- Penalize exaggeration and sensational language.
- Reward careful, cautious wording when evidence is incomplete.
- Assess sensationalism (0-100): 0 = perfectly neutral, 100 = tabloid-level hype.
- Assess bias (0-100): 0 = perfectly neutral, 100 = heavily slanted.
- Choose ONE verdict from: TRUE, MOSTLY_TRUE, PARTIALLY_TRUE, MISLEADING, MOSTLY_FALSE, FALSE.
- Return valid JSON only. No markdown. No explanations outside JSON.

Expected JSON format:
{
  "claims": [
    { "text": "the claim as stated in the article", "supported": true, "reason": "why this claim is supported or not" }
  ],
  "missingFacts": ["important fact from hidden truth that was omitted"],
  "falseClaims": ["claim in the article that contradicts the hidden truth"],
  "sensationalism": 0,
  "bias": 0,
  "overallVerdict": "TRUE",
  "summary": "brief justification for the verdict"
}`);

  return lines.join('\n');
}

async function judgeArticle(context) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = _buildPrompt(context);

  const payload = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      topK: 10,
      topP: 0.9,
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
              log('ERROR', '[GEMINI_JUDGE] API error', { statusCode: res.statusCode, error: parsed.error });
              reject(new Error(errMsg));
              return;
            }

            const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!rawText) {
              log('WARN', '[GEMINI_JUDGE] Empty response', { parsed });
              reject(new Error('Gemini returned an empty response'));
              return;
            }

            const json = _extractJSON(rawText);
            if (!json) {
              log('ERROR', '[GEMINI_JUDGE] No valid JSON found in response', { raw: rawText.slice(0, 1000) });
              reject(new Error('Failed to parse Gemini analysis as JSON'));
              return;
            }

            resolve(json);
          } catch (err) {
            log('ERROR', '[GEMINI_JUDGE] Response parse failed', { error: err.message, raw: data.slice(0, 500) });
            reject(new Error('Failed to parse Gemini response'));
          }
        });
      }
    );

    req.on('error', (err) => {
      log('ERROR', '[GEMINI_JUDGE] Request failed', { error: err.message });
      reject(new Error(`Gemini request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      log('ERROR', '[GEMINI_JUDGE] Request timed out');
      reject(new Error('Gemini judge request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

function _extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.claims || !Array.isArray(parsed.claims)) {
      parsed.claims = [];
    }
    if (!parsed.missingFacts || !Array.isArray(parsed.missingFacts)) {
      parsed.missingFacts = [];
    }
    if (!parsed.falseClaims || !Array.isArray(parsed.falseClaims)) {
      parsed.falseClaims = [];
    }
    if (typeof parsed.sensationalism !== 'number') parsed.sensationalism = 0;
    if (typeof parsed.bias !== 'number') parsed.bias = 0;
    if (!parsed.overallVerdict) parsed.overallVerdict = 'PARTIALLY_TRUE';
    if (!parsed.summary) parsed.summary = '';

    return parsed;
  } catch {
    return null;
  }
}

module.exports = { judgeArticle, _buildPrompt };
