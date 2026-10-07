const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ProviderQuery = require('../models/ProviderQuery');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyRole, notifyUser } = require('../utils/notifications');
const { sendEmail, providerQueryEmailHtml } = require('../utils/mailer');

const providerGuard = [verifyToken, requireRole('provider')];
const adminGuard = [verifyToken, requireRole('admin')];

router.post('/', providerGuard, async (req, res) => {
  try {
    const { subject, details } = req.body;
    if (!subject || !String(subject).trim() || !details || !String(details).trim()) {
      return res.status(400).json({ message: 'Subject and details are required' });
    }
    if (String(subject).length > 160) return res.status(400).json({ message: 'Subject must be 160 characters or fewer' });
    if (String(details).length > 5000) return res.status(400).json({ message: 'Details must be 5000 characters or fewer' });

    const provider = await User.findById(req.user._id).select('name businessName email').lean();
    const query = await ProviderQuery.create({
      provider: req.user._id,
      subject: String(subject).trim(),
      details: String(details).trim(),
    });

    const adminUser = await User.findOne({ role: 'admin' }).select('email').lean();
    if (adminUser?.email) {
      try {
        await sendEmail({
          to: adminUser.email,
          subject: '[Provider Query] ' + query.queryId + ': ' + query.subject,
          html: providerQueryEmailHtml({
            queryId: query.queryId,
            providerName: provider?.businessName || provider?.name || 'Provider',
            providerEmail: provider?.email || '',
            subject: query.subject,
            details: query.details,
            status: query.status,
          }),
        });
        query.emailSentToAdmin = true;
      } catch (error) {
        console.error('Provider query admin email failed:', error.message);
      }
    }

    await notifyRole('admin', {
      title: 'New provider query',
      message: (provider?.businessName || provider?.name || 'A provider') + ' sent a query: ' + query.subject,
      type: 'grievance',
      link: '/admin/provider-queries',
      metadata: { queryId: String(query._id), queryCode: query.queryId },
    });

    await query.save();
    res.status(201).json(query);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not submit query' });
  }
});

router.get('/mine', providerGuard, async (req, res) => {
  try {
    const queries = await ProviderQuery.find({ provider: req.user._id }).sort('-createdAt').lean();
    res.json(queries);
  } catch (error) {
    res.status(500).json({ message: 'Could not load your queries' });
  }
});

router.get('/admin', adminGuard, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const queries = await ProviderQuery.find(filter)
      .populate('provider', 'name businessName email phone')
      .sort('-createdAt')
      .lean();
    res.json(queries);
  } catch (error) {
    res.status(500).json({ message: 'Could not load provider queries' });
  }
});

router.put('/admin/:id', adminGuard, async (req, res) => {
  try {
    const { status, adminReply } = req.body;
    const allowed = ['open', 'in_review', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid query status' });

    const query = await ProviderQuery.findById(req.params.id).populate('provider', 'name businessName email').exec();
    if (!query) return res.status(404).json({ message: 'Provider query not found' });

    query.status = status;
    if (adminReply !== undefined) {
      query.adminReply = String(adminReply).trim().slice(0, 5000);
      query.repliedAt = query.adminReply ? new Date() : null;
    }

    if (query.provider?.email && query.adminReply) {
      try {
        await sendEmail({
          to: query.provider.email,
          subject: '[Bharat Sevak Support] ' + query.queryId + ': ' + query.subject,
          html: providerQueryEmailHtml({
            queryId: query.queryId,
            providerName: query.provider.businessName || query.provider.name,
            providerEmail: query.provider.email,
            subject: query.subject,
            details: query.details,
            adminReply: query.adminReply,
            status: query.status,
          }),
        });
        query.emailSentToProvider = true;
      } catch (error) {
        console.error('Provider query reply email failed:', error.message);
      }

      await notifyUser(query.provider._id, {
        title: 'Admin replied to your query',
        message: 'Your provider query "' + query.subject + '" has a response from admin.',
        type: 'grievance',
        link: '/provider/queries',
        metadata: { queryId: String(query._id), queryCode: query.queryId },
      });
    }

    await query.save();
    res.json(query);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not update provider query' });
  }
});

module.exports = router;
