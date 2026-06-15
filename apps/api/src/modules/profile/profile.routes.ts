import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { getReferralHandler, listRewardsHandler, updateProfileHandler } from './profile.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/rewards', (req, res) => {
  void listRewardsHandler(req, res);
});

router.get('/referral', (req, res) => {
  void getReferralHandler(req, res);
});

router.patch('/', (req, res) => {
  void updateProfileHandler(req, res);
});

export default router;
