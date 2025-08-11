/**
 * 数据库创建服务
 * 处理完整的 D1 数据库创建流程，包括创建数据库、应用迁移等
 */

import { createCloudflareD1API, type D1DatabaseInfo } from './cloudflare-api';
import { WranglerConfigUpdater } from './wrangler-config-updater';

export interface DatabaseCreationResult {
	success: boolean;
	database?: D1DatabaseInfo;
	bindingName: string;
	wranglerConfig?: string;
	configUpdated?: boolean;
	isNewBinding?: boolean;
	error?: string;
	steps: string[];
}

export class DatabaseCreationService {
	private cloudflareAPI: ReturnType<typeof createCloudflareD1API>;

	constructor(env?: any) {
		this.cloudflareAPI = createCloudflareD1API(env);
	}

	/**
	 * 创建新的 D1 数据库并返回配置信息
	 */
	async createDatabase(year: number, month: number): Promise<DatabaseCreationResult> {
		const steps: string[] = [];
		const bindingName = `d1_${year}${String(month).padStart(2, '0')}`;
		const databaseName = bindingName;

		try {
			steps.push('1. 开始创建 D1 数据库...');

			// 1. 创建数据库
			const database = await this.cloudflareAPI.createDatabase(databaseName);
			steps.push(`2. 数据库创建成功: ${database.name} (ID: ${database.uuid})`);

			// 2. 应用数据库迁移
			steps.push('3. 开始应用数据库迁移...');
			await this.applyMigrations(database.uuid);
			steps.push('4. 数据库迁移应用成功');

			// 3. 生成 wrangler.jsonc 配置
			const wranglerConfig = this.generateWranglerConfig(bindingName, databaseName, database.uuid);
			steps.push('5. 生成 wrangler.jsonc 配置');

			// 4. 自动更新 wrangler.jsonc 配置文件
			let configUpdated = false;
			let isNewBinding = false;
			try {
				const configUpdater = new WranglerConfigUpdater();
				const updateResult = await configUpdater.autoUpdateBinding(databaseName, database.uuid);

				if (updateResult.success) {
					configUpdated = true;
					isNewBinding = updateResult.isNewBinding;
					steps.push(`6. 自动更新 wrangler.jsonc 配置 ${isNewBinding ? '(新增绑定)' : '(更新绑定)'}`);
				} else {
					steps.push(`⚠️ 自动更新配置失败: ${updateResult.error}`);
					steps.push('请手动运行: npm run db:update-binding ' + databaseName);
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				steps.push(`⚠️ 自动更新配置失败: ${errorMsg}`);
				steps.push('请手动运行: npm run db:update-binding ' + databaseName);
			}

			steps.push('7. 数据库创建完成！');

			return {
				success: true,
				database,
				bindingName,
				wranglerConfig,
				configUpdated,
				isNewBinding,
				steps
			};

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			steps.push(`❌ 错误: ${errorMessage}`);

			return {
				success: false,
				bindingName,
				error: errorMessage,
				steps
			};
		}
	}

	/**
	 * 应用数据库迁移
	 */
	private async applyMigrations(databaseId: string): Promise<void> {
		try {
			// 检查是否在 Workers 环境中
			if (this.isWorkersEnvironment()) {
				// 在 Workers 环境中，使用预定义的迁移 SQL
				const migrationSQL = this.getBuiltInMigrationSQL();
				await this.cloudflareAPI.executeSQL(databaseId, migrationSQL);
			} else {
				// 在 Node.js 环境中，读取迁移文件
				const { readFileSync } = await import('fs');
				const migrationFiles = this.getMigrationFiles();

				for (const migrationFile of migrationFiles) {
					const migrationSQL = readFileSync(migrationFile, 'utf-8');
					await this.cloudflareAPI.executeSQL(databaseId, migrationSQL);
				}
			}
		} catch (error) {
			throw new Error(`Failed to apply migrations: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * 检查是否在 Workers 环境中
	 */
	private isWorkersEnvironment(): boolean {
		// 检查是否存在 Workers 特有的全局对象
		return typeof globalThis.caches !== 'undefined' ||
		       typeof globalThis.CloudflareWorkersGlobalScope !== 'undefined' ||
		       typeof process === 'undefined';
	}

	/**
	 * 获取内置的迁移 SQL（用于 Workers 环境）
	 */
	private getBuiltInMigrationSQL(): string {
		// 预定义的迁移 SQL，与 drizzle/0000_unknown_sugar_man.sql 内容一致
		return `CREATE TABLE \`users\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`email\` text NOT NULL,
	\`created_at\` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`users_email_unique\` ON \`users\` (\`email\`);`;
	}

	/**
	 * 获取迁移文件列表（仅在 Node.js 环境中使用）
	 */
	private getMigrationFiles(): string[] {
		try {
			// 动态导入 path 模块
			const path = require('path');
			const migrationDir = path.join(process.cwd(), 'drizzle');

			// 读取当前的迁移文件
			return [
				path.join(migrationDir, '0000_unknown_sugar_man.sql')
			];
		} catch (error) {
			throw new Error(`Failed to read migration files: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * 生成 wrangler.jsonc 配置
	 */
	private generateWranglerConfig(bindingName: string, databaseName: string, databaseId: string): string {
		return `{
	"binding": "${bindingName}",
	"database_name": "${databaseName}",
	"database_id": "${databaseId}",
	"migrations_dir": "drizzle"
}`;
	}

	/**
	 * 检查数据库是否已存在
	 */
	async databaseExists(name: string): Promise<boolean> {
		try {
			const databases = await this.cloudflareAPI.listDatabases();
			return databases.some(db => db.name === name);
		} catch (error) {
			console.error('Error checking database existence:', error);
			return false;
		}
	}

	/**
	 * 获取所有远程数据库列表
	 */
	async listRemoteDatabases(): Promise<D1DatabaseInfo[]> {
		try {
			return await this.cloudflareAPI.listDatabases();
		} catch (error) {
			console.error('Error listing remote databases:', error);
			return [];
		}
	}

	/**
	 * 删除数据库
	 */
	async deleteDatabase(databaseId: string): Promise<void> {
		try {
			await this.cloudflareAPI.deleteDatabase(databaseId);
		} catch (error) {
			throw new Error(`Failed to delete database: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * 验证环境变量配置
	 */
	static validateEnvironment(env?: any): { valid: boolean; missing: string[] } {
		const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
		const missing = required.filter(key => {
			const value = env?.[key] || process.env[key];
			return !value;
		});

		return {
			valid: missing.length === 0,
			missing
		};
	}
}
