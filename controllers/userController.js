import { body, param } from 'express-validator';
import User from '../models/User.js';
import { validate } from '../middleware/validate.js';

export const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid ID'),
  body('role').optional().isIn(['admin', 'editor', 'viewer'])
];

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
};

export const updateUser = [updateUserValidation, validate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found', code: 404 });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
}];

export const deleteUserValidation = [param('id').isMongoId().withMessage('Invalid ID')];

export const deleteUser = [deleteUserValidation, validate, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
}];