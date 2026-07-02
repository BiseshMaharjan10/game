const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { listCharactersHandler, recruitCharacterHandler } = require('../../controllers/journalist.controller');

const journalistRouter = Router();

journalistRouter.get('/', authRequired, listCharactersHandler);
journalistRouter.post('/hire', authRequired, recruitCharacterHandler);

module.exports = { journalistRouter };
