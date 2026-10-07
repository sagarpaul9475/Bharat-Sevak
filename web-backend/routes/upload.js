const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { notifyRole } = require('../utils/notifications');

// Store documents outside the public static directory. Access is controlled by
// the authenticated document endpoint below.
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.path.startsWith('/business') ? 'business' : 'kyc';
    const dir = path.join(__dirname, '..', 'uploads', String(req.user._id), type);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.pdf', '.webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'application/pdf', 'image/webp']);

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) return cb(null, true);
  return cb(new Error('Only JPG, PNG, WEBP, and PDF files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

router.post('/kyc', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const allowedTypes = ['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license', 'other'];
    const docType = allowedTypes.includes(req.body.docType) ? req.body.docType : 'aadhaar';
    const doc = {
      filename: req.file.filename,
      originalName: path.basename(req.file.originalname),
      docType,
      uploadedAt: new Date(),
    };
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { kycDocs: doc }, $set: { isVerified: false, status: 'pending' } },
      { new: true }
    ).select('kycDocs businessDocs');
    await notifyRole('admin', {
      title: 'Provider identity document submitted',
      message: `${req.user.businessName || req.user.name} uploaded an identity document for verification.`,
      type: 'verification',
      link: '/admin/approvals',
      metadata: { providerId: String(req.user._id), documentType: docType },
    });
    res.status(201).json({ message: 'Identity document uploaded', doc: user.kycDocs[user.kycDocs.length - 1], kycDocs: user.kycDocs });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Could not save identity document' });
  }
});

router.post('/business', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const allowedTypes = ['shop_photo', 'trade_license', 'gst_certificate', 'fssai', 'rent_agreement', 'other'];
    const docType = allowedTypes.includes(req.body.docType) ? req.body.docType : 'shop_photo';
    const doc = {
      filename: req.file.filename,
      originalName: path.basename(req.file.originalname),
      docType,
      uploadedAt: new Date(),
    };
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { businessDocs: doc }, $set: { isVerified: false, status: 'pending' } },
      { new: true }
    ).select('kycDocs businessDocs');
    await notifyRole('admin', {
      title: 'Business verification document submitted',
      message: `${req.user.businessName || req.user.name} uploaded business proof for verification.`,
      type: 'verification',
      link: '/admin/approvals',
      metadata: { providerId: String(req.user._id), documentType: docType },
    });
    res.status(201).json({ message: 'Business verification document uploaded', doc: user.businessDocs[user.businessDocs.length - 1], businessDocs: user.businessDocs });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Could not save business document' });
  }
});

// Private document access: the owner or an authenticated admin can retrieve a
// document. Never expose Aadhaar/KYC files through a public static URL.
router.get('/document/:userId/:category/:filename', verifyToken, async (req, res) => {
  try {
    const { userId, category, filename } = req.params;
    if (!['kyc', 'business'].includes(category) || path.basename(filename) !== filename) {
      return res.status(400).json({ message: 'Invalid document path' });
    }
    if (String(req.user._id) !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not allowed to access this document' });
    }

    const owner = await User.findById(userId).select('kycDocs businessDocs');
    if (!owner) return res.status(404).json({ message: 'Document owner not found' });
    const docs = category === 'kyc' ? owner.kycDocs : owner.businessDocs;
    const doc = docs.find((entry) => entry.filename === filename);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(__dirname, '..', 'uploads', userId, category, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File is no longer available on this server. Please upload it again.' });

    res.download(filePath, path.basename(doc.originalName || filename));
  } catch (err) {
    res.status(500).json({ message: 'Could not retrieve document' });
  }
});

async function deleteDocument(req, res, category) {
  try {
    const field = category === 'kyc' ? 'kycDocs' : 'businessDocs';
    const user = await User.findById(req.user._id).select(field);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const filename = req.params.filename;
    if (path.basename(filename) !== filename) return res.status(400).json({ message: 'Invalid filename' });
    const doc = user[field].find((entry) => entry.filename === filename);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(__dirname, '..', 'uploads', String(req.user._id), category, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { [field]: { filename } },
      $set: { isVerified: false, status: 'pending' },
    });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete document' });
  }
}

router.delete('/kyc/:filename', verifyToken, (req, res) => deleteDocument(req, res, 'kyc'));
router.delete('/business/:filename', verifyToken, (req, res) => deleteDocument(req, res, 'business'));

router.get('/my-docs', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycDocs businessDocs');
    res.json({ kycDocs: user?.kycDocs || [], businessDocs: user?.businessDocs || [] });
  } catch (err) {
    res.status(500).json({ message: 'Could not load documents' });
  }
});

module.exports = router;
