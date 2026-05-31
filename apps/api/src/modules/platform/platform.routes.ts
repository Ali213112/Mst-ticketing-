import { Router } from 'express';
import { authenticateJWT, requirePlatformAdmin } from '../../middleware/auth.js';
import {
  createOrganisationHandler,
  deleteOrganisationHandler,
  getOrganisationHandler,
  listOrganisationsHandler,
  updateOrganisationHandler,
  updateOrganisationStatusHandler,
  verifyOrganisationHandler,
} from './platform-org.controller.js';

const router = Router();

router.use(authenticateJWT, requirePlatformAdmin);

router.get('/organisations', (req, res) => {
  void listOrganisationsHandler(req, res);
});

router.post('/organisations', (req, res) => {
  void createOrganisationHandler(req, res);
});

router.get('/organisations/:orgId', (req, res) => {
  void getOrganisationHandler(req, res);
});

router.patch('/organisations/:orgId', (req, res) => {
  void updateOrganisationHandler(req, res);
});

router.delete('/organisations/:orgId', (req, res) => {
  void deleteOrganisationHandler(req, res);
});

router.patch('/organisations/:orgId/status', (req, res) => {
  void updateOrganisationStatusHandler(req, res);
});

router.patch('/organisations/:orgId/verify', (req, res) => {
  void verifyOrganisationHandler(req, res);
});

export default router;
