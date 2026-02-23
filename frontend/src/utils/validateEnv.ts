/**
 * validateEnv.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Build-time/Startup environment variable validation.
 * Prevents "white screen" or broken wallet connections due to missing secrets.
 */

const REQUIRED_VITE_VARS = [
    'VITE_WALLET_CONNECT_PROJECT_ID',
    'VITE_API_BASE_URL',
];

export function validateFrontendEnv() {
    const missing = REQUIRED_VITE_VARS.filter(
        (key) => !import.meta.env[key]
    );

    if (missing.length > 0) {
        console.error(
            `❌ FATAL: Missing required environment variables:\n${missing.join(
                '\n'
            )}\n\nCheck your .env file.`
        );

        // In development, we can show a more visible error
        if (import.meta.env.DEV) {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
            overlay.style.color = 'white';
            overlay.style.zIndex = '1000000';
            overlay.style.padding = '20px';
            overlay.style.fontFamily = 'monospace';
            overlay.innerHTML = `
                <h1 style="color: white; margin-top: 0;">FATAL: Missing Environment Variables</h1>
                <p>The following variables are missing in your .env file:</p>
                <ul>
                    ${missing.map(m => `<li>${m}</li>`).join('')}
                </ul>
                <p>Please add them and restart the dev server.</p>
            `;
            document.body.appendChild(overlay);
        }

        return false;
    }
    return true;
}
