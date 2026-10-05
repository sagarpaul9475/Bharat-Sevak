const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/provider', require('./routes/provider'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/upload', require('./routes/upload'));

// Do not serve uploads as static files: identity and business documents must
// only be accessible through the authenticated /api/upload/document endpoint.

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.io for real-time notifications
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined socket room`);
  });
  socket.on('disconnect', () => console.log('Socket disconnected'));
});
app.set('io', io);

// Connect to MongoDB and start
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedAdmin();
    server.listen(process.env.PORT || 4000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 4000}`);
    });
  })
  .catch(err => console.error('❌ MongoDB error:', err));

// Seed default admin
async function seedAdmin() {
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');
  const exists = await User.findOne({ role: 'admin' });
  if (!exists) {
    const hashed = await bcrypt.hash('admin@123', 12);
    await User.create({
      name: 'Bharat Sevak Admin',
      email: 'admin@bharatsevak.in',
      phone: '9999999999',
      password: hashed,
      role: 'admin',
      status: 'active',
    });
    console.log('✅ Default admin created: admin@bharatsevak.in / admin@123');
  }

  const Menu = require('./models/Menu');
  const menuCount = await Menu.countDocuments();
  if (menuCount === 0) {
    const adminUser = await User.findOne({ role: 'admin' });
    const defaultMenus = [
      { name: 'Food', icon: '🍲', type: 'product_category', level: 0 },
      { name: 'Vegetables', icon: '🥦', type: 'product_category', level: 0 },
      { name: 'Grocery', icon: '🛍️', type: 'product_category', level: 0 },
      { name: 'Cloth', icon: '👕', type: 'product_category', level: 0 },
      { name: 'Deliveryman', icon: '🛵', type: 'service_type', level: 0 },
      { name: 'Tuition', icon: '📚', type: 'service_type', level: 0 },
      { name: 'Electrician', icon: '🔧', type: 'service_type', level: 0 },
      { name: 'Sweeper', icon: '🧹', type: 'service_type', level: 0 },
      { name: 'Servant', icon: '🧑‍🍳', type: 'service_type', level: 0 },
    ];
    const createdMenus = await Menu.insertMany(defaultMenus.map(m => ({ ...m, createdBy: adminUser._id })));
    const food = createdMenus.find(m => m.name === 'Food');
    if (food) {
      await Menu.insertMany([
        { name: 'Sweet', icon: '🍬', type: 'product_category', parentId: food._id, level: 1, createdBy: adminUser._id },
        { name: 'Meal', icon: '🍱', type: 'product_category', parentId: food._id, level: 1, createdBy: adminUser._id },
        { name: 'Nutrition', icon: '💊', type: 'product_category', parentId: food._id, level: 1, createdBy: adminUser._id },
      ]);
    }
    const tuition = createdMenus.find(m => m.name === 'Tuition');
    if (tuition) {
      await Menu.insertMany([
        { name: 'Coaching', icon: '🏫', type: 'service_type', parentId: tuition._id, level: 1, createdBy: adminUser._id },
        { name: 'Home Tutor', icon: '🏠', type: 'service_type', parentId: tuition._id, level: 1, createdBy: adminUser._id },
      ]);
    }
    console.log('✅ Default menus seeded');
  }
}
