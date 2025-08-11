#!/usr/bin/env node

/**
 * 自动化数据库设置脚本
 * 专门用于 CI/CD 流水线，定时创建数据库、表和更新绑定
 * 
 * 功能:
 * 1. 自动创建当前年月的数据库 (d1_YYYYMM)
 * 2. 应用数据库迁移创建表
 * 3. 自动更新 wrangler.jsonc 绑定配置
 * 4. 如果数据库已存在则跳过并说明
 * 
 * 使用方法:
 * node scripts/auto-setup-database.js [--year YYYY] [--month MM] [--dry-run]
 */

import dotenv from 'dotenv';
import { WranglerConfigManager } from './wrangler-config-manager.js';
import { DatabaseManager } from './database-manager.js';

// 加载环境变量
dotenv.config();

class AutoDatabaseSetup {
    constructor() {
        this.configManager = new WranglerConfigManager();
        this.databaseManager = new DatabaseManager();
    }

    /**
     * 自动设置数据库
     */
    async autoSetup(options = {}) {
        const {
            year = new Date().getFullYear(),
            month = new Date().getMonth() + 1,
            dryRun = false
        } = options;

        try {
            console.log('🤖 Starting automated database setup...');
            console.log(`Year: ${year}, Month: ${month}`);
            console.log(`Dry Run: ${dryRun ? 'Yes' : 'No'}`);
            console.log('');

            // 1. 生成数据库名称
            const databaseName = WranglerConfigManager.generateDatabaseKey(year, month);
            console.log(`📋 Target database: ${databaseName}`);

            if (dryRun) {
                console.log('🔍 Dry run mode - no changes will be made');
                await this.performDryRun(databaseName);
                return;
            }

            // 2. 设置数据库
            console.log('🔨 Setting up database...');
            const setupResult = await this.databaseManager.setupDatabase(databaseName);

            // 3. 显示设置结果
            this.displaySetupResult(setupResult);

            if (!setupResult.success) {
                throw new Error(setupResult.error);
            }

            // 4. 更新 wrangler 配置
            console.log('🔧 Updating wrangler configuration...');
            await this.updateWranglerConfig(databaseName, setupResult.database.uuid);

            console.log('');
            console.log('🎉 Automated database setup completed successfully!');
            console.log('');
            console.log('📊 Summary:');
            console.log(`   Database: ${databaseName}`);
            console.log(`   Status: ${setupResult.skipped ? 'Already exists' : 'Newly created'}`);
            console.log(`   ID: ${setupResult.database.uuid}`);
            console.log('');
            console.log('🚀 Next steps:');
            console.log('   1. Commit the updated wrangler.jsonc file');
            console.log('   2. Deploy your application');

        } catch (error) {
            console.error('❌ Automated setup failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * 执行干运行
     */
    async performDryRun(databaseName) {
        try {
            console.log('');
            console.log('🔍 Checking current state...');

            // 检查数据库是否存在
            const databaseExists = await this.databaseManager.databaseExists(databaseName);
            console.log(`Database exists: ${databaseExists ? 'Yes' : 'No'}`);

            // 检查绑定是否存在
            this.configManager.load();
            const bindingExists = this.configManager.hasD1Database(databaseName);
            console.log(`Binding exists: ${bindingExists ? 'Yes' : 'No'}`);

            console.log('');
            console.log('📋 Actions that would be performed:');

            if (!databaseExists) {
                console.log(`   ➕ Create database: ${databaseName}`);
                console.log(`   🔄 Apply migrations to create tables`);
            } else {
                console.log(`   ⚠️ Database ${databaseName} already exists - would skip creation`);
            }

            if (!bindingExists) {
                console.log(`   🔧 Add binding to wrangler.jsonc: ${databaseName}`);
            } else {
                console.log(`   🔄 Update existing binding in wrangler.jsonc: ${databaseName}`);
            }

        } catch (error) {
            console.error('❌ Dry run failed:', error.message);
        }
    }

    /**
     * 显示设置结果
     */
    displaySetupResult(result) {
        console.log('');
        console.log('📊 Database Setup Result:');
        console.log(`   Success: ${result.success ? 'Yes' : 'No'}`);
        
        if (result.success) {
            console.log(`   Database: ${result.database.name}`);
            console.log(`   ID: ${result.database.uuid}`);
            console.log(`   Skipped: ${result.skipped ? 'Yes (already exists)' : 'No (newly created)'}`);
        }

        console.log('');
        console.log('📝 Setup Steps:');
        result.steps.forEach((step, index) => {
            console.log(`   ${index + 1}. ${step}`);
        });
    }

    /**
     * 更新 wrangler 配置
     */
    async updateWranglerConfig(databaseName, databaseId) {
        try {
            // 加载配置
            this.configManager.load();

            // 添加绑定
            const binding = {
                binding: databaseName,
                database_name: databaseName,
                database_id: databaseId,
                migrations_dir: "drizzle"
            };

            this.configManager.addD1Database(binding);

            // 保存配置
            this.configManager.save();

            console.log('✅ Wrangler configuration updated successfully');

        } catch (error) {
            throw new Error(`Failed to update wrangler config: ${error.message}`);
        }
    }

    /**
     * 解析命令行参数
     */
    parseArgs(args) {
        const options = {};
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--year':
                    options.year = parseInt(args[++i]);
                    break;
                case '--month':
                    options.month = parseInt(args[++i]);
                    break;
                case '--dry-run':
                    options.dryRun = true;
                    break;
                case '--help':
                case '-h':
                    this.showHelp();
                    process.exit(0);
                    break;
                default:
                    console.error(`❌ Unknown argument: ${arg}`);
                    this.showHelp();
                    process.exit(1);
            }
        }

        // 验证参数
        if (options.year && (options.year < 2020 || options.year > 2030)) {
            console.error('❌ Year must be between 2020 and 2030');
            process.exit(1);
        }

        if (options.month && (options.month < 1 || options.month > 12)) {
            console.error('❌ Month must be between 1 and 12');
            process.exit(1);
        }

        return options;
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log('🤖 Automated Database Setup Script');
        console.log('');
        console.log('Usage:');
        console.log('  node scripts/auto-setup-database.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --year YYYY    Target year (default: current year)');
        console.log('  --month MM     Target month (default: current month)');
        console.log('  --dry-run      Show what would be done without making changes');
        console.log('  --help, -h     Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  # Setup database for current month');
        console.log('  node scripts/auto-setup-database.js');
        console.log('');
        console.log('  # Setup database for specific month');
        console.log('  node scripts/auto-setup-database.js --year 2025 --month 2');
        console.log('');
        console.log('  # Dry run to see what would happen');
        console.log('  node scripts/auto-setup-database.js --dry-run');
        console.log('');
        console.log('Environment Variables Required:');
        console.log('  CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID');
        console.log('  CLOUDFLARE_API_TOKEN  - Your Cloudflare API token');
    }
}

// 主函数
async function main() {
    const setup = new AutoDatabaseSetup();
    const args = process.argv.slice(2);
    const options = setup.parseArgs(args);
    
    await setup.autoSetup(options);
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}
