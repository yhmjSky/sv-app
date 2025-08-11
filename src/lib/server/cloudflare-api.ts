/**
 * Cloudflare API 客户端
 * 用于管理 D1 数据库的创建、删除等操作
 */

export interface CloudflareConfig {
	accountId: string;
	apiToken: string;
}

export interface D1DatabaseInfo {
	uuid: string;
	name: string;
	version: string;
	num_tables: number;
	file_size: number;
	running_in_region: string;
	created_at: string;
}

export interface CreateDatabaseRequest {
	name: string;
	primary_location_hint?: string;
}

export interface CreateDatabaseResponse {
	success: boolean;
	errors: any[];
	messages: any[];
	result: D1DatabaseInfo;
}

export class CloudflareD1API {
	private config: CloudflareConfig;
	private baseUrl = 'https://api.cloudflare.com/client/v4';

	constructor(config: CloudflareConfig) {
		this.config = config;
	}

	/**
	 * 创建新的 D1 数据库
	 */
	async createDatabase(name: string, primaryLocationHint?: string): Promise<D1DatabaseInfo> {
		const url = `${this.baseUrl}/accounts/${this.config.accountId}/d1/database`;
		
		const requestBody: CreateDatabaseRequest = {
			name,
			...(primaryLocationHint && { primary_location_hint: primaryLocationHint })
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.config.apiToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to create database: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data: CreateDatabaseResponse = await response.json();
		
		if (!data.success) {
			throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
		}

		return data.result;
	}

	/**
	 * 获取所有 D1 数据库列表
	 */
	async listDatabases(): Promise<D1DatabaseInfo[]> {
		const url = `${this.baseUrl}/accounts/${this.config.accountId}/d1/database`;

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.config.apiToken}`,
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
	 * 获取指定数据库信息
	 */
	async getDatabase(databaseId: string): Promise<D1DatabaseInfo> {
		const url = `${this.baseUrl}/accounts/${this.config.accountId}/d1/database/${databaseId}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.config.apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to get database: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data = await response.json();
		
		if (!data.success) {
			throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
		}

		return data.result;
	}

	/**
	 * 删除 D1 数据库
	 */
	async deleteDatabase(databaseId: string): Promise<void> {
		const url = `${this.baseUrl}/accounts/${this.config.accountId}/d1/database/${databaseId}`;

		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this.config.apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to delete database: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data = await response.json();
		
		if (!data.success) {
			throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
		}
	}

	/**
	 * 执行 SQL 查询（用于创建表结构等）
	 */
	async executeSQL(databaseId: string, sql: string): Promise<any> {
		const url = `${this.baseUrl}/accounts/${this.config.accountId}/d1/database/${databaseId}/query`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.config.apiToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				sql: sql
			})
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
}

/**
 * 创建 Cloudflare D1 API 客户端实例
 * 支持从不同环境读取配置
 */
export function createCloudflareD1API(env?: any): CloudflareD1API {
	// 优先从传入的 env 对象读取（Cloudflare Workers 环境）
	// 然后从 process.env 读取（Node.js 环境）
	const accountId = env?.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = env?.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

	if (!accountId) {
		throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is required. Please check your .env file or wrangler.jsonc configuration.');
	}

	if (!apiToken) {
		throw new Error('CLOUDFLARE_API_TOKEN environment variable is required. Please check your .env file or set it as a Cloudflare secret.');
	}

	return new CloudflareD1API({
		accountId,
		apiToken
	});
}
