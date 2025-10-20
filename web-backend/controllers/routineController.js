const routines = require('../data/routines.json');


exports.getRoutine = (req, res) => {
const lang = req.query.lang || 'bn';
const formatted = routines.map(r => ({
id: r.id,
time: r.time,
activity: lang === 'en' ? r.activity_en : r.activity_bn
}));
res.json(formatted);
}