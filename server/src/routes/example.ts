import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';
import { requestLogger } from '../middleware/logger.js';
import { metricsMiddleware } from '../middleware/metrics.js';
import { recordAiCall } from '../middleware/metrics.js';

const router = Router();

// Apply middleware globally for this router
router.use(requestLogger);
router.use(metricsMiddleware);

// Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const transactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
});

const aiPromptSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().optional().default('gpt-4'),
});

// POST /auth/login
router.post(
  '/auth/login',
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.validatedBody;
      // In real app, verify credentials and generate JWT
      res.json({
        success: true,
        token: 'dummy-jwt-token',
        user: { email },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /transaction
router.post(
  '/transaction',
  validateBody(transactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, currency } = req.validatedBody;
      res.json({
        success: true,
        transaction: {
          id: 'txn-' + Date.now(),
          amount,
          currency,
          status: 'processed',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /ai/prompt
router.post(
  '/ai/prompt',
  validateBody(aiPromptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt, model } = req.validatedBody;

      // Simulate AI call cost (in cents)
      const costCents = Math.floor(Math.random() * 10 + 1);
      recordAiCall({ model, costCents });

      res.json({
        success: true,
        response: `AI response for: ${prompt}`,
        model,
        costCents,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
