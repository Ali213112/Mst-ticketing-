import { Router } from 'express';
import {
  acceptInviteHandler,
  logoutHandler,
  meHandler,
  platformLoginHandler,
  refreshHandler,
  verifyHandler,
} from './auth.controller.js';
import { authenticateJWT } from '../../middleware/auth.js';

const router = Router();

router.post('/verify', (req, res) => {
  void verifyHandler(req, res);
});

router.post('/refresh', (req, res) => {
  void refreshHandler(req, res);
});

router.post('/logout', (req, res) => {
  void logoutHandler(req, res);
});

router.get('/me', authenticateJWT, (req, res) => {
  void meHandler(req, res);
});

router.post('/platform-login', (req, res) => {
  void platformLoginHandler(req, res);
});

router.post('/accept-invite', authenticateJWT, (req, res) => {
  void acceptInviteHandler(req, res);
});

export default router;
