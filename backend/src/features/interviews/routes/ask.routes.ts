import { Router } from 'express';
import { AskController } from '../controllers/ask.controller';

const router = Router();

// Set or update candidate profile
router.post('/profile', AskController.setProfile);

// Get current profile
router.get('/profile', AskController.getProfile);

// Reset current profile
router.delete('/profile', AskController.resetProfile);

// Ask a question and get AI-generated answer
router.post('/ask', AskController.ask);

export default router;