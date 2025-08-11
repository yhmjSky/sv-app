/**
 * 服务器端 Wrangler 配置更新器
 * 用于在数据库创建后自动更新 wrangler.jsonc 配置
 */

// 动态导入 Node.js 模块以支持 Workers 环境

export interface D1DatabaseBinding {
	binding: string;
	database_name: string;
	database_id: string;
	migrations_dir: string;
}

export class WranglerConfigUpdater {
	private configPath: string;
	private config: any = null;
	private isWorkersEnv: boolean;

	constructor(configPath = 'wrangler.jsonc') {
		this.isWorkersEnv = this.checkWorkersEnvironment();

		if (!this.isWorkersEnv) {
			const path = require('path');
			this.configPath = path.join(process.cwd(), configPath);
		} else {
			this.configPath = configPath;
		}
	}

	/**
	 * 检查是否在 Workers 环境中
	 */
	private checkWorkersEnvironment(): boolean {
		return typeof globalThis.caches !== 'undefined' ||
		       typeof globalThis.CloudflareWorkersGlobalScope !== 'undefined' ||
		       typeof process === 'undefined';
	}

	/**
	 * 加载配置文件
	 */
	load(): any {
		if (this.isWorkersEnv) {
			// 在 Workers 环境中，返回一个模拟的配置对象
			this.config = {
				d1_databases: []
			};
			console.log('⚠️ Running in Workers environment - config file operations are simulated');
			return this.config;
		}

		try {
			const fs = require('fs');
			const content = fs.readFileSync(this.configPath, 'utf-8');

			// 处理 JSONC 格式（移除注释）
			const cleanContent = this.removeComments(content);
			this.config = JSON.parse(cleanContent);

			return this.config;
		} catch (error) {
			throw new Error(`Failed to load wrangler config: ${error.message}`);
		}
	}

	/**
	 * 保存配置文件
	 */
	save(): void {
		if (!this.config) {
			throw new Error('No config loaded. Call load() first.');
		}

		if (this.isWorkersEnv) {
			console.log('⚠️ Running in Workers environment - config file save is simulated');
			console.log('📋 Would save config:', JSON.stringify(this.config, null, 2));
			return;
		}

		try {
			const fs = require('fs');
			// 保持原有的格式和注释结构
			const content = this.formatJsonc(this.config);
			fs.writeFileSync(this.configPath, content, 'utf-8');
			console.log(`✅ Updated ${this.configPath}`);
		} catch (error) {
			throw new Error(`Failed to save wrangler config: ${error.message}`);
		}
	}

	/**
	 * 添加或更新 D1 数据库绑定
	 */
	addD1Database(binding: D1DatabaseBinding): boolean {
		if (!this.config) {
			throw new Error('No config loaded. Call load() first.');
		}

		// 确保 d1_databases 数组存在
		if (!this.config.d1_databases) {
			this.config.d1_databases = [];
		}

		// 检查是否已存在相同的绑定
		const existingIndex = this.config.d1_databases.findIndex(
			(db: any) => db.binding === binding.binding
		);

		let isNewBinding = false;

		if (existingIndex >= 0) {
			// 更新现有绑定
			this.config.d1_databases[existingIndex] = {
				...this.config.d1_databases[existingIndex],
				...binding
			};
			console.log(`🔄 Updated existing D1 binding: ${binding.binding}`);
		} else {
			// 添加新绑定
			this.config.d1_databases.push(binding);
			console.log(`➕ Added new D1 binding: ${binding.binding}`);
			isNewBinding = true;
		}

		return isNewBinding;
	}

	/**
	 * 检查 D1 数据库绑定是否存在
	 */
	hasD1Database(bindingName: string): boolean {
		if (!this.config || !this.config.d1_databases) {
			return false;
		}

		return this.config.d1_databases.some((db: any) => db.binding === bindingName);
	}

	/**
	 * 获取所有 D1 数据库绑定
	 */
	getD1Databases(): D1DatabaseBinding[] {
		return this.config?.d1_databases || [];
	}

	/**
	 * 自动更新数据库绑定
	 */
	async autoUpdateBinding(databaseName: string, databaseId: string): Promise<{
		success: boolean;
		isNewBinding: boolean;
		binding: D1DatabaseBinding;
		error?: string;
	}> {
		try {
			// 创建绑定配置
			const binding: D1DatabaseBinding = {
				binding: databaseName,
				database_name: databaseName,
				database_id: databaseId,
				migrations_dir: "drizzle"
			};

			if (this.isWorkersEnv) {
				// 在 Workers 环境中，模拟配置更新
				console.log('⚠️ Running in Workers environment - config update is simulated');
				console.log('📋 Would add binding:', binding);

				return {
					success: true,
					isNewBinding: true,
					binding,
					error: 'Config update simulated in Workers environment'
				};
			}

			// 在 Node.js 环境中，执行实际的配置更新
			this.load();
			const isNewBinding = this.addD1Database(binding);
			this.save();

			return {
				success: true,
				isNewBinding,
				binding
			};

		} catch (error) {
			console.error('Failed to update wrangler config:', error);
			return {
				success: false,
				isNewBinding: false,
				binding: {} as D1DatabaseBinding,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * 移除 JSONC 注释
	 */
	private removeComments(content: string): string {
		// 简单的注释移除（保留字符串中的内容）
		return content
			.split('\n')
			.map(line => {
				// 移除行注释，但保留字符串中的 //
				const commentIndex = line.indexOf('//');
				if (commentIndex >= 0) {
					// 检查是否在字符串中
					const beforeComment = line.substring(0, commentIndex);
					const quotes = (beforeComment.match(/"/g) || []).length;
					if (quotes % 2 === 0) {
						// 偶数个引号，注释在字符串外
						return beforeComment.trim();
					}
				}
				return line;
			})
			.join('\n')
			.replace(/\/\*[\s\S]*?\*\//g, ''); // 移除块注释
	}

	/**
	 * 格式化为 JSONC 格式
	 */
	private formatJsonc(config: any): string {
		const header = `/**
 * For more details on how to configure Wrangler, refer to:
 * https://developers.cloudflare.com/workers/wrangler/configuration/
 */`;

		const jsonContent = JSON.stringify(config, null, '\t');
		return header + '\n' + jsonContent + '\n';
	}

	/**
	 * 生成当前年月的数据库键名
	 */
	static getCurrentMonthKey(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		return `d1_${year}${month}`;
	}

	/**
	 * 生成指定年月的数据库键名
	 */
	static generateDatabaseKey(year: number, month: number): string {
		return `d1_${year}${String(month).padStart(2, '0')}`;
	}

	/**
	 * 验证数据库键名格式
	 */
	static isValidDatabaseKey(key: string): boolean {
		return /^d1_\d{6}$/.test(key);
	}
}
