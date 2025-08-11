import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export interface DatabaseInfo {
	key: string;
	name: string;
	displayName: string;
	isDefault: boolean;
	createdAt?: string;
}

export class DatabaseManager {
	private platform: App.Platform;

	constructor(platform: App.Platform) {
		this.platform = platform;
	}

	/**
	 * 获取当前月份的数据库键名
	 */
	static getCurrentMonthDatabaseKey(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		return `d1_${year}${month}`;
	}

	/**
	 * 获取所有可用的数据库
	 */
	getAvailableDatabases(): DatabaseInfo[] {
		const databases: DatabaseInfo[] = [];
		const currentMonthKey = DatabaseManager.getCurrentMonthDatabaseKey();

		// 遍历所有 D1 绑定
		for (const [key, value] of Object.entries(this.platform.env)) {
			if (key.startsWith('d1_') && value && typeof value === 'object' && 'prepare' in value) {
				try {
					const displayName = this.formatDatabaseDisplayName(key);
					databases.push({
						key,
						name: key,
						displayName,
						isDefault: key === currentMonthKey,
						createdAt: this.extractDateFromKey(key)
					});
				} catch (error) {
					console.warn(`Failed to process database ${key}:`, error);
				}
			}
		}

		// 按日期排序，最新的在前
		return databases.sort((a, b) => {
			if (a.isDefault) return -1;
			if (b.isDefault) return 1;
			return (b.createdAt || '').localeCompare(a.createdAt || '');
		});
	}

	/**
	 * 格式化数据库显示名称
	 */
	private formatDatabaseDisplayName(key: string): string {
		const match = key.match(/^d1_(\d{4})(\d{2})$/);
		if (match) {
			const [, year, month] = match;
			return `${year}年${month}月数据库`;
		}
		return key;
	}

	/**
	 * 从键名提取日期
	 */
	private extractDateFromKey(key: string): string | undefined {
		const match = key.match(/^d1_(\d{4})(\d{2})$/);
		if (match) {
			const [, year, month] = match;
			return `${year}-${month}`;
		}
		return undefined;
	}

	/**
	 * 获取指定数据库的连接
	 */
	getDatabase(databaseKey?: string) {
		const key = databaseKey || DatabaseManager.getCurrentMonthDatabaseKey();
		const d1Database = this.platform.env[key as keyof typeof this.platform.env] as D1Database;
		
		if (!d1Database) {
			throw new Error(`Database "${key}" not found in platform.env`);
		}

		return drizzle(d1Database, { schema });
	}

	/**
	 * 检查数据库是否存在
	 */
	databaseExists(databaseKey: string): boolean {
		return databaseKey in this.platform.env && 
			   this.platform.env[databaseKey as keyof typeof this.platform.env] !== undefined;
	}

	/**
	 * 获取默认数据库（当前月份）
	 */
	getDefaultDatabase() {
		return this.getDatabase();
	}

	/**
	 * 获取当前数据库信息
	 */
	getCurrentDatabaseInfo(databaseKey?: string): DatabaseInfo | null {
		const key = databaseKey || DatabaseManager.getCurrentMonthDatabaseKey();
		const databases = this.getAvailableDatabases();
		return databases.find(db => db.key === key) || null;
	}

	/**
	 * 生成新的数据库键名（基于年月）
	 */
	static generateDatabaseKey(year?: number, month?: number): string {
		const now = new Date();
		const targetYear = year || now.getFullYear();
		const targetMonth = month || (now.getMonth() + 1);
		return `d1_${targetYear}${String(targetMonth).padStart(2, '0')}`;
	}

	/**
	 * 验证数据库键名格式
	 */
	static isValidDatabaseKey(key: string): boolean {
		return /^d1_\d{6}$/.test(key);
	}
}
