import { json } from '@sveltejs/kit';
import { getDatabaseManager, DatabaseManager } from '$lib/server/db';
import { DatabaseCreationService } from '$lib/server/database-creation-service';
import type { RequestHandler } from './$types';

// GET /api/databases - 获取所有可用数据库
export const GET: RequestHandler = async ({ platform, url }) => {
	try {
		const manager = getDatabaseManager(platform);
		const databases = manager.getAvailableDatabases();
		const currentKey = url.searchParams.get('current') || DatabaseManager.getCurrentMonthDatabaseKey();
		const currentDatabase = manager.getCurrentDatabaseInfo(currentKey);

		// 如果请求包含 remote=true 参数，也获取远程数据库列表
		const includeRemote = url.searchParams.get('remote') === 'true';
		let remoteDatabases = [];

		if (includeRemote) {
			try {
				const envValidation = DatabaseCreationService.validateEnvironment();
				if (envValidation.valid) {
					const creationService = new DatabaseCreationService();
					remoteDatabases = await creationService.listRemoteDatabases();
				}
			} catch (error) {
				console.warn('Failed to fetch remote databases:', error);
			}
		}

		return json({
			success: true,
			data: {
				databases,
				current: currentDatabase,
				defaultKey: DatabaseManager.getCurrentMonthDatabaseKey(),
				...(includeRemote && { remoteDatabases })
			}
		});
	} catch (error) {
		console.error('Error fetching databases:', error);
		return json({
			success: false,
			error: 'Failed to fetch databases'
		}, { status: 500 });
	}
};

// POST /api/databases - 创建新数据库版本
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const requestData = await request.json() as { year: number; month: number; copyFromKey?: string };
		const { year, month } = requestData;

		// 验证输入
		if (!year || !month) {
			return json({
				success: false,
				error: 'Year and month are required'
			}, { status: 400 });
		}

		const newKey = DatabaseManager.generateDatabaseKey(year, month);

		if (!DatabaseManager.isValidDatabaseKey(newKey)) {
			return json({
				success: false,
				error: 'Invalid database key format'
			}, { status: 400 });
		}

		// 检查环境变量配置（传递 platform.env）
		const envValidation = DatabaseCreationService.validateEnvironment(platform?.env);
		if (!envValidation.valid) {
			return json({
				success: false,
				error: `Missing required environment variables: ${envValidation.missing.join(', ')}`,
				info: {
					missingVars: envValidation.missing,
					setupGuide: 'Please check your .env file and wrangler.jsonc configuration',
					details: 'Environment variables should be set in .dev.vars for development or as Cloudflare secrets for production'
				}
			}, { status: 400 });
		}

		const manager = getDatabaseManager(platform);

		// 检查数据库是否已存在（本地绑定）
		if (manager.databaseExists(newKey)) {
			return json({
				success: false,
				error: `Database ${newKey} already exists in local bindings`
			}, { status: 409 });
		}

		// 创建数据库创建服务（传递环境变量）
		const creationService = new DatabaseCreationService(platform?.env);

		// 检查远程是否已存在同名数据库
		const remoteDatabaseExists = await creationService.databaseExists(newKey);
		if (remoteDatabaseExists) {
			return json({
				success: false,
				error: `Database ${newKey} already exists in Cloudflare`
			}, { status: 409 });
		}

		// 创建数据库
		const result = await creationService.createDatabase(year, month);

		if (result.success) {
			return json({
				success: true,
				data: {
					database: result.database,
					bindingName: result.bindingName,
					wranglerConfig: result.wranglerConfig,
					steps: result.steps
				},
				message: 'Database created successfully! Please update your wrangler.jsonc and redeploy.'
			}, { status: 201 });
		} else {
			return json({
				success: false,
				error: result.error || 'Unknown error occurred',
				steps: result.steps
			}, { status: 500 });
		}

	} catch (error) {
		console.error('Error creating database:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create database'
		}, { status: 500 });
	}
};
