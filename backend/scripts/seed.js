require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/batra_booking');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Service.deleteMany({});
    await Booking.deleteMany({});

    // Create owner
    const owner = await User.create({
      name: 'Rahul Batra',
      email: 'owner@batracomputers.com',
      phone: '9876543210',
      password: 'admin123',
      role: 'owner'
    });

    // Create workers
    const worker1 = await User.create({
      name: 'Amit Sharma',
      email: 'amit@batracomputers.com',
      phone: '9876543211',
      password: 'worker123',
      role: 'worker'
    });

    const worker2 = await User.create({
      name: 'Priya Kumar',
      email: 'priya@batracomputers.com',
      phone: '9876543212',
      password: 'worker123',
      role: 'worker'
    });

    // Create services
    const services = await Service.insertMany([
      { name: 'Photocopy - B&W', description: 'Black and white photocopying', category: 'photocopy', basePrice: 2, priceUnit: 'per page', estimatedTime: '2 mins' },
      { name: 'Photocopy - Color', description: 'Color photocopying', category: 'photocopy', basePrice: 10, priceUnit: 'per page', estimatedTime: '3 mins' },
      { name: 'Print - B&W', description: 'Black and white printing', category: 'printing', basePrice: 3, priceUnit: 'per page', estimatedTime: '2 mins' },
      { name: 'Print - Color', description: 'Color printing', category: 'printing', basePrice: 15, priceUnit: 'per page', estimatedTime: '3 mins' },
      { name: 'Homework Help - Basic', description: 'Basic homework assistance and guidance', category: 'homework', basePrice: 50, priceUnit: 'per hour', estimatedTime: '1 hour' },
      { name: 'Homework Help - Advanced', description: 'Advanced homework assistance with detailed solutions', category: 'homework', basePrice: 100, priceUnit: 'per hour', estimatedTime: '1-2 hours' },
      { name: 'Train Ticket Booking', description: 'IRCTC train ticket booking assistance', category: 'tickets', basePrice: 30, priceUnit: 'flat rate', estimatedTime: '15 mins' },
      { name: 'Bus Ticket Booking', description: 'Bus ticket booking assistance', category: 'tickets', basePrice: 20, priceUnit: 'flat rate', estimatedTime: '10 mins' },
      { name: 'Flight Ticket Booking', description: 'Flight ticket booking assistance', category: 'tickets', basePrice: 50, priceUnit: 'flat rate', estimatedTime: '20 mins' },
      { name: 'Document Typing', description: 'Professional document typing service', category: 'other', basePrice: 20, priceUnit: 'per page', estimatedTime: '10 mins' },
      { name: 'Lamination', description: 'Document lamination service', category: 'other', basePrice: 30, priceUnit: 'per item', estimatedTime: '5 mins' },
      { name: 'Scanning', description: 'Document scanning to digital format', category: 'other', basePrice: 5, priceUnit: 'per page', estimatedTime: '2 mins' }
    ]);

    // Create sample bookings
    await Booking.insertMany([
      {
        customerName: 'Vikram Singh',
        customerEmail: 'vikram@gmail.com',
        customerPhone: '9988776655',
        serviceId: services[0]._id,
        serviceName: services[0].name,
        quantity: 20,
        estimatedCost: 40,
        status: 'pending',
        specialRequirements: 'Urgent, need by evening'
      },
      {
        customerName: 'Neha Gupta',
        customerEmail: 'neha@gmail.com',
        customerPhone: '8877665544',
        serviceId: services[2]._id,
        serviceName: services[2].name,
        quantity: 10,
        estimatedCost: 30,
        status: 'accepted',
        assignedTo: worker1._id,
        assignedWorkerName: worker1.name,
        assignedWorkerPhone: worker1.phone,
        acceptedAt: new Date()
      },
      {
        customerName: 'Ravi Patel',
        customerEmail: 'ravi@gmail.com',
        customerPhone: '7766554433',
        serviceId: services[4]._id,
        serviceName: services[4].name,
        quantity: 2,
        estimatedCost: 100,
        status: 'in_progress',
        assignedTo: worker2._id,
        assignedWorkerName: worker2.name,
        assignedWorkerPhone: worker2.phone,
        acceptedAt: new Date(Date.now() - 86400000)
      },
      {
        customerName: 'Sunita Devi',
        customerEmail: 'sunita@gmail.com',
        customerPhone: '6655443322',
        serviceId: services[6]._id,
        serviceName: services[6].name,
        quantity: 1,
        estimatedCost: 30,
        status: 'completed',
        assignedTo: worker1._id,
        assignedWorkerName: worker1.name,
        assignedWorkerPhone: worker1.phone,
        acceptedAt: new Date(Date.now() - 172800000),
        completedAt: new Date(Date.now() - 86400000),
        finalCost: 30,
        rating: 5,
        customerFeedback: 'Very helpful and quick service!'
      }
    ]);

    console.log('Seed data created successfully!');
    console.log('Owner: owner@batracomputers.com / admin123');
    console.log('Workers: amit@batracomputers.com / worker123, priya@batracomputers.com / worker123');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedData();
