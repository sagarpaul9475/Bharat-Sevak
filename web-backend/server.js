require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const providerRoutes = require('./routes/providerRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bharat-sevak' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/reports', reportRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bharat_sevak';

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Bharat Sevak API running on ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
