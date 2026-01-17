import { body, param } from 'express-validator';
import Post from '../models/Post.js';
import { validate } from '../middleware/validate.js';

export const createPostValidation = [
  body('title').notEmpty().withMessage('Title required'),
  body('content').notEmpty().withMessage('Content required'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status')
];

export const getPosts = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { status: 'published' };
    const posts = await Post.find(filter).populate('author', 'name');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
};

export const createPost = [createPostValidation, validate, async (req, res) => {
  try {
    const post = await Post.create({ ...req.body, author: req.user.id, status: req.body.status || 'draft' });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
}];

export const updatePostValidation = [
  param('id').isMongoId().withMessage('Invalid ID'),
  body('title').optional().notEmpty(),
  body('content').optional().notEmpty(),
  body('status').optional().isIn(['draft', 'published'])
];

export const updatePost = [updatePostValidation, validate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found', code: 404 });
    if (post.author.toString() !== req.user.id && req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Forbidden', code: 403 });
    }
    Object.assign(post, req.body);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
}];

export const deletePostValidation = [param('id').isMongoId().withMessage('Invalid ID')];

export const deletePost = [deletePostValidation, validate, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500 });
  }
}];