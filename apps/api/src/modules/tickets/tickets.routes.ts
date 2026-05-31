import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import {
  checkoutHandler,
  getOrderHandler,
} from '../payments/payments.controller.js';
import {
  getTicketHandler,
  getTicketQrHandler,
  listMyTicketsHandler,
  mintHandler,
} from './tickets.controller.js';

const router = Router();

router.use(authenticateJWT);

router.post('/checkout', (req, res) => {
  void checkoutHandler(req, res);
});

router.get('/orders/:orderId', (req, res) => {
  void getOrderHandler(req, res);
});

router.post('/mint', (req, res) => {
  void mintHandler(req, res);
});

router.get('/', (req, res) => {
  void listMyTicketsHandler(req, res);
});

router.get('/:ticketId', (req, res) => {
  void getTicketHandler(req, res);
});

router.get('/:ticketId/qr', (req, res) => {
  void getTicketQrHandler(req, res);
});

export default router;
