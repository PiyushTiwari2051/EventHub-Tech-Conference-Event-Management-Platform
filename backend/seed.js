require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const Booking = require('./models/Booking');
const Ticket = require('./models/Ticket');
const Announcement = require('./models/Announcement');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codeanova_events');
    console.log('Database connected for seeding...');

    // 1. Wipe database collections
    await User.deleteMany({});
    await Event.deleteMany({});
    await Seat.deleteMany({});
    await Booking.deleteMany({});
    await Ticket.deleteMany({});
    await Announcement.deleteMany({});
    console.log('Collections cleared.');

    // 2. Create Users
    const organizer = await User.create({
      name: 'Sarah Connor',
      email: 'organizer@codeanova.com',
      password: 'password123',
      role: 'organizer',
    });

    const attendee = await User.create({
      name: 'John Doe',
      email: 'attendee@codeanova.com',
      password: 'password123',
      role: 'attendee',
    });

    console.log('Demo Users Seeded:');
    console.log('  Organizer: organizer@codeanova.com (password123)');
    console.log('  Attendee: attendee@codeanova.com (password123)');

    // 3. Create Events
    const eventsData = [
      {
        title: 'Aether Music Festival 2026',
        description: 'An immersive experience with world-class artists performing under neon skies. Electronic, Indie, and Ambient beats.',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in future
        venue: 'Aegis Cyber Dome, SF',
        capacity: 40,
        priceTiers: [
          { name: 'VIP Lounge', price: 150, capacity: 10 },
          { name: 'General Admission', price: 60, capacity: 30 },
        ],
        organizer: organizer._id,
      },
      {
        title: 'Decentralized Web Summit',
        description: 'Explore the next generation of web technologies, agentic protocols, and decentralized intelligence.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in future
        venue: 'Pixel Theater, Austin',
        capacity: 30,
        priceTiers: [
          { name: 'VIP Circle', price: 299, capacity: 10 },
          { name: 'General Seat', price: 120, capacity: 20 },
        ],
        organizer: organizer._id,
      },
      {
        title: 'Global Design Expo',
        description: 'A global showcase of minimalism, high-aesthetic architecture, and functional human experiences.',
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days in future
        venue: 'Metropolitan Hall, NY',
        capacity: 20,
        priceTiers: [
          { name: 'All Access', price: 80, capacity: 20 },
        ],
        organizer: organizer._id,
      },
    ];

    for (const eData of eventsData) {
      const event = await Event.create(eData);

      // Generate seat layouts in bulk for this event
      const seatsToInsert = [];
      let rowChar = 65; // 'A'

      for (const tier of event.priceTiers) {
        const seatsPerRow = 10;
        const totalTierSeats = tier.capacity;
        const numRowsNeeded = Math.ceil(totalTierSeats / seatsPerRow);

        for (let r = 0; r < numRowsNeeded; r++) {
          const rowName = String.fromCharCode(rowChar);
          const startNumber = 1;
          const endNumber = Math.min(seatsPerRow, totalTierSeats - r * seatsPerRow);

          for (let num = startNumber; num <= endNumber; num++) {
            seatsToInsert.push({
              event: event._id,
              row: rowName,
              number: num,
              tier: tier.name,
              status: 'available',
            });
          }
          rowChar++;
        }
      }

      await Seat.insertMany(seatsToInsert);
      console.log(`Event "${event.title}" seeded with ${seatsToInsert.length} seats.`);
    }

    console.log('Database seeding successfully completed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDB();
