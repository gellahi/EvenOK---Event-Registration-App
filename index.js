require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { resolve } = require('path');
const fs = require('fs');
const Event = require('./models/Event');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('static'));

// MongoDB Connection with updated options
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  // Read the HTML file
  let htmlContent = fs.readFileSync(resolve(__dirname, 'pages/index.html'), 'utf8');

  // Replace the API key placeholder with the actual key from environment variables
  htmlContent = htmlContent.replace('GOOGLE_MAPS_API_KEY_PLACEHOLDER', process.env.GOOGLE_MAPS_API_KEY);

  // Send the modified HTML
  res.send(htmlContent);
});

// Create a new event
app.post('/api/events', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});