const Notification = require('../models/Notification');
const User = require('../models/User');

// Notifications should never cause the underlying order or verification action to fail.
async function notifyUser(recipient, { title, message, type = 'system', link = '', metadata = {} }) {
  try {
    if (!recipient || !title || !message) return null;
    return await Notification.create({ recipient, title, message, type, link, metadata });
  } catch (error) {
    console.error('Notification create failed:', error.message);
    return null;
  }
}

async function notifyRole(role, payload) {
  try {
    const users = await User.find({ role }).select('_id').lean();
    if (!users.length) return [];
    return await Notification.insertMany(users.map(user => ({
      recipient: user._id,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'system',
      link: payload.link || '',
      metadata: payload.metadata || {},
    })), { ordered: false });
  } catch (error) {
    console.error('Role notification create failed:', error.message);
    return [];
  }
}

module.exports = { notifyUser, notifyRole };
