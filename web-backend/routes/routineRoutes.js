const express = require('express');
const router = express.Router();
const { getRoutine } = require('../controllers/routineController');


router.get('/', getRoutine);


module.exports = router;