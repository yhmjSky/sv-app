# 环境变量配置指南

## 📋 必需的环境变量

项目需要以下环境变量才能正常运行：

### 1. 数据库配置

```bash
# 本地开发数据库 URL (用于非 Cloudflare 环境)
DATABASE_URL=file:local.db
```

### 2. Cloudflare D1 配置

```bash
# Cloudflare 账户 ID
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id

# 主数据库 ID
CLOUDFLARE_DATABASE_ID=7c692a4d-ce47-4b49-83ec-b39c66a0e7ba

# Cloudflare API Token
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

## 🔧 配置步骤

### 1. 复制环境变量模板
```bash
cp .env.example .env
```

### 2. 获取 Cloudflare Account ID
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在右侧边栏找到 "Account ID"
3. 复制并填入 `CLOUDFLARE_ACCOUNT_ID`

### 3. 获取数据库 ID
数据库 ID 已经在 `wrangler.jsonc` 中配置：
```json
"database_id": "7c692a4d-ce47-4b49-83ec-b39c66a0e7ba"
```

### 4. 创建 API Token
1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Custom token"
4. 配置权限：
   - **Account**: `Cloudflare D1:Edit`
   - **Zone Resources**: `Include - All zones`
5. 复制生成的 token 并填入 `CLOUDFLARE_API_TOKEN`

## 📁 文件说明

- `.env` - 实际的环境变量文件（不会被提交到 Git）
- `.env.example` - 环境变量模板（会被提交到 Git）
- `ENVIRONMENT_SETUP.md` - 本配置指南

## 🚀 验证配置

配置完成后，可以通过以下命令验证：

```bash
# 检查 Drizzle 配置
npm run db:generate

# 测试数据库连接
npm run build
```

## ⚠️ 注意事项

1. **安全性**: 永远不要将实际的 API Token 提交到代码仓库
2. **权限**: API Token 只需要 D1 相关权限，不要给予过多权限
3. **环境**: 生产环境和开发环境应使用不同的 API Token
4. **备份**: 建议保存 API Token 的备份，因为创建后无法再次查看

## 🔍 故障排除

### 如果遇到 "CLOUDFLARE_ACCOUNT_ID is not set" 错误：
1. 确认 `.env` 文件存在
2. 确认环境变量名称拼写正确
3. 重启开发服务器

### 如果遇到 API Token 权限错误：
1. 确认 Token 具有 D1:Edit 权限
2. 确认 Token 未过期
3. 重新创建 Token 并更新 `.env` 文件
