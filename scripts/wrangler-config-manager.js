/**
 * Wrangler 配置文件管理器
 * 统一处理 wrangler.jsonc 的读取、修改和写入
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export class WranglerConfigManager {
    constructor(configPath = 'wrangler.jsonc') {
        this.configPath = configPath;
        this.config = null;
    }

    /**
     * 读取配置文件
     */
    load() {
        try {
            const content = readFileSync(this.configPath, 'utf-8');
            
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
    save() {
        if (!this.config) {
            throw new Error('No config loaded. Call load() first.');
        }

        try {
            // 保持原有的格式和注释结构
            const content = this.formatJsonc(this.config);
            writeFileSync(this.configPath, content, 'utf-8');
            console.log(`✅ Updated ${this.configPath}`);
        } catch (error) {
            throw new Error(`Failed to save wrangler config: ${error.message}`);
        }
    }

    /**
     * 添加或更新 D1 数据库绑定
     */
    addD1Database(binding) {
        if (!this.config) {
            throw new Error('No config loaded. Call load() first.');
        }

        // 确保 d1_databases 数组存在
        if (!this.config.d1_databases) {
            this.config.d1_databases = [];
        }

        // 检查是否已存在相同的绑定
        const existingIndex = this.config.d1_databases.findIndex(
            db => db.binding === binding.binding
        );

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
        }

        return this;
    }

    /**
     * 检查 D1 数据库绑定是否存在
     */
    hasD1Database(bindingName) {
        if (!this.config || !this.config.d1_databases) {
            return false;
        }

        return this.config.d1_databases.some(db => db.binding === bindingName);
    }

    /**
     * 获取所有 D1 数据库绑定
     */
    getD1Databases() {
        return this.config?.d1_databases || [];
    }

    /**
     * 移除 JSONC 注释
     */
    removeComments(content) {
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
    formatJsonc(config) {
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
    static getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `d1_${year}${month}`;
    }

    /**
     * 生成指定年月的数据库键名
     */
    static generateDatabaseKey(year, month) {
        return `d1_${year}${String(month).padStart(2, '0')}`;
    }

    /**
     * 验证数据库键名格式
     */
    static isValidDatabaseKey(key) {
        return /^d1_\d{6}$/.test(key);
    }
}
