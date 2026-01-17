import { Router } from 'express';
import RateLimit from 'express-rate-limit';
import { protect, restrictTo, verifyRefresh } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as posts from '../controllers/postController.js';

const router = Router();

const limiter = RateLimit({ windowMs: 15 * 60 * 1000, max: 100 });  // Global 100/15m
const authLimiter = RateLimit({ windowMs: 60 * 1000, max: 5 });  // Auth 5/min

router.use(limiter);

// Public with limit
router.post('/register', authLimiter, auth.register);
router.post('/login', authLimiter, auth.login);

// Protected
router.use(protect);

router.post('/refresh', verifyRefresh, auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', auth.me);

router.get('/users', restrictTo('admin'), users.getUsers);
router.put('/users/:id', restrictTo('admin'), users.updateUser);
router.delete('/users/:id', restrictTo('admin'), users.deleteUser);

router.get('/posts', posts.getPosts);
router.post('/posts', restrictTo('admin', 'editor'), posts.createPost);
router.put('/posts/:id', restrictTo('admin', 'editor'), posts.updatePost);
router.delete('/posts/:id', restrictTo('admin'), posts.deletePost);

export default router;