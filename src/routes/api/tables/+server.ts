import { json } from '@sveltejs/kit';
import { getDatabaseManager } from '$lib/server/db';
import { createCloudflareD1API } from '$lib/server/cloudflare-api';
import type { RequestHandler } from './$types';

// POST /api/tables - 创建新表
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const requestData = await request.json() as {
			database: string;
			sql: string;
			tableName: string;
		};
		
		const { database, sql, tableName } = requestData;
		
		// 验证输入
		if (!database || !sql || !tableName) {
			return json({
				success: false,
				error: 'Database, SQL, and table name are required'
			}, { status: 400 });
		}
		
		// 验证 SQL 是否为 CREATE TABLE 语句
		if (!sql.trim().toUpperCase().startsWith('CREATE TABLE')) {
			return json({
				success: false,
				error: 'Only CREATE TABLE statements are allowed'
			}, { status: 400 });
		}
		
		try {
			// 方法1: 尝试通过 Drizzle ORM 执行（如果数据库绑定存在）
			const manager = getDatabaseManager(platform);
			
			if (manager.databaseExists(database)) {
				const db = manager.getDatabase(database);
				
				// 使用 Drizzle 的原始 SQL 执行
				await db.run(sql);
				
				return json({
					success: true,
					message: `Table "${tableName}" created successfully in database "${database}"`,
					method: 'drizzle'
				});
			}
		} catch (drizzleError) {
			console.warn('Drizzle execution failed, trying Cloudflare API:', drizzleError);
		}
		
		try {
			// 方法2: 通过 Cloudflare API 执行（如果有环境变量配置）
			const accountId = platform?.env?.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
			const apiToken = platform?.env?.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

			if (accountId && apiToken) {
				const cloudflareAPI = createCloudflareD1API(platform?.env);

				// 需要获取数据库ID，这里简化处理
				// 在实际应用中，你可能需要维护一个数据库名称到ID的映射
				const databaseId = platform?.env?.CLOUDFLARE_DATABASE_ID || process.env.CLOUDFLARE_DATABASE_ID;

				if (databaseId) {
					await cloudflareAPI.executeSQL(databaseId, sql);

					return json({
						success: true,
						message: `Table "${tableName}" created successfully via Cloudflare API`,
						method: 'cloudflare-api'
					});
				}
			}
		} catch (apiError) {
			console.error('Cloudflare API execution failed:', apiError);
		}
		
		// 如果两种方法都失败
		return json({
			success: false,
			error: 'Failed to execute SQL. Please ensure the database is properly configured and accessible.',
			details: 'Both Drizzle ORM and Cloudflare API methods failed'
		}, { status: 500 });
		
	} catch (error) {
		console.error('Error creating table:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create table'
		}, { status: 500 });
	}
};

// GET /api/tables - 获取表列表
export const GET: RequestHandler = async ({ platform, url }) => {
	try {
		const database = url.searchParams.get('database');
		
		if (!database) {
			return json({
				success: false,
				error: 'Database parameter is required'
			}, { status: 400 });
		}
		
		const manager = getDatabaseManager(platform);
		
		if (!manager.databaseExists(database)) {
			return json({
				success: false,
				error: `Database "${database}" not found`
			}, { status: 404 });
		}
		
		const db = manager.getDatabase(database);
		
		// 查询所有表
		const tables = await db.all(`
			SELECT name, sql 
			FROM sqlite_master 
			WHERE type='table' AND name NOT LIKE 'sqlite_%'
			ORDER BY name
		`);
		
		return json({
			success: true,
			data: {
				database,
				tables
			}
		});
		
	} catch (error) {
		console.error('Error fetching tables:', error);
		return json({
			success: false,
			error: 'Failed to fetch tables'
		}, { status: 500 });
	}
};
