const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { listCharactersHandler, recruitCharacterHandler, appointCharacterHandler, listCharacterTemplatesHandler } = require('../../controllers/journalist.controller');

const characterRouter = Router();

characterRouter.get('/', authRequired, listCharactersHandler);
characterRouter.get('/templates', authRequired, listCharacterTemplatesHandler);
characterRouter.post('/recruit', authRequired, recruitCharacterHandler);
characterRouter.post('/appoint', authRequired, appointCharacterHandler);

module.exports = { characterRouter };
