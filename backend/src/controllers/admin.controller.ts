/**
 * admin.controller.ts
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EventModel } from '../models/Event.js';
import { ContractRegistryModel } from '../models/ContractRegistry.js';

export function requireAdmin(req: Request, res: Response, next: Function) {
    const secret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}

export const getHealth = async (req: Request, res: Response) => {
    try {
        const dbState = mongoose.connection.readyState;
        const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

        const pendingEvents = await EventModel.countDocuments({ status: 'pending' });
        const failedEvents = await EventModel.countDocuments({ status: 'failed' });

        const lastProcessedEvent = await EventModel.findOne({ status: 'processed' })
            .sort({ blockNumber: -1, logIndex: -1 })
            .lean();

        const lastProcessedBlock = lastProcessedEvent?.blockNumber ?? null;

        const metrics = {
            events_pending_count: pendingEvents,
            failed_events: failedEvents,
            last_processed_block: lastProcessedBlock,
            db_status: dbStatus,
            uptime_seconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        };

        res.status(200).json({ status: 'success', data: metrics });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

export const getContracts = async (req: Request, res: Response) => {
    try {
        const contracts = await ContractRegistryModel.find().sort({ updatedAt: -1 });
        res.status(200).json({ status: 'success', data: contracts });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

export const upsertContract = async (req: Request, res: Response) => {
    try {
        const { name, address, network } = req.body;
        if (!name || !address || !network) return res.status(400).json({ error: 'Missing fields' });

        const contract = await ContractRegistryModel.findOneAndUpdate(
            { name, network },
            { $set: { address: address.toLowerCase(), updatedAt: new Date() } },
            { upsert: true, new: true }
        );

        res.status(200).json({ status: 'success', data: contract });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

/**
 * GET /admin/metrics (structured JSON for Prometheus/Grafana scrape)
 */
export const getMetrics = async (_req: Request, res: Response) => {
    try {
        const pendingEvents = await EventModel.countDocuments({ status: 'pending' });
        const failedEvents = await EventModel.countDocuments({ status: 'failed' });
        const lastEvent = await EventModel.findOne({ status: 'processed' })
            .sort({ blockNumber: -1, logIndex: -1 })
            .lean();

        // Prometheus-style text format
        const metricsText = [
            `# HELP events_pending_count Number of unprocessed blockchain events in the ledger`,
            `# TYPE events_pending_count gauge`,
            `events_pending_count ${pendingEvents}`,
            `# HELP failed_events_count Events that exceeded retry limit`,
            `# TYPE failed_events_count gauge`,
            `failed_events_count ${failedEvents}`,
            `# HELP last_processed_block Last block number successfully processed by projector`,
            `# TYPE last_processed_block gauge`,
            `last_processed_block ${lastEvent?.blockNumber ?? 0}`,
        ].join('\n');

        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.status(200).send(metricsText);
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};
