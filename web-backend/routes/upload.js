const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// ── Setup upload directories ─────────────────────────────────────────────
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.docCategory === 'business' ? 'business' : 'kyc';
    const dir = path.join(__dirname, '..', 'uploads', String(req.user._id), type);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Only JPG, PNG, PDF, WEBP files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── POST /api/upload/kyc  ─────────────────────────────────────────────────
router.post('/kyc', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { docType = 'aadhaar' } = req.body;
    const url = `/uploads/${req.user._id}/kyc/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { kycDocs: { filename: req.file.filename, originalName: req.file.originalname, docType, url } } },
      { new: true }
    ).select('kycDocs businessDocs');

    res.json({ message: 'KYC document uploaded', doc: user.kycDocs[user.kycDocs.length - 1], kycDocs: user.kycDocs });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/upload/business  ─────────────────────────────────────────────
router.post('/business', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { docType = 'shop_photo' } = req.body;
    const url = `/uploads/${req.user._id}/business/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { businessDocs: { filename: req.file.filename, originalName: req.file.originalname, docType, url } } },
      { new: true }
    ).select('kycDocs businessDocs');

    res.json({ message: 'Business document uploaded', doc: user.businessDocs[user.businessDocs.length - 1], businessDocs: user.businessDocs });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/upload/kyc/:filename  ─────────────────────────────────────
router.delete('/kyc/:filename', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const doc = user.kycDocs.find(d => d.filename === req.params.filename);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(__dirname, '..', 'uploads', String(req.user._id), 'kyc', req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await User.findByIdAndUpdate(req.user._id, { $pull: { kycDocs: { filename: req.params.filename } } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/upload/business/:filename  ─────────────────────────────────
router.delete('/business/:filename', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const doc = user.businessDocs.find(d => d.filename === req.params.filename);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(__dirname, '..', 'uploads', String(req.user._id), 'business', req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await User.findByIdAndUpdate(req.user._id, { $pull: { businessDocs: { filename: req.params.filename } } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET: Provider's own docs ─────────────────────────────────────────────
router.get('/my-docs', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycDocs businessDocs');
    res.json({ kycDocs: user.kycDocs || [], businessDocs: user.businessDocs || [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
