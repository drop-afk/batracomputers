const express = require('express');
const { Types } = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /analytics/dashboard — admin only
router.get('/dashboard', authenticate, authorize('owner'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [todayBookings, weekBookings, monthBookings, totalBookings, completedBookings, pendingBookings, workers] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ createdAt: { $gte: weekAgo } }),
      Booking.countDocuments({ createdAt: { $gte: monthAgo } }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'pending' }),
      User.find({ role: 'worker' }).select('name completedTasks acceptedTasks rejectedTasks avgRating isActive')
    ]);

    // Popular services — use $ifNull to count finalCost or estimatedCost for revenue (Issue #27)
    const popularServices = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$serviceName',
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$finalCost', '$estimatedCost'] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      counts: { today: todayBookings, week: weekBookings, month: monthBookings, total: totalBookings, completed: completedBookings, pending: pendingBookings },
      popularServices,
      workers
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// GET /analytics/worker/:workerId — fixed require() inside runtime + ObjectId validation (Issue #13)
router.get('/worker/:workerId', authenticate, authorize('worker', 'owner'), async (req, res) => {
  try {
    // Validate ObjectId before using it (Issue #13)
    if (!Types.ObjectId.isValid(req.params.workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }

    if (req.user.role === 'worker' && req.user._id.toString() !== req.params.workerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const worker = await User.findById(req.params.workerId);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    // Use pre-imported Types instead of require() inside runtime (Issue #13)
    const workerObjectId = new Types.ObjectId(req.params.workerId);

    const [completedToday, completedWeek, totalCompleted, avgRatingAgg] = await Promise.all([
      Booking.countDocuments({ assignedTo: req.params.workerId, status: 'completed', completedAt: { $gte: today } }),
      Booking.countDocuments({ assignedTo: req.params.workerId, status: 'completed', completedAt: { $gte: weekAgo } }),
      Booking.countDocuments({ assignedTo: req.params.workerId, status: 'completed' }),
      Booking.aggregate([
        { $match: { assignedTo: workerObjectId, rating: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ]);

    res.json({
      worker: { name: worker.name, completedTasks: worker.completedTasks, avgRating: worker.avgRating },
      completedToday,
      completedWeek,
      totalCompleted,
      avgRating: avgRatingAgg[0]?.avg || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching worker analytics' });
  }
});

module.exports = router;
