const { log } = require('../utils/logger');
const { BACKGROUND_NEWS } = require('../data/backgroundNewsTemplates');
const { GAMEPLAY } = require('../config/gameplay');

function _fillTemplate(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{${key}}`);
}

function _pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateBackgroundNews(templateId, templateVars) {
  const pool = BACKGROUND_NEWS[templateId];
  if (!pool || pool.length === 0) {
    return [];
  }

  const count = Math.floor(
    Math.random() * (GAMEPLAY.BACKGROUND_NEWS_MAX - GAMEPLAY.BACKGROUND_NEWS_MIN + 1)
  ) + GAMEPLAY.BACKGROUND_NEWS_MIN;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const news = selected.map(text => ({
    text: _fillTemplate(text, templateVars),
  }));

  log('INFO', '[NEWS] Background news generated', {
    templateId,
    count: news.length,
  });

  return news;
}

module.exports = { generateBackgroundNews };
