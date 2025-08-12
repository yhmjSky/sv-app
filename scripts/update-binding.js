#!/usr/bin/env node

/**
 * 手动绑定更新脚本
 * 用于手动创建数据库后自动更新 wrangler.jsonc 绑定配置
 * 
 * 使用方法:
 * node scripts/update-binding.js [database-name] [database-id]
 * 
 * 示例:
 * node scripts/update-binding.js d1_202501 abc123-def456-ghi789
 */

// 可选加载 dotenv（在 CI 中不强制要求）
try {
	const { default: dotenv } = await import('dotenv');
	dotenv.config();
} catch {
	// dotenv 未安装时忽略
}

import { WranglerConfigManager } from './wrangler-config-manager.js';
import { DatabaseManager } from './database-manager.js';

class BindingUpdater {
	constructor() {
		this.configManager = new WranglerConfigManager();
		this.databaseManager = new DatabaseManager();
	}

	/**
	 * 更新绑定配置
	 */
	async updateBinding(databaseName, databaseId) {
		try {
			console.log('🔧 Starting binding update process...');
			console.log(`Database: ${databaseName}`);
			console.log(`ID: ${databaseId || 'Auto-detect'}`);
			console.log('');

			// 1. 加载当前配置
			console.log('📖 Loading wrangler configuration...');
			this.configManager.load();

			// 2. 如果没有提供 ID，尝试自动检测
			let finalDatabaseId = databaseId;
			if (!finalDatabaseId) {
				console.log('🔍 Auto-detecting database ID...');
				const databases = await this.databaseManager.listDatabases();
				const database = databases.find(db => db.name === databaseName);
				
				if (!database) {
					throw new Error(`Database '${databaseName}' not found in Cloudflare account`);
				}
				
				finalDatabaseId = database.uuid;
				console.log(`✅ Found database ID: ${finalDatabaseId}`);
			}

			// 3. 检查绑定是否已存在
			if (this.configManager.hasD1Database(databaseName)) {
				console.log(`⚠️ Binding '${databaseName}' already exists, updating...`);
			} else {
				console.log(`➕ Adding new binding '${databaseName}'...`);
			}

			// 4. 添加或更新绑定
			const binding = {
				binding: databaseName,
				database_name: databaseName,
				database_id: finalDatabaseId,
				migrations_dir: "drizzle"
			};

			this.configManager.addD1Database(binding);

			// 5. 保存配置
			console.log('💾 Saving configuration...');
			this.configManager.save();

			console.log('');
			console.log('🎉 Binding update completed successfully!');
			console.log('');
			console.log('📋 Updated binding configuration:');
			console.log(`   Binding: ${binding.binding}`);
			console.log(`   Database Name: ${binding.database_name}`);
			console.log(`   Database ID: ${binding.database_id}`);
			console.log(`   Migrations Dir: ${binding.migrations_dir}`);
			console.log('');
			console.log('🚀 You can now deploy your application with:');
			console.log('   npm run build && npm run deploy');

		} catch (error) {
			console.error('❌ Binding update failed:', error.message);
			process.exit(1);
		}
	}

	/**
	 * 显示帮助信息
	 */
	showHelp() {
		console.log('📖 Binding Update Script');
		console.log('');
		console.log('Usage:');
		console.log('  node scripts/update-binding.js [database-name] [database-id]');
		console.log('');
		console.log('Parameters:');
		console.log('  database-name  Required. Name of the database (e.g., d1_202501)');
		console.log('  database-id    Optional. Database UUID (auto-detected if not provided)');
		console.log('');
		console.log('Examples:');
		console.log('  # Auto-detect database ID');
		console.log('  node scripts/update-binding.js d1_202501');
		console.log('');
		console.log('  # Specify database ID explicitly');
		console.log('  node scripts/update-binding.js d1_202501 abc123-def456-ghi789');
		console.log('');
		console.log('Environment Variables Required:');
		console.log('  CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID');
		console.log('  CLOUDFLARE_API_TOKEN  - Your Cloudflare API token');
	}

	/**
	 * 验证参数
	 */
	validateArgs(args) {
		if (args.length < 1) {
			console.error('❌ Error: Database name is required');
			console.log('');
			this.showHelp();
			process.exit(1);
		}

		const databaseName = args[0];
		if (!WranglerConfigManager.isValidDatabaseKey(databaseName)) {
			console.error(`❌ Error: Invalid database name format: ${databaseName}`);
			console.error('Expected format: d1_YYYYMM (e.g., d1_202501)');
			process.exit(1);
		}

		return {
			databaseName,
			databaseId: args[1] || null
		};
	}
}

// 主函数
async function main() {
	const updater = new BindingUpdater();
	const args = process.argv.slice(2);

	// 显示帮助
	if (args.includes('--help') || args.includes('-h')) {
		updater.showHelp();
		return;
	}

	// 验证参数
	const { databaseName, databaseId } = updater.validateArgs(args);

	// 执行更新
	await updater.updateBinding(databaseName, databaseId);
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(error => {
		console.error('❌ Unexpected error:', error);
		process.exit(1);
	});
}
