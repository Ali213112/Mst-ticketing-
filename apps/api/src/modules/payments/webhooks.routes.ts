import { Router } from 'express';
import { chainpayWebhookHandler, paymentsWebhookHandler } from './webhooks.controller.js';

const router = Router();

router.post('/chainpay', (req, res) => {
  void chainpayWebhookHandler(req, res);
});

router.post('/payments', (req, res) => {
  void paymentsWebhookHandler(req, res);
});

export default router;
