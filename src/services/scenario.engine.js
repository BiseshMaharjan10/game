const { TEMPLATES } = require('../data/scenarioTemplates');
const POOLS = require('../data/scenarioData');

function _pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function _resolvePool(name) {
  return POOLS[name] || [];
}

function _fillTemplate(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{${key}}`);
}

function _generateId() {
  return 'scn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function _generateItemId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

function _pickEvidence(template, vars, count) {
  const pool = template.evidencePool || [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((e, i) => ({
    id: _generateItemId('ev'),
    type: e.type,
    title: e.type,
    description: _fillTemplate(e.descTemplate, vars),
    difficulty: Math.floor(Math.random() * 51) + 25,
  }));
}

function _pickWitnesses(template, vars, count) {
  const pool = template.witnesses || [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((w, i) => ({
    id: _generateItemId('wi'),
    type: w.type,
    description: w.description ? _fillTemplate(w.description, vars) : '',
  }));
}

function _buildFacts(template, vars, truth) {
  const facts = {};
  const structure = template.factStructure || {};
  for (const [key, config] of Object.entries(structure)) {
    if (config.truth !== undefined) {
      facts[key] = truth;
    } else if (config.from) {
      facts[key] = truth ? vars[config.from] : null;
    } else {
      facts[key] = null;
    }
  }
  return facts;
}

function _buildSuspects(template, vars) {
  return (template.suspects || []).map(s => ({
    role: s.role,
    label: s.label,
    identity: vars[s.source] || 'Unknown',
  }));
}

function generateScenario(roomId) {
  const template = _pick(TEMPLATES);
  const vars = {};
  for (const v of template.variables) {
    const pool = _resolvePool(v.pool);
    vars[v.name] = pool.length > 0 ? _pick(pool) : `[${v.name}]`;
  }

  const truth = Math.random() <= template.truthProbability;
  const tipPool = truth ? template.tipTemplates.true : template.tipTemplates.false;
  const tipText = _fillTemplate(_pick(tipPool), vars);

  const evidenceCount = Math.floor(Math.random() * 3) + 1;
  const witnessCount = template.witnesses ? Math.floor(Math.random() * 2) + 1 : 0;

  const scenario = {
    scenarioId: _generateId(),
    roomId,
    category: _pick(template.categories),
    createdAt: new Date().toISOString(),
    truth,
    anonymousTip: tipText,
    hiddenFacts: _buildFacts(template, vars, truth),
    evidence: _pickEvidence(template, vars, evidenceCount),
    suspects: _buildSuspects(template, vars),
    witnesses: _pickWitnesses(template, vars, witnessCount),
    status: 'active',
    templateId: template.id,
    templateVars: { ...vars },
  };

  return scenario;
}

function getPublicScenario(scenario) {
  if (!scenario) return null;
  return {
    scenarioId: scenario.scenarioId,
    anonymousTip: scenario.anonymousTip,
    category: scenario.category,
    status: scenario.status,
  };
}

function getFullScenario(scenario) {
  if (!scenario) return null;
  return { ...scenario };
}

module.exports = {
  generateScenario,
  getPublicScenario,
  getFullScenario,
};
