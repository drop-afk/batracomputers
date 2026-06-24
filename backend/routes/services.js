const express = require('express');
const { body, validationResult } = require('express-validator');
const { Types } = require('mongoose');
const Service = require('../models/Service');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const serviceValidation = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('category').isIn(['photocopy', 'homework', 'printing', 'tickets', 'other']).withMessage('Invalid category'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),
  body('priceUnit').optional().isIn(['per page', 'flat rate', 'per hour', 'per item']).withMessage('Invalid price unit'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('estimatedTime').optional().trim().isLength({ max: 50 }),
];

// GET /services — public
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ category: 1, name: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching services' });
  }
});

// POST /services — admin only; explicit field pick prevents mass assignment (Issue #11)
router.post('/', authenticate, authorize('owner'), serviceValidation, validate, async (req, res) => {
  try {
    const { name, description, category, basePrice, priceUnit, estimatedTime, isActive } = req.body;
    const service = new Service({ name, description, category, basePrice, priceUnit, estimatedTime, isActive });
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating service' });
  }
});

// PUT /services/:id — admin only; explicit field pick (Issue #11)
router.put('/:id', authenticate, authorize('owner'), serviceValidation, validate, async (req, res) => {
  try {
    const { name, description, category, basePrice, priceUnit, estimatedTime, isActive } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description, category, basePrice, priceUnit, estimatedTime, isActive },
      { new: true, runValidators: true }
    );
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating service' });
  }
});

// DELETE /services/:id — soft delete (admin only)
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deactivated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deactivating service' });
  }
});

module.exports = router;
