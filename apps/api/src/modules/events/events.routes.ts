import { Router } from 'express';
import {
  getEventHandler,
  listEventsHandler,
  listTiersHandler,
} from './events.controller.js';

const router = Router();

router.get('/events', (req, res) => {
  void listEventsHandler(req, res);
});

router.get('/events/:eventId', (req, res) => {
  void getEventHandler(req, res);
});

router.get('/events/:eventId/tiers', (req, res) => {
  void listTiersHandler(req, res);
});

export default router;
