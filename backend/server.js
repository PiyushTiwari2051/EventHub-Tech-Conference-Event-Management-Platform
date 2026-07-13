require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const ticketRoutes = require('./routes/tickets');
const analyticsRoutes = require('./routes/analytics');

const connectSeatSocket = require('./sockets/seatSocket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Share Socket.io globally in express context
app.set('io', io);

// Connect to MongoDB Atlas
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the NovaReserve Event Ticketing API' });
});

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.io Seat Reservation Handling
connectSeatSocket(io);

// Global Error Handler
app.use(errorHandler);

// Server Booting
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
