# Cloudflare D1 数据库管理平台

基于 SvelteKit + Cloudflare D1 + Drizzle ORM 构建的现代化数据库管理平台，支持多版本数据库管理、动态表创建和自动化部署。

## ✨ 主要特性

- 🗄️ **多版本数据库管理** - 支持按时间创建和管理多个数据库版本
- 🚀 **自动化数据库创建** - 通过 Cloudflare API 自动创建 D1 数据库
- 🛠️ **动态表创建** - 可视化界面创建数据库表结构
- 🎨 **现代化 UI** - 响应式设计和优雅的用户界面
- 🔒 **类型安全** - 完整的 TypeScript 支持
- ⚡ **高性能** - Cloudflare 边缘计算和 D1 数据库

## 📚 文档

详细的技术文档和使用指南请查看 **[docs 目录](./docs/README.md)**：

- 🚀 [快速开始指南](./docs/ENVIRONMENT_SETUP.md)
- 🏗️ [数据库设置](./docs/DATABASE_SETUP.md)
- 🎯 [功能使用说明](./docs/DATABASE_VERSION_MANAGEMENT.md)
- 🔧 [技术实现分析](./docs/ORM_API_MECHANISM_ANALYSIS.md)

## 🚀 快速开始

### 1. 环境配置

创建 `.env` 文件并配置 Cloudflare 凭据：

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_DATABASE_ID=your-database-id
```

### 2. 安装依赖

```bash
npm install
```

### 3. 数据库迁移

```bash
# 生成迁移文件
npm run db:generate

# 应用迁移到本地数据库
npm run db:migrate:local

# 应用迁移到远程数据库
npm run db:migrate:remote
```

### 4. 开发服务器

```bash
# 启动开发服务器
npm run dev

# 或者使用 Wrangler 开发环境
wrangler pages dev .svelte-kit/cloudflare --compatibility-date=2024-11-11
```

### 5. 构建和部署

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 部署到 Cloudflare Pages
npm run deploy
```

## 🛠️ 技术栈

- **前端**: SvelteKit + Tailwind CSS
- **数据库**: Cloudflare D1 + Drizzle ORM
- **部署**: Cloudflare Pages + Workers
- **类型**: TypeScript
- **构建**: Vite

## 📊 项目结构

```
├── src/
│   ├── lib/server/db/          # 数据库相关代码
│   ├── routes/                 # SvelteKit 路由
│   └── worker-configuration.d.ts
├── docs/                       # 项目文档
├── drizzle/                    # 数据库迁移文件
├── drizzle.config.ts          # Drizzle 配置
├── wrangler.jsonc             # Cloudflare 配置
└── package.json
```

## 🎯 核心功能

### 数据库版本管理
- 按年月创建数据库版本（如 `d1_202501`）
- 自动识别和切换数据库版本
- 支持多个数据库并行使用

### 自动化数据库创建
- Web 界面一键创建新数据库
- 自动应用数据库迁移
- 生成 Wrangler 配置代码

### 动态表创建
- 可视化表结构设计器
- 支持多种数据类型
- 实时 SQL 预览
- 主键和约束设置

## 📝 API 端点

- `GET /api/databases` - 获取数据库列表
- `POST /api/databases` - 创建新数据库
- `GET /api/tables` - 获取表列表
- `POST /api/tables` - 创建新表
- `GET /api/users` - 获取用户数据
- `POST /api/users` - 创建用户

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
