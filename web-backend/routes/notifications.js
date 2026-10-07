const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id }).sort('-createdAt').limit(limit).lean(),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Could not load notifications' });
  }
});

router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ message: 'All notifications marked as read', updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Could not update notifications' });
  }
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Could not update notification' });
  }
});

module.exports = router;
