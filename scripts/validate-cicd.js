#!/usr/bin/env node

/**
 * CI/CD 配置文件语法验证脚本
 * 验证 GitLab CI/CD 和 GitHub Actions 配置文件的语法正确性
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

class CICDValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * 验证 YAML 文件语法
     */
    validateYAMLSyntax(filePath, description) {
        try {
            if (!existsSync(filePath)) {
                this.errors.push(`❌ ${description}: File not found - ${filePath}`);
                return false;
            }

            const content = readFileSync(filePath, 'utf8');
            yaml.load(content);
            console.log(`✅ ${description}: YAML syntax is valid`);
            return true;
        } catch (error) {
            this.errors.push(`❌ ${description}: YAML syntax error - ${error.message}`);
            return false;
        }
    }

    /**
     * 验证 GitLab CI/CD 配置
     */
    validateGitLabCI() {
        const filePath = '.gitlab-ci.yml';
        console.log('🔍 Validating GitLab CI/CD configuration...');
        
        if (!this.validateYAMLSyntax(filePath, 'GitLab CI/CD')) {
            return false;
        }

        try {
            const content = readFileSync(filePath, 'utf8');
            const config = yaml.load(content);

            // 检查必需的字段
            if (!config.stages) {
                this.warnings.push(`⚠️ GitLab CI/CD: No 'stages' defined`);
            }

            // 检查是否使用了已弃用的语法
            const yamlContent = content.toString();
            if (yamlContent.includes('only:')) {
                this.warnings.push(`⚠️ GitLab CI/CD: Found deprecated 'only' syntax, consider using 'rules'`);
            }

            // 检查环境变量
            const requiredVars = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
            requiredVars.forEach(varName => {
                if (!yamlContent.includes(varName)) {
                    this.warnings.push(`⚠️ GitLab CI/CD: Environment variable '${varName}' not referenced`);
                }
            });

            console.log('✅ GitLab CI/CD: Configuration structure is valid');
            return true;

        } catch (error) {
            this.errors.push(`❌ GitLab CI/CD: Configuration validation error - ${error.message}`);
            return false;
        }
    }

    /**
     * 验证 GitHub Actions 配置
     */
    validateGitHubActions() {
        const filePath = '.github/workflows/auto-database-setup.yml';
        console.log('🔍 Validating GitHub Actions configuration...');
        
        if (!this.validateYAMLSyntax(filePath, 'GitHub Actions')) {
            return false;
        }

        try {
            const content = readFileSync(filePath, 'utf8');
            const config = yaml.load(content);

            // 检查必需的字段
            if (!config.on) {
                this.errors.push(`❌ GitHub Actions: No 'on' trigger defined`);
                return false;
            }

            if (!config.jobs) {
                this.errors.push(`❌ GitHub Actions: No 'jobs' defined`);
                return false;
            }

            // 检查权限设置
            if (!config.permissions) {
                this.warnings.push(`⚠️ GitHub Actions: No 'permissions' defined`);
            }

            // 检查环境变量
            const yamlContent = content.toString();
            const requiredSecrets = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
            requiredSecrets.forEach(secret => {
                if (!yamlContent.includes(`secrets.${secret}`)) {
                    this.warnings.push(`⚠️ GitHub Actions: Secret '${secret}' not referenced`);
                }
            });

            console.log('✅ GitHub Actions: Configuration structure is valid');
            return true;

        } catch (error) {
            this.errors.push(`❌ GitHub Actions: Configuration validation error - ${error.message}`);
            return false;
        }
    }

    /**
     * 验证脚本文件存在性
     */
    validateScripts() {
        console.log('🔍 Validating referenced scripts...');
        
        const scripts = [
            'scripts/auto-setup-database.js',
            'scripts/update-binding.js',
            'scripts/wrangler-config-manager.js',
            'scripts/database-manager.js'
        ];

        let allExist = true;
        scripts.forEach(script => {
            if (existsSync(script)) {
                console.log(`✅ Script exists: ${script}`);
            } else {
                this.errors.push(`❌ Script not found: ${script}`);
                allExist = false;
            }
        });

        return allExist;
    }

    /**
     * 运行所有验证
     */
    async runValidation() {
        console.log('🧪 Starting CI/CD configuration validation...');
        console.log('');

        let isValid = true;

        // 验证 GitLab CI/CD
        if (!this.validateGitLabCI()) {
            isValid = false;
        }
        console.log('');

        // 验证 GitHub Actions
        if (!this.validateGitHubActions()) {
            isValid = false;
        }
        console.log('');

        // 验证脚本文件
        if (!this.validateScripts()) {
            isValid = false;
        }
        console.log('');

        // 显示结果
        this.displayResults(isValid);
        
        return isValid;
    }

    /**
     * 显示验证结果
     */
    displayResults(isValid) {
        console.log('📊 Validation Results:');
        console.log('');

        if (this.errors.length > 0) {
            console.log('❌ Errors:');
            this.errors.forEach(error => console.log(`   ${error}`));
            console.log('');
        }

        if (this.warnings.length > 0) {
            console.log('⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(`   ${warning}`));
            console.log('');
        }

        if (isValid && this.errors.length === 0) {
            console.log('🎉 All CI/CD configurations are valid!');
            if (this.warnings.length === 0) {
                console.log('✨ No warnings found - configurations are optimal!');
            }
        } else {
            console.log('💥 Validation failed - please fix the errors above');
        }
    }
}

// 主函数
async function main() {
    const validator = new CICDValidator();
    const isValid = await validator.runValidation();
    
    process.exit(isValid ? 0 : 1);
}

// 运行验证
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Validation script error:', error);
        process.exit(1);
    });
}

export { CICDValidator };
