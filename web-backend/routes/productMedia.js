const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 6 },
});

const mediaUpload = (req, res, next) => {
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Invalid product media upload' });
    next();
  });
};

const uploadBuffer = (buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) return reject(error);
    resolve(result);
  });
  stream.end(buffer);
});

router.post('/product-media', verifyToken, mediaUpload, async (req, res) => {
  const images = req.files?.images || [];
  const videos = req.files?.video || [];
  const uploadedAssets = [];
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ message: 'Product media storage is not configured. Please contact support.' });
    }
    for (const file of images) {
      if (file.size > 5 * 1024 * 1024) throw new Error('Each product image must be 5MB or smaller');
    }
    for (const file of videos) {
      if (file.size > 20 * 1024 * 1024) throw new Error('Product video must be 20MB or smaller');
    }

    const providerId = String(req.user._id);
    const imageUrls = await Promise.all(images.map(async file => {
      const result = await uploadBuffer(file.buffer, {
        folder: `bharat-sevak/products/${providerId}/images`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      });
      uploadedAssets.push({ public_id: result.public_id, resource_type: result.resource_type });
      return result.secure_url;
    }));

    let videoUrl = '';
    if (videos[0]) {
      const result = await uploadBuffer(videos[0].buffer, {
        folder: `bharat-sevak/products/${providerId}/videos`,
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov'],
      });
      uploadedAssets.push({ public_id: result.public_id, resource_type: result.resource_type });
      videoUrl = result.secure_url;
    }
    return res.status(201).json({ images: imageUrls, videoUrl });
  } catch (err) {
    await Promise.all(uploadedAssets.map(asset =>
      cloudinary.uploader.destroy(asset.public_id, { resource_type: asset.resource_type }).catch(() => null)
    ));
    const invalid = /5MB|20MB|Maximum|Only one/.test(err.message || '');
    return res.status(invalid ? 400 : 502).json({
      message: invalid ? err.message : 'Could not upload product media. Please try again.',
    });
  }
});

module.exports = router;
