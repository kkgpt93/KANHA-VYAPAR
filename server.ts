import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  clearAllOwnerStoreData,
  clearNotificationsInDb,
  deleteCustomer,
  deleteProduct,
  deleteStaffUser,
  getBootstrapData,
  markNotificationReadInDb,
  saveLicenseRecord,
  saveSettings,
  syncAllStoreData,
  upsertCustomer,
  upsertInvoice,
  upsertNotification,
  upsertProduct,
  upsertStaffUser,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Protected Store Data Endpoints (Supabase Auth JWT + PostgreSQL RLS)
  app.get('/api/store/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getBootstrapData(req.user!.uid, req.accessToken);
      res.json(data);
    } catch (error) {
      console.error('GET /api/store/bootstrap failed:', error);
      res.status(500).json({ error: 'Failed to load store data.' });
    }
  });

  app.post('/api/store/sync-all', requireAuth, async (req: AuthRequest, res) => {
    const body = req.body;
    if (
      !body ||
      typeof body !== 'object' ||
      !body.settings ||
      !Array.isArray(body.products) ||
      !Array.isArray(body.customers) ||
      !Array.isArray(body.invoices) ||
      !Array.isArray(body.staffUsers) ||
      !Array.isArray(body.notifications) ||
      !body.licenseState ||
      !Array.isArray(body.generatedKeys) ||
      !body.creatorConfig
    ) {
      res.status(400).json({ error: 'Invalid store synchronization payload.' });
      return;
    }

    try {
      await syncAllStoreData(req.user!.uid, body, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('POST /api/store/sync-all failed:', error);
      res.status(500).json({ error: 'Failed to sync store data.' });
    }
  });

  app.put('/api/store/settings', requireAuth, async (req: AuthRequest, res) => {
    const { settings, colorTheme } = req.body || {};
    if (!settings || typeof settings !== 'object' || typeof settings.storeName !== 'string') {
      res.status(400).json({ error: 'Invalid settings payload.' });
      return;
    }
    try {
      await saveSettings(req.user!.uid, settings, colorTheme || 'peacock', req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/settings failed:', error);
      res.status(500).json({ error: 'Failed to save store settings.' });
    }
  });

  app.put('/api/store/products/:id', requireAuth, async (req: AuthRequest, res) => {
    const product = req.body;
    const paramId = String(req.params.id || '').trim();
    if (!paramId || !product || typeof product !== 'object' || typeof product.name !== 'string') {
      res.status(400).json({ error: 'Invalid product payload.' });
      return;
    }
    try {
      await upsertProduct(req.user!.uid, { ...product, id: paramId }, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/products/:id failed:', error);
      res.status(500).json({ error: 'Failed to save product.' });
    }
  });

  app.delete('/api/store/products/:id', requireAuth, async (req: AuthRequest, res) => {
    const paramId = String(req.params.id || '').trim();
    if (!paramId) {
      res.status(400).json({ error: 'Product ID is required.' });
      return;
    }
    try {
      await deleteProduct(req.user!.uid, paramId, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /api/store/products/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete product.' });
    }
  });

  app.put('/api/store/customers/:id', requireAuth, async (req: AuthRequest, res) => {
    const customer = req.body;
    const paramId = String(req.params.id || '').trim();
    if (!paramId || !customer || typeof customer !== 'object' || typeof customer.name !== 'string') {
      res.status(400).json({ error: 'Invalid customer payload.' });
      return;
    }
    try {
      await upsertCustomer(req.user!.uid, { ...customer, id: paramId }, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/customers/:id failed:', error);
      res.status(500).json({ error: 'Failed to save customer.' });
    }
  });

  app.delete('/api/store/customers/:id', requireAuth, async (req: AuthRequest, res) => {
    const paramId = String(req.params.id || '').trim();
    if (!paramId) {
      res.status(400).json({ error: 'Customer ID is required.' });
      return;
    }
    try {
      await deleteCustomer(req.user!.uid, paramId, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /api/store/customers/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete customer.' });
    }
  });

  app.put('/api/store/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
    const invoice = req.body;
    const paramId = String(req.params.id || '').trim();
    if (
      !paramId ||
      !invoice ||
      typeof invoice !== 'object' ||
      typeof invoice.invoiceNumber !== 'string' ||
      !Array.isArray(invoice.items)
    ) {
      res.status(400).json({ error: 'Invalid invoice payload.' });
      return;
    }
    try {
      await upsertInvoice(req.user!.uid, { ...invoice, id: paramId }, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/invoices/:id failed:', error);
      res.status(500).json({ error: 'Failed to save invoice.' });
    }
  });

  app.put('/api/store/staff/:id', requireAuth, async (req: AuthRequest, res) => {
    const staff = req.body;
    const paramId = String(req.params.id || '').trim();
    if (!paramId || !staff || typeof staff !== 'object' || typeof staff.name !== 'string') {
      res.status(400).json({ error: 'Invalid staff payload.' });
      return;
    }
    try {
      await upsertStaffUser(req.user!.uid, { ...staff, id: paramId }, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/staff/:id failed:', error);
      res.status(500).json({ error: 'Failed to save staff member.' });
    }
  });

  app.delete('/api/store/staff/:id', requireAuth, async (req: AuthRequest, res) => {
    const paramId = String(req.params.id || '').trim();
    if (!paramId) {
      res.status(400).json({ error: 'Staff ID is required.' });
      return;
    }
    try {
      await deleteStaffUser(req.user!.uid, paramId, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /api/store/staff/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete staff member.' });
    }
  });

  app.put('/api/store/notifications/:id', requireAuth, async (req: AuthRequest, res) => {
    const notif = req.body;
    const paramId = String(req.params.id || '').trim();
    if (!paramId || !notif || typeof notif !== 'object' || typeof notif.title !== 'string') {
      res.status(400).json({ error: 'Invalid notification payload.' });
      return;
    }
    try {
      await upsertNotification(req.user!.uid, { ...notif, id: paramId }, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/notifications/:id failed:', error);
      res.status(500).json({ error: 'Failed to save notification.' });
    }
  });

  app.patch('/api/store/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    const paramId = String(req.params.id || '').trim();
    if (!paramId) {
      res.status(400).json({ error: 'Notification ID is required.' });
      return;
    }
    try {
      await markNotificationReadInDb(req.user!.uid, paramId, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('PATCH /api/store/notifications/:id/read failed:', error);
      res.status(500).json({ error: 'Failed to update notification.' });
    }
  });

  app.delete('/api/store/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      await clearNotificationsInDb(req.user!.uid, req.accessToken);
      res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /api/store/notifications failed:', error);
      res.status(500).json({ error: 'Failed to clear notifications.' });
    }
  });

  app.put('/api/store/license', requireAuth, async (req: AuthRequest, res) => {
    const { licenseState, generatedKeys, creatorConfig } = req.body || {};
    if (
      !licenseState ||
      typeof licenseState !== 'object' ||
      !Array.isArray(generatedKeys) ||
      !creatorConfig ||
      typeof creatorConfig !== 'object'
    ) {
      res.status(400).json({ error: 'Invalid license payload.' });
      return;
    }
    try {
      await saveLicenseRecord(
        req.user!.uid,
        {
          licenseState,
          generatedKeys,
          creatorConfig,
        },
        req.accessToken
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('PUT /api/store/license failed:', error);
      res.status(500).json({ error: 'Failed to save license data.' });
    }
  });

  app.post('/api/store/clear', requireAuth, async (req: AuthRequest, res) => {
    const { settings, colorTheme, staffUsers } = req.body || {};
    if (!settings || !Array.isArray(staffUsers)) {
      res.status(400).json({ error: 'Invalid clear store payload.' });
      return;
    }
    try {
      await clearAllOwnerStoreData(
        req.user!.uid,
        {
          settings,
          colorTheme: colorTheme || 'peacock',
          staffUsers,
        },
        req.accessToken
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('POST /api/store/clear failed:', error);
      res.status(500).json({ error: 'Failed to clear store data.' });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VyaparPOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
});
