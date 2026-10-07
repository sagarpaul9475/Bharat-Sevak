const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AdminMessage = require('../models/AdminMessage');
const Notification = require('../models/Notification');
const { verifyToken, requireRole } = require('../middleware/auth');
const { sendEmail, messageEmailHtml } = require('../utils/mailer');

const adminGuard = [verifyToken, requireRole('admin')];

function validateMessage(title, message) {
  if (!title || !String(title).trim()) return 'Title is required';
  if (!message || !String(message).trim()) return 'Message is required';
  if (String(title).length > 120) return 'Title must be 120 characters or fewer';
  if (String(message).length > 5000) return 'Message must be 5000 characters or fewer';
  return null;
}

async function resolveRecipients({ audience, recipientRole, recipientUser }) {
  if (audience === 'user') {
    const user = await User.findOne({
      _id: recipientUser,
      role: { $in: ['customer', 'provider'] },
    }).select('_id name email role').lean();
    if (!user) throw new Error('Customer or provider not found');
    return [user];
  }

  const filter = { role: audience === 'role' ? recipientRole : { $in: ['customer', 'provider'] } };
  if (audience === 'role' && !['customer', 'provider'].includes(recipientRole)) {
    throw new Error('Choose customer or provider for role-based messaging');
  }

  return User.find(filter).select('_id name email role').sort('createdAt').lean();
}

router.get('/messages', adminGuard, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const messages = await AdminMessage.find()
      .populate('recipientUser', 'name email role')
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .limit(limit)
      .lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Could not load message history' });
  }
});

router.get('/message-recipients', adminGuard, async (req, res) => {
  try {
    const role = ['customer', 'provider'].includes(req.query.role) ? req.query.role : { $in: ['customer', 'provider'] };
    const search = String(req.query.search || '').trim();
    const filter = { role };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(filter)
      .select('_id name email role businessName status')
      .sort('name')
      .limit(200)
      .lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Could not load message recipients' });
  }
});

router.post('/messages', adminGuard, async (req, res) => {
  try {
    const {
      title,
      message,
      channel = 'in_app',
      audience = 'all',
      recipientRole = '',
      recipientUser = null,
    } = req.body;

    const validationError = validateMessage(title, message);
    if (validationError) return res.status(400).json({ message: validationError });
    if (!['in_app', 'email', 'both'].includes(channel)) return res.status(400).json({ message: 'Invalid channel' });
    if (!['all', 'role', 'user'].includes(audience)) return res.status(400).json({ message: 'Invalid audience' });

    const recipients = await resolveRecipients({ audience, recipientRole, recipientUser });
    if (!recipients.length) return res.status(400).json({ message: 'No matching recipients found' });

    let emailSentCount = 0;
    let emailFailedCount = 0;

    if (channel === 'in_app' || channel === 'both') {
      await Notification.insertMany(recipients.map(user => ({
        recipient: user._id,
        title: String(title).trim(),
        message: String(message).trim(),
        type: 'system',
        link: '',
        metadata: { source: 'admin_message' },
      })), { ordered: false });
    }

    if (channel === 'email' || channel === 'both') {
      const recipientsWithEmail = recipients.filter(user => user.email);
      if (audience === 'user') {
        if (recipientsWithEmail[0]) {
          try {
            await sendEmail({
              to: recipientsWithEmail[0].email,
              subject: '[Bharat Sevak] ' + String(title).trim(),
              html: messageEmailHtml({
                title: String(title).trim(),
                message: String(message).trim(),
                recipientName: recipientsWithEmail[0].name,
              }),
            });
            emailSentCount = 1;
          } catch (error) {
            emailFailedCount = 1;
            console.error('Personal admin email failed:', error.message);
          }
        }
      } else {
        // Use BCC in small batches so recipients do not see one another's addresses.
        for (let i = 0; i < recipientsWithEmail.length; i += 50) {
          const batch = recipientsWithEmail.slice(i, i + 50);
          try {
            await sendEmail({
              to: process.env.EMAIL_USER || 'noreply@bharatsevak.in',
              bcc: batch.map(user => user.email),
              subject: '[Bharat Sevak] ' + String(title).trim(),
              html: messageEmailHtml({
                title: String(title).trim(),
                message: String(message).trim(),
              }),
            });
            emailSentCount += batch.length;
          } catch (error) {
            emailFailedCount += batch.length;
            console.error('Broadcast email batch failed:', error.message);
          }
        }
      }
    }

    const record = await AdminMessage.create({
      title: String(title).trim(),
      message: String(message).trim(),
      channel,
      audience,
      recipientRole: audience === 'role' ? recipientRole : '',
      recipientUser: audience === 'user' ? recipientUser : null,
      createdBy: req.user._id,
      recipientCount: recipients.length,
      emailSentCount,
      emailFailedCount,
    });

    res.status(201).json({
      message: 'Admin message sent',
      record,
      recipientCount: recipients.length,
      emailSentCount,
      emailFailedCount,
    });
  } catch (error) {
    console.error('Admin message error:', error);
    res.status(500).json({ message: error.message || 'Could not send admin message' });
  }
});

module.exports = router;
