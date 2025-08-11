import { json } from '@sveltejs/kit';
import { getDatabaseManager } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

// GET /api/users - 获取所有用户
export const GET: RequestHandler = async ({ platform, url }) => {
	try {
		const databaseKey = url.searchParams.get('database') || undefined;
		const manager = getDatabaseManager(platform);
		const db = manager.getDatabase(databaseKey);
		const users = await db.select().from(user);

		// 获取当前使用的数据库信息
		const currentDb = manager.getCurrentDatabaseInfo(databaseKey);

		return json({
			success: true,
			data: {
				users,
				database: currentDb
			}
		});
	} catch (error) {
		console.error('Error fetching users:', error);
		return json({
			success: false,
			error: 'Failed to fetch users'
		}, { status: 500 });
	}
};

// POST /api/users - 创建新用户
export const POST: RequestHandler = async ({ request, platform, url }) => {
	try {
		const databaseKey = url.searchParams.get('database') || undefined;
		const manager = getDatabaseManager(platform);
		const db = manager.getDatabase(databaseKey);

		const requestData = await request.json() as { age: number; database?: string };
		const { age } = requestData;

		if (typeof age !== 'number' || age < 0) {
			return json({
				success: false,
				error: 'Age must be a positive number'
			}, { status: 400 });
		}

		const newUser = await db.insert(user).values({ age }).returning();

		// 获取当前使用的数据库信息
		const currentDb = manager.getCurrentDatabaseInfo(databaseKey);

		return json({
			success: true,
			data: {
				user: newUser[0],
				database: currentDb
			}
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating user:', error);
		return json({
			success: false,
			error: 'Failed to create user'
		}, { status: 500 });
	}
};
