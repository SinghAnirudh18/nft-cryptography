import { getDynamicProvider } from '../utils/provider.js';
import { chainListener } from '../services/chainListener.js';
import { createProjector } from '../services/projector.js';

const projector = createProjector();

export async function startWorkers() {
    console.log('👷 Starting background workers...');

    try {
        const provider = getDynamicProvider();

        // Start Chain Listener
        // It handles its own internal degraded mode if ABIs are missing
        await chainListener.start(provider);

        // Start Projector
        await projector.start(provider);

        console.log('✅ Background workers initialized');
    } catch (err: any) {
        console.error('❌ Failed to start background workers:', err.message);
        console.warn('⚠️  Application running without background sync/projection.');
    }
}
