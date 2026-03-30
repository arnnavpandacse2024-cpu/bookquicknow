const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Explicit Environment Variable Check
if (!process.env.MONGODB_URI) {
  console.error('❌ FATAL ERROR: MONGODB_URI environment variable is not defined.');
  console.error('Please add it in your Render environment variables dashboard.');
}

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection Pooling for Serverless
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const db = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = db;
  return db;
}

// ─── MODELS ─────────────────────────────────────────

const MenuItemSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  emoji: String,
  available: { type: Boolean, default: true },
  discount: { type: Number, default: 0 },
});
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);

const FoodBookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  km: Number,
  mapUrl: String,
  items: Array,
  subtotal: Number,
  discount: Number,
  delivery: Number,
  total: Number,
  date: { type: Date, default: Date.now },
});
const FoodBooking = mongoose.models.FoodBooking || mongoose.model('FoodBooking', FoodBookingSchema);

const HallBookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  functionType: String,
  date: String,
  time: String,
  hours: Number,
  members: Number,
  cabin: Number,
  total: Number,
  bookedAt: { type: Date, default: Date.now },
});
const HallBooking = mongoose.models.HallBooking || mongoose.model('HallBooking', HallBookingSchema);

const SettingsSchema = new mongoose.Schema({
  upi: String,
  name: String,
  other: String,
  adminContact: String,
  address: String,
  kmPrices: Array,
  hallPricingMode: String,
  hallPriceAmount: Number,
  foodBookingOpen: { type: Boolean, default: true },
  hallBookingOpen: { type: Boolean, default: true },
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// ─── SEED DATA ─────────────────────────────────────────
async function seedData() {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        upi: 'bhaiyarestaurant@upi',
        name: 'Bhaiya Restaurant',
        other: 'Cash accepted at delivery',
        adminContact: '+91 9876543210',
        address: 'Gouda dhepa, down Front of old, Indian gas office, Kavisuryanagar, Boirani, Odisha 761104',
        kmPrices: [
          { upTo: 2, price: 20 },
          { upTo: 5, price: 25 },
          { upTo: 8, price: 30 },
          { upTo: 10, price: 40 },
        ],
        hallPricingMode: 'hour',
        hallPriceAmount: 500,
        foodBookingOpen: true,
        hallBookingOpen: true,
      });
      await settings.save();
      console.log('✅ Default settings seeded');
    }

    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      const defaultMenu = [
        { name: 'Paneer Butter Masala', category: 'Veg Main Course', price: 180, emoji: '🥘', available: true, discount: 5 },
        { name: 'Chicken Biryani', category: 'Non-Veg', price: 220, emoji: '🍗', available: true, discount: 0 },
        { name: 'Butter Naan', category: 'Breads', price: 40, emoji: '🫓', available: true, discount: 0 },
        { name: 'Gulab Jamun', category: 'Desserts', price: 60, emoji: '🍡', available: true, discount: 10 },
        { name: 'Cold Coffee', category: 'Beverages', price: 90, emoji: '🥤', available: true, discount: 0 },
      ];
      await MenuItem.insertMany(defaultMenu);
      console.log('✅ Default menu items seeded');
    }
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

// ─── MIDDLEWARE FOR DB CONNECTION ──────────────────
// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Use middleware to connect to DB
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ─── ROUTES ──────────────────────────────────────────

// Menu Items
app.get('/api/menu', async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', async (req, res) => {
  try {
    const newItem = new MenuItem(req.body);
    const saved = await newItem.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  try {
    const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookings
app.get('/api/bookings/food', async (req, res) => {
  try {
    const bookings = await FoodBooking.find().sort({ date: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/food', async (req, res) => {
  try {
    const newBooking = new FoodBooking(req.body);
    const saved = await newBooking.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/hall', async (req, res) => {
  try {
    const bookings = await HallBooking.find().sort({ bookedAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings/hall', async (req, res) => {
  try {
    const newBooking = new HallBooking(req.body);
    const saved = await newBooking.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        upi: 'bhaiyarestaurant@upi',
        name: 'Bhaiya Restaurant',
        other: 'Cash accepted at delivery',
        adminContact: '+91 9876543210',
        address: 'Gouda dhepa, down Front of old, Indian gas office, Kavisuryanagar, Boirani, Odisha 761104',
        kmPrices: [
          { upTo: 2, price: 20 },
          { upTo: 5, price: 25 },
          { upTo: 8, price: 30 },
          { upTo: 10, price: 40 },
        ],
        hallPricingMode: 'hour',
        hallPriceAmount: 500,
        foodBookingOpen: true,
        hallBookingOpen: true,
      });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Catch-all route to serve index.html for any frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
  
  // Start Server
  app.listen(PORT, async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      try {
        await connectToDatabase();
        await seedData();
        console.log('✅ Connected to MongoDB');
      } catch (err) {
        console.error('Initial setup error:', err);
      }
  });
