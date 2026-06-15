import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import {
  checkoutHandler,
  getOrderHandler,
} from '../payments/payments.controller.js';
import {
  cancelResellHandler,
  getTicketHandler,
  getTicketPdfHandler,
  getTicketQrHandler,
  listMyTicketsHandler,
  mintHandler,
  resellTicketHandler,
  transferTicketHandler,
  validatePromoHandler,
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

router.post('/mint/validate-promo', (req, res) => {
  void validatePromoHandler(req, res);
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

router.get('/:ticketId/pdf', (req, res) => {
  void getTicketPdfHandler(req, res);
});

router.post('/:ticketId/transfer', (req, res) => {
  void transferTicketHandler(req, res);
});

router.post('/:ticketId/resell', (req, res) => {
  void resellTicketHandler(req, res);
});

router.delete('/:ticketId/resell', (req, res) => {
  void cancelResellHandler(req, res);
});

export default router;
