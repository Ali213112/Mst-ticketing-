import { Router } from 'express';
import { ROLES } from '@ticketchain/shared';
import {
  authenticateJWT,
  requireMinRole,
  requireOrgMembership,
  resolveOrgContext,
} from '../../middleware/auth.js';
import {
  cancelEventHandler,
  createEventHandler,
  createTierHandler,
  deleteEventHandler,
  deleteTierHandler,
  deployEventHandler,
  endEventHandler,
  getEventHandler,
  goLiveEventHandler,
  listEventsHandler,
  listTiersHandler,
  publishEventHandler,
  updateEventHandler,
  updateTierHandler,
  uploadBannerHandler,
  uploadTierImageHandler,
} from './admin-event.controller.js';
import {
  getOrganisationHandler,
  inviteMemberHandler,
  listInvitesHandler,
  listMembersHandler,
  removeMemberHandler,
  submitKycHandler,
  updateMemberHandler,
  updateOrganisationHandler,
} from './admin-org.controller.js';

const router = Router();

router.use(authenticateJWT, resolveOrgContext, requireOrgMembership, requireMinRole(ROLES.ADMIN));

router.get('/organisation', (req, res) => {
  void getOrganisationHandler(req, res);
});

router.patch('/organisation', requireMinRole(ROLES.SUPER_ADMIN), (req, res) => {
  void updateOrganisationHandler(req, res);
});

router.patch('/organisation/kyc', requireMinRole(ROLES.SUPER_ADMIN), (req, res) => {
  void submitKycHandler(req, res);
});

router.get('/members', (req, res) => {
  void listMembersHandler(req, res);
});

router.post('/members/invite', (req, res) => {
  void inviteMemberHandler(req, res);
});

router.get('/members/invites', (req, res) => {
  void listInvitesHandler(req, res);
});

router.patch('/members/:memberId', (req, res) => {
  void updateMemberHandler(req, res);
});

router.delete('/members/:memberId', (req, res) => {
  void removeMemberHandler(req, res);
});

router.get('/events', (req, res) => {
  void listEventsHandler(req, res);
});

router.post('/events', (req, res) => {
  void createEventHandler(req, res);
});

router.get('/events/:eventId', (req, res) => {
  void getEventHandler(req, res);
});

router.patch('/events/:eventId', (req, res) => {
  void updateEventHandler(req, res);
});

router.delete('/events/:eventId', requireMinRole(ROLES.SUPER_ADMIN), (req, res) => {
  void deleteEventHandler(req, res);
});

router.post('/events/:eventId/upload-banner', (req, res) => {
  void uploadBannerHandler(req, res);
});

router.post('/events/:eventId/deploy', (req, res) => {
  void deployEventHandler(req, res);
});

router.post('/events/:eventId/publish', (req, res) => {
  void publishEventHandler(req, res);
});

router.post('/events/:eventId/go-live', (req, res) => {
  void goLiveEventHandler(req, res);
});

router.post('/events/:eventId/end', (req, res) => {
  void endEventHandler(req, res);
});

router.post('/events/:eventId/cancel', (req, res) => {
  void cancelEventHandler(req, res);
});

router.get('/events/:eventId/tiers', (req, res) => {
  void listTiersHandler(req, res);
});

router.post('/events/:eventId/tiers', (req, res) => {
  void createTierHandler(req, res);
});

router.patch('/events/:eventId/tiers/:tierId', (req, res) => {
  void updateTierHandler(req, res);
});

router.delete('/events/:eventId/tiers/:tierId', (req, res) => {
  void deleteTierHandler(req, res);
});

router.post('/events/:eventId/tiers/:tierId/upload-image', (req, res) => {
  void uploadTierImageHandler(req, res);
});

export default router;
