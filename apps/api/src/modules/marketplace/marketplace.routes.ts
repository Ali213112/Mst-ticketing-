import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { buyListingHandler, listMarketplaceHandler } from './marketplace.controller.js';

const router = Router();

router.get('/', (req, res) => {
  void listMarketplaceHandler(req, res);
});

router.post('/:listingId/buy', authenticateJWT, (req, res) => {
  void buyListingHandler(req, res);
});

export default router;
