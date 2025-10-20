const express = require('express');
const router = express.Router();
const { getTasks, updateTask } = require('../controllers/taskController');


router.get('/', getTasks);
router.put('/:id', updateTask);


module.exports = router;