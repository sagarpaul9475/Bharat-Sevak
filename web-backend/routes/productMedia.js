const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'products', String(req.user._id));
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, String(Date.now()) + '-' + String(Math.round(Math.random() * 1e6)) + ext);
  },
});

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const videoExtensions = new Set(['.mp4', '.webm', '.mov']);

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const validImage = imageTypes.has(file.mimetype) && imageExtensions.has(extension);
  const validVideo = videoTypes.has(file.mimetype) && videoExtensions.has(extension);
  if (validImage || validVideo) return cb(null, true);
  return cb(new Error('Product media must be JPG, PNG, WEBP images or MP4, WEBM, MOV video'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 6 },
});

router.post('/product-media', verifyToken, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 },
]), async (req, res) => {
  const files = [...(req.files?.images || []), ...(req.files?.video || [])];
  try {
    const images = req.files?.images || [];
    const videos = req.files?.video || [];

    if (images.length > 5) throw new Error('Maximum 5 product images are allowed');
    if (videos.length > 1) throw new Error('Only one product video is allowed');

    for (const file of images) {
      if (file.size > 5 * 1024 * 1024) throw new Error('Each product image must be 5MB or smaller');
    }
    for (const file of videos) {
      if (file.size > 20 * 1024 * 1024) throw new Error('Product video must be 20MB or smaller');
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const imageUrls = images.map(file => baseUrl + '/uploads/products/' + req.user._id + '/' + encodeURIComponent(file.filename));
    const videoUrl = videos[0]
      ? baseUrl + '/uploads/products/' + req.user._id + '/' + encodeURIComponent(videos[0].filename)
      : '';

    res.status(201).json({ images: imageUrls, videoUrl });
  } catch (err) {
    for (const file of files) {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
    res.status(400).json({ message: err.message || 'Could not upload product media' });
  }
});

module.exports = router;
