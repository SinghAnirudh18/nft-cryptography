import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';

const router: Router = Router();

// Apply admin auth to all routes in this file
router.use(adminController.requireAdmin as any);

/**
 * @route  GET /admin/health
 * @desc   Returns indexer status, pending events, last processed block, db health
 * @access Admin (x-admin-secret header)
 */
router.get('/health', adminController.getHealth);

/**
 * @route  GET /admin/metrics
 * @desc   Prometheus-style metrics text endpoint for Grafana/dashboards
 * @access Admin
 */
router.get('/metrics', adminController.getMetrics);

/**
 * @route  GET /admin/contracts
 * @desc   List all registered contract addresses from DB
 * @access Admin
 */
router.get('/contracts', adminController.getContracts);

/**
 * @route  POST /admin/contracts
 * @desc   Upsert contract address (name, address, network)
 * @access Admin
 * @body   { name: 'nft'|'marketplace', address: '0x...', network: 'sepolia' }
 */
router.post('/contracts', adminController.upsertContract);

export default router;
