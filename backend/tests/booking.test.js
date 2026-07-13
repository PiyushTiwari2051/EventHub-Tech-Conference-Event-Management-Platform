const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');

const testMongoUri = 'mongodb://localhost:27017/codeanova_test_bookings';

let attendeeToken, organizerToken, eventId, seatId;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(testMongoUri);

  // Setup test organizer
  const orgRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Organizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer',
    });
  organizerToken = orgRes.body.token;

  // Setup test attendee
  const attRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Attendee',
      email: 'attendee@test.com',
      password: 'password123',
      role: 'attendee',
    });
  attendeeToken = attRes.body.token;

  // Setup test event via organizer token
  const eventRes = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      title: 'Test Live Rock',
      description: 'Super rock festival',
      date: new Date(),
      venue: 'Metrodome',
      capacity: 10,
      priceTiers: [{ name: 'Regular', price: 50, capacity: 10 }],
    });
  eventId = eventRes.body._id;

  // Find one generated seat
  const seat = await Seat.findOne({ event: eventId });
  seatId = seat._id;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Booking API Lifecycle Tests', () => {
  it('should book an available seat and return tickets with valid QR payload', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        eventId,
        seatIds: [seatId],
        paymentMethod: 'mock_credit_card',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.paymentStatus).toBe('paid');
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.tickets[0]).toHaveProperty('qrToken');

    const updatedSeat = await Seat.findById(seatId);
    expect(updatedSeat.status).toBe('booked');
  });

  it('should block booking attempts for already booked seats', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        eventId,
        seatIds: [seatId],
        paymentMethod: 'mock_credit_card',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('no longer available');
  });
});
