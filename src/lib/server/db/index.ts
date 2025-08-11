import { DatabaseManager } from './manager';
import { dev } from '$app/environment';

// Export the DatabaseManager class
export { DatabaseManager } from './manager';
export type { DatabaseInfo } from './manager';

// Legacy function for backward compatibility
export function getDatabase(platform?: App.Platform, databaseKey?: string) {
	if (dev) {
		console.warn('Development mode: D1 database binding not available');
		throw new Error('D1 database binding not available in development. Please use `wrangler dev` or set up local development database.');
	}

	if (!platform) {
		throw new Error('Platform is required');
	}

	const manager = new DatabaseManager(platform);
	return manager.getDatabase(databaseKey);
}

// New function to get database manager
export function getDatabaseManager(platform?: App.Platform): DatabaseManager {
	if (!platform) {
		throw new Error('Platform is required');
	}

	return new DatabaseManager(platform);
}
