/**
 * Buffer shim for browser environment
 * Provides Buffer class for Node.js compatibility
 */

import buffer, { Buffer } from 'buffer';

export { buffer as 'buffer', Buffer as 'Buffer' };

