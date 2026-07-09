import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import {
  faucetHandler,
  getReferralHandler,
  getWalletHandler,
  linkWalletHandler,
  listRewardsHandler,
  updateProfileHandler,
} from './profile.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/wallet', (req, res) => {
  void getWalletHandler(req, res);
});

router.post('/wallet/link', (req, res) => {
  void linkWalletHandler(req, res);
});

router.get('/rewards', (req, res) => {
  void listRewardsHandler(req, res);
});

router.get('/referral', (req, res) => {
  void getReferralHandler(req, res);
});

router.patch('/', (req, res) => {
  void updateProfileHandler(req, res);
});

router.post('/faucet', (req, res) => {
  void faucetHandler(req, res);
});

export default router;
