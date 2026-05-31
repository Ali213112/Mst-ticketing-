import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import {
  acceptInviteHandler,
  getOrgBySlugHandler,
  getOrgProfileHandler,
  listMyOrgsHandler,
} from './org.controller.js';

const router = Router();

/**
 * Public routes (no auth required)
 */
// GET /api/orgs/slug/:slug  — public org profile lookup
router.get('/slug/:slug', (req, res) => {
  void getOrgBySlugHandler(req, res);
});

/**
 * Authenticated routes
 */
router.use(authenticateJWT);

// GET /api/orgs/me  — list all orgs the authenticated user belongs to
router.get('/me', (req, res) => {
  void listMyOrgsHandler(req, res);
});

// POST /api/orgs/accept-invite  — accept an org invite by token
router.post('/accept-invite', (req, res) => {
  void acceptInviteHandler(req, res);
});

// GET /api/orgs/:orgId  — get org profile (member only)
router.get('/:orgId', (req, res) => {
  void getOrgProfileHandler(req, res);
});

export default router;
