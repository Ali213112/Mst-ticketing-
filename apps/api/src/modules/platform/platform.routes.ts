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
import {
  approveSettlementHandler,
  blacklistHandler,
  getKpisHandler,
  listAuditHandler,
  listFraudHandler,
  listSettlementsHandler,
} from './platform-finance.controller.js';
import {
  getBlockchainHealth,
  listPlatformAdmins,
  listPlatformEvents,
  listPlatformRefunds,
  listPlatformTickets,
  reviewPlatformRefund,
} from './platform-catalog.service.js';

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

router.get('/kpis', (req, res) => {
  void getKpisHandler(req, res);
});

router.get('/settlements', (req, res) => {
  void listSettlementsHandler(req, res);
});

router.post('/settlements/:settlementId/approve', (req, res) => {
  void approveSettlementHandler(req, res);
});

router.get('/fraud', (req, res) => {
  void listFraudHandler(req, res);
});

router.post('/fraud/blacklist', (req, res) => {
  void blacklistHandler(req, res);
});

router.get('/audit', (req, res) => {
  void listAuditHandler(req, res);
});

router.get('/events', (req, res) => {
  void (async () => {
    const result = await listPlatformEvents(req.query as Record<string, string | undefined>);
    res.json({ success: true, data: result.rows, meta: result.meta });
  })();
});

router.get('/tickets', (req, res) => {
  void (async () => {
    const result = await listPlatformTickets(req.query as Record<string, string | undefined>);
    res.json({ success: true, data: result.rows, meta: result.meta });
  })();
});

router.get('/admins', (req, res) => {
  void (async () => {
    const data = await listPlatformAdmins();
    res.json({ success: true, data });
  })();
});

router.get('/refunds', (req, res) => {
  void (async () => {
    const data = await listPlatformRefunds();
    res.json({ success: true, data });
  })();
});

router.patch('/refunds/:refundId/review', (req, res) => {
  void (async () => {
    const { action } = req.body as { action?: 'approve' | 'reject' };
    if (!action) {
      res.status(400).json({ success: false, error: 'action required' });
      return;
    }
    const result = await reviewPlatformRefund(
      req.params.refundId as string,
      action,
      req.user?.userId ?? ''
    );
    if ('error' in result) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  })();
});

router.get('/blockchain/health', (req, res) => {
  void (async () => {
    const data = await getBlockchainHealth();
    res.json({ success: true, data });
  })();
});

export default router;
