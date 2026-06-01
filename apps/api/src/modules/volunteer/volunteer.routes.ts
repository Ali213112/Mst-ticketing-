import { Router } from 'express';
import { ROLES } from '@ticketchain/shared';
import { authenticateJWT, requireMinRole } from '../../middleware/auth.js';
import {
  verifyCheckinHandler,
  listVolunteerEventsHandler,
  getVolunteerEventHandler,
  getCheckinStatsHandler,
  getCheckinHistoryHandler,
  getOfflineSnapshotHandler,
} from './volunteer.controller.js';

const router = Router();

// All volunteer routes require authentication + at least VOLUNTEER role
router.use(authenticateJWT, requireMinRole(ROLES.VOLUNTEER));

// Core check-in verification
router.post('/checkin/verify', (req, res) => {
  void verifyCheckinHandler(req, res);
});

// Volunteer's assigned events
router.get('/events', (req, res) => {
  void listVolunteerEventsHandler(req, res);
});

// Single event detail with zone info
router.get('/events/:eventId', (req, res) => {
  void getVolunteerEventHandler(req, res);
});

// Real-time gate statistics
router.get('/checkin/stats', (req, res) => {
  void getCheckinStatsHandler(req, res);
});

// Paginated scan history
router.get('/checkin/history', (req, res) => {
  void getCheckinHistoryHandler(req, res);
});

// Offline snapshot download
router.get('/checkin/offline-snapshot', (req, res) => {
  void getOfflineSnapshotHandler(req, res);
});

export default router;
