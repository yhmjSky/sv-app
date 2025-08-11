# Cloudflare D1 + Drizzle ORM 设置指南

本项目已经配置好了 Cloudflare D1 数据库与 Drizzle ORM 的集成。以下是使用说明：

## 项目结构

```
src/
├── lib/
│   └── server/
│       └── db/
│           ├── index.ts      # 数据库连接配置
│           └── schema.ts     # Drizzle 数据库模式定义
├── routes/
│   ├── api/
│   │   └── users/
│   │       └── +server.ts    # API 路由示例
│   ├── +page.server.ts       # 服务器端数据加载
│   └── +page.svelte          # 前端页面
└── worker-configuration.d.ts # TypeScript 类型定义
```

## 配置文件

### 1. `wrangler.jsonc`
- 配置了 D1 数据库绑定 `d1_2507`
- 数据库 ID: `7c692a4d-ce47-4b49-83ec-b39c66a0e7ba`

### 2. `drizzle.config.ts`
- 配置了 Drizzle Kit 以使用 Cloudflare D1
- 使用 `d1-http` 驱动程序
- 迁移文件输出到 `./drizzle` 目录

## 数据库操作命令

### 生成迁移文件
```bash
npm run db:generate
```

### 应用迁移（本地开发）
```bash
npm run db:migrate:local
```

### 应用迁移（生产环境）
```bash
npm run db:migrate:remote
```

### 打开 Drizzle Studio
```bash
npm run db:studio
```

## 开发流程

### 1. 修改数据库模式
编辑 `src/lib/server/db/schema.ts` 文件来定义你的数据库表结构。

### 2. 生成迁移
```bash
npm run db:generate
```

### 3. 应用迁移到本地数据库
```bash
npm run db:migrate:local
```

### 4. 在代码中使用数据库
```typescript
import { getDatabase } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

// 在 SvelteKit 路由中
export const load: PageServerLoad = async ({ platform }) => {
    const db = getDatabase(platform);
    const users = await db.select().from(user);
    return { users };
};
```

## API 示例

项目包含了一个完整的用户管理 API 示例：

- `GET /api/users` - 获取所有用户
- `POST /api/users` - 创建新用户

## 本地开发

使用 Wrangler 进行本地开发：

```bash
npm run dev
# 或者
wrangler pages dev .svelte-kit/cloudflare
```

## 部署

### 1. 首次部署前，确保远程数据库已应用迁移
```bash
npm run db:migrate:remote
```

### 2. 部署应用
```bash
npm run deploy
```

## 注意事项

1. **开发环境**: 在开发模式下，如果没有 D1 绑定，代码会抛出错误提醒你使用 `wrangler dev`
2. **类型安全**: 所有数据库操作都是类型安全的，得益于 Drizzle ORM 的 TypeScript 支持
3. **错误处理**: 代码包含了完整的错误处理和回退机制
4. **迁移管理**: 使用 Drizzle Kit 管理数据库迁移，确保数据库结构的版本控制

## 故障排除

### 如果遇到 "D1 database binding not found" 错误：
1. 确保 `wrangler.jsonc` 中的绑定名称正确
2. 确保使用 `wrangler dev` 而不是 `npm run dev` 进行本地开发
3. 检查 `src/worker-configuration.d.ts` 中的类型定义是否匹配

### 如果迁移失败：
1. 检查 `drizzle.config.ts` 中的配置
2. 确保 Wrangler 已正确认证
3. 检查数据库 ID 是否正确
