/**
 * 数据库管理器
 * 统一处理数据库创建、表创建和配置更新
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseManager {
    constructor(env = {}) {
        this.env = env;
        this.accountId = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
        this.baseUrl = 'https://api.cloudflare.com/client/v4';
        
        this.validateEnvironment();
    }

    /**
     * 验证环境变量
     */
    validateEnvironment() {
        if (!this.accountId) {
            throw new Error('CLOUDFLARE_ACCOUNT_ID is required');
        }
        if (!this.apiToken) {
            throw new Error('CLOUDFLARE_API_TOKEN is required');
        }
    }

    /**
     * 创建数据库
     */
    async createDatabase(name) {
        console.log(`🔨 Creating database: ${name}`);
        
        const url = `${this.baseUrl}/accounts/${this.accountId}/d1/database`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create database: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
        }

        console.log(`✅ Database created: ${data.result.name} (ID: ${data.result.uuid})`);
        return data.result;
    }

    /**
     * 检查数据库是否存在
     */
    async databaseExists(name) {
        try {
            const databases = await this.listDatabases();
            return databases.some(db => db.name === name);
        } catch (error) {
            console.error('Error checking database existence:', error);
            return false;
        }
    }

    /**
     * 获取数据库列表
     */
    async listDatabases() {
        const url = `${this.baseUrl}/accounts/${this.accountId}/d1/database`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to list databases: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
        }

        return data.result || [];
    }

    /**
     * 执行 SQL 语句
     */
    async executeSQL(databaseId, sql) {
        console.log(`📝 Executing SQL on database ${databaseId}`);
        
        const url = `${this.baseUrl}/accounts/${this.accountId}/d1/database/${databaseId}/query`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to execute SQL: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
        }

        return data.result;
    }

    /**
     * 应用数据库迁移
     */
    async applyMigrations(databaseId) {
        console.log(`🔄 Applying migrations to database ${databaseId}`);
        
        try {
            const migrationFiles = this.getMigrationFiles();
            
            for (const migrationFile of migrationFiles) {
                console.log(`📄 Applying migration: ${migrationFile}`);
                const migrationSQL = readFileSync(migrationFile, 'utf-8');
                await this.executeSQL(databaseId, migrationSQL);
            }
            
            console.log('✅ All migrations applied successfully');
        } catch (error) {
            throw new Error(`Failed to apply migrations: ${error.message}`);
        }
    }

    /**
     * 获取迁移文件列表
     */
    getMigrationFiles() {
        try {
            const migrationDir = join(process.cwd(), 'drizzle');
            
            // 目前简化处理，返回已知的迁移文件
            // 在实际项目中可以动态扫描目录
            return [
                join(migrationDir, '0000_unknown_sugar_man.sql')
            ];
        } catch (error) {
            throw new Error(`Failed to read migration files: ${error.message}`);
        }
    }

    /**
     * 检查表是否存在
     */
    async tableExists(databaseId, tableName) {
        try {
            const result = await this.executeSQL(
                databaseId,
                `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
            );
            return result.length > 0;
        } catch (error) {
            console.error(`Error checking table existence: ${error.message}`);
            return false;
        }
    }

    /**
     * 创建表
     */
    async createTable(databaseId, tableName, createSQL) {
        console.log(`🏗️ Creating table: ${tableName}`);
        
        // 检查表是否已存在
        const exists = await this.tableExists(databaseId, tableName);
        if (exists) {
            console.log(`⚠️ Table ${tableName} already exists, skipping`);
            return false;
        }

        await this.executeSQL(databaseId, createSQL);
        console.log(`✅ Table ${tableName} created successfully`);
        return true;
    }

    /**
     * 完整的数据库设置流程
     */
    async setupDatabase(name) {
        const steps = [];
        
        try {
            steps.push(`Starting database setup for: ${name}`);
            
            // 1. 检查数据库是否已存在
            const exists = await this.databaseExists(name);
            if (exists) {
                steps.push(`Database ${name} already exists, skipping creation`);
                const databases = await this.listDatabases();
                const database = databases.find(db => db.name === name);
                
                if (!database) {
                    throw new Error(`Database ${name} exists but could not retrieve details`);
                }
                
                return {
                    success: true,
                    database,
                    skipped: true,
                    steps
                };
            }

            // 2. 创建数据库
            steps.push('Creating new database...');
            const database = await this.createDatabase(name);
            steps.push(`Database created: ${database.name} (ID: ${database.uuid})`);

            // 3. 应用迁移
            steps.push('Applying database migrations...');
            await this.applyMigrations(database.uuid);
            steps.push('Migrations applied successfully');

            steps.push('Database setup completed successfully');

            return {
                success: true,
                database,
                skipped: false,
                steps
            };

        } catch (error) {
            steps.push(`Error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                steps
            };
        }
    }
}
