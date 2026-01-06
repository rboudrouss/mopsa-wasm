/**
 * Process shim for browser environment
 * Provides minimal process-like object for Node.js compatibility
 */

const browser = true;
const env = {};
const cwd = () => "/";

export { browser as 'process.browser', env as 'process.env', cwd as 'process.cwd' };
