const tasks = require('../data/tasks.json');


exports.getTasks = (req, res) => {
const lang = req.query.lang || 'bn';
const formatted = tasks.map(t => ({
id: t.id,
title: lang === 'en' ? t.title_en : t.title_bn,
description: lang === 'en' ? t.description_en : t.description_bn,
productionValue: t.productionValue,
completed: t.completed
}));
res.json(formatted);
}


exports.updateTask = (req, res) => {
const id = parseInt(req.params.id);
const task = tasks.find(t => t.id === id);
if(!task) return res.status(404).json({message:"Task not found"});
task.completed = req.body.completed ?? task.completed;
res.json({message:"Task updated", task});
}