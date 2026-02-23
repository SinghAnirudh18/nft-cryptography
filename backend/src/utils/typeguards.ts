/**
 * Centralized type guards for the backend.
 */

/**
 * Checks if a value is a non-empty string after trimming whitespace.
 * Use this to narrow type from string | undefined to string.
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates that a string is a valid URL.
 * Throws a descriptive error if the URL is invalid.
 */
export function assertValidRpcUrl(url: string): string {
    try {
        new URL(url);
        return url;
    } catch {
        throw new Error(`Invalid RPC URL detected: "${url}". Please check your .env configuration.`);
    }
}
