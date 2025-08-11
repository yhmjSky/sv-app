import type { PageServerLoad } from './$types';
import { type Actions } from '@sveltejs/kit';
import { getDatabaseManager, DatabaseManager } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, url }) => {
	try {
		const databaseKey = url.searchParams.get('database') || undefined;
		const manager = getDatabaseManager(platform);

		// 获取所有可用数据库
		const availableDatabases = manager.getAvailableDatabases();

		// 获取当前数据库信息
		const currentDatabase = manager.getCurrentDatabaseInfo(databaseKey);

		// 使用 Drizzle ORM 查询数据
		const db = manager.getDatabase(databaseKey);
		const users = await db.select().from(user);
		console.log('Users from Drizzle ORM:', users);

		return {
			users,
			databases: availableDatabases,
			currentDatabase,
			defaultDatabaseKey: DatabaseManager.getCurrentMonthDatabaseKey(),
			success: true
		};
	} catch (error) {
		console.error('Error loading users with Drizzle ORM:', error);

		// 如果 Drizzle 失败，尝试获取数据库列表
		try {
			const manager = getDatabaseManager(platform);
			const availableDatabases = manager.getAvailableDatabases();

			return {
				users: [],
				databases: availableDatabases,
				currentDatabase: null,
				defaultDatabaseKey: DatabaseManager.getCurrentMonthDatabaseKey(),
				success: false,
				error: 'Failed to load users from database'
			};
		} catch (fallbackError) {
			console.error('Failed to get database list:', fallbackError);
			return {
				users: [],
				databases: [],
				currentDatabase: null,
				defaultDatabaseKey: DatabaseManager.getCurrentMonthDatabaseKey(),
				success: false,
				error: 'Database connection failed'
			};
		}
	}
};

export const actions: Actions = {};