# 数据库管理脚本系统

这个目录包含了完整的数据库管理脚本系统，支持手动和自动化的数据库创建、表创建和配置更新。

## 📁 文件结构

```
scripts/
├── README.md                    # 本文档
├── wrangler-config-manager.js   # Wrangler 配置管理器
├── database-manager.js          # 数据库管理器
├── update-binding.js            # 手动绑定更新脚本
└── auto-setup-database.js       # 自动化数据库设置脚本
```

## 🚀 快速开始

### 环境准备

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **配置环境变量**:
   ```bash
   # .env 文件
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_API_TOKEN=your-api-token
   ```

## 📋 脚本功能

### 1. 手动绑定更新脚本 (`update-binding.js`)

**用途**: 手动创建数据库后自动更新 wrangler.jsonc 绑定配置

**使用场景**: 
- 通过 Web 界面手动创建了数据库
- 需要将现有数据库添加到项目配置中

**使用方法**:
```bash
# 自动检测数据库 ID
node scripts/update-binding.js d1_202501

# 手动指定数据库 ID
node scripts/update-binding.js d1_202501 abc123-def456-ghi789

# 查看帮助
node scripts/update-binding.js --help
```

**功能特性**:
- ✅ 自动检测数据库 ID
- ✅ 更新或添加绑定配置
- ✅ 验证数据库名称格式
- ✅ 详细的操作反馈

### 2. 自动化数据库设置脚本 (`auto-setup-database.js`)

**用途**: 专门用于 CI/CD 流水线的完整数据库设置

**使用场景**:
- 定时自动创建月度数据库
- CI/CD 流水线中的自动化部署
- 批量数据库初始化

**使用方法**:
```bash
# 创建当前月份数据库
node scripts/auto-setup-database.js

# 创建指定月份数据库
node scripts/auto-setup-database.js --year 2025 --month 2

# 干运行模式（查看将要执行的操作）
node scripts/auto-setup-database.js --dry-run

# 查看帮助
node scripts/auto-setup-database.js --help
```

**功能特性**:
- ✅ 自动创建数据库（如果不存在）
- ✅ 自动应用数据库迁移
- ✅ 自动更新 wrangler.jsonc 配置
- ✅ 智能跳过已存在的资源
- ✅ 干运行模式预览
- ✅ 详细的执行日志

## 🔧 核心模块

### WranglerConfigManager

**功能**: 管理 wrangler.jsonc 配置文件

**主要方法**:
- `load()` - 加载配置文件
- `save()` - 保存配置文件
- `addD1Database(binding)` - 添加 D1 数据库绑定
- `hasD1Database(name)` - 检查绑定是否存在
- `getCurrentMonthKey()` - 生成当前月份的数据库键名

### DatabaseManager

**功能**: 管理 Cloudflare D1 数据库操作

**主要方法**:
- `createDatabase(name)` - 创建数据库
- `databaseExists(name)` - 检查数据库是否存在
- `listDatabases()` - 获取数据库列表
- `executeSQL(id, sql)` - 执行 SQL 语句
- `applyMigrations(id)` - 应用数据库迁移
- `setupDatabase(name)` - 完整的数据库设置流程

## 🤖 CI/CD 集成

### GitHub Actions

**文件**: `.github/workflows/auto-database-setup.yml`

**触发条件**:
- 定时触发: 每月1号 UTC 00:00
- 手动触发: 支持自定义参数

**配置步骤**:
1. 在 GitHub 仓库设置中添加 Secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

2. 工作流会自动:
   - 创建月度数据库
   - 更新配置文件
   - 提交更改
   - 创建部署提醒 Issue

### GitLab CI/CD

**文件**: `.gitlab-ci.yml`

**配置步骤**:
1. 在 GitLab 项目设置中添加 CI/CD 变量:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

2. 设置定时管道:
   - 进入项目 -> CI/CD -> Schedules
   - 创建新定时任务
   - Cron 表达式: `0 0 1 * *`

## 📊 使用示例

### 场景1: 手动创建数据库后更新配置

```bash
# 1. 通过 Web 界面创建了数据库 d1_202501
# 2. 运行绑定更新脚本
node scripts/update-binding.js d1_202501

# 输出:
# ✅ Found database ID: abc123-def456-ghi789
# ➕ Adding new binding 'd1_202501'...
# ✅ Updated wrangler.jsonc
# 🎉 Binding update completed successfully!
```

### 场景2: 自动化月度数据库创建

```bash
# 1. 运行自动设置脚本
node scripts/auto-setup-database.js

# 输出:
# 🤖 Starting automated database setup...
# 📋 Target database: d1_202501
# 🔨 Setting up database...
# ✅ Database created: d1_202501 (ID: abc123-def456-ghi789)
# 🔄 Applying migrations to create tables
# ✅ All migrations applied successfully
# 🔧 Updating wrangler configuration...
# ✅ Wrangler configuration updated successfully
# 🎉 Automated database setup completed successfully!
```

### 场景3: 干运行模式检查

```bash
# 1. 检查将要执行的操作
node scripts/auto-setup-database.js --dry-run

# 输出:
# 🔍 Dry run mode - no changes will be made
# Database exists: No
# Binding exists: No
# 📋 Actions that would be performed:
#    ➕ Create database: d1_202501
#    🔄 Apply migrations to create tables
#    🔧 Add binding to wrangler.jsonc: d1_202501
```

## ⚠️ 注意事项

### 数据库命名规范
- 格式: `d1_YYYYMM`
- 示例: `d1_202501` (2025年1月)
- 自动验证格式正确性

### 环境变量要求
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID
- `CLOUDFLARE_API_TOKEN`: 具有 D1:Edit 权限的 API Token

### 权限要求
- API Token 需要 `Zone:Zone:Read`, `Account:Cloudflare D1:Edit` 权限
- CI/CD 环境需要仓库写权限（用于提交配置更改）

### 安全建议
- 使用 Secrets 存储敏感信息
- 定期轮换 API Token
- 在生产环境中启用审计日志

## 🔍 故障排除

### 常见问题

1. **环境变量未设置**
   ```
   ❌ CLOUDFLARE_ACCOUNT_ID is required
   ```
   解决: 检查 `.env` 文件或 CI/CD 变量配置

2. **API 权限不足**
   ```
   ❌ Failed to create database: 403 Forbidden
   ```
   解决: 确认 API Token 具有正确权限

3. **数据库已存在**
   ```
   ⚠️ Database d1_202501 already exists, skipping creation
   ```
   说明: 这是正常行为，脚本会智能跳过

4. **配置文件格式错误**
   ```
   ❌ Failed to load wrangler config
   ```
   解决: 检查 wrangler.jsonc 语法是否正确

## 🚀 扩展功能

### 自定义迁移文件
修改 `database-manager.js` 中的 `getMigrationFiles()` 方法来支持动态扫描迁移文件。

### 多环境支持
扩展脚本支持不同环境（开发、测试、生产）的数据库配置。

### 备份和恢复
添加数据库备份和恢复功能到现有脚本中。

---

**最后更新**: 2025年8月8日
