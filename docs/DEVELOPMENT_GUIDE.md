# 开发环境指南

## 🚀 启动方式选择

本项目支持两种不同的开发环境，适用于不同的开发场景：

### 1. Vite 开发服务器（端口 5173）

**启动命令**：
```bash
npm run dev
```

**特点**：
- ⚡ **启动速度快** - 几秒内启动
- 🔥 **热重载** - 代码修改立即生效
- 🎨 **适合 UI 开发** - 前端界面和样式调试
- 📝 **Node.js 环境** - 使用 Node.js 运行时

**适用场景**：
- 开发和调试前端界面
- 编写和测试 Svelte 组件
- 样式和布局调整
- 快速原型开发

**限制**：
- ❌ D1 数据库功能可能不完全工作
- ❌ 某些 Cloudflare 特性无法测试
- ❌ 环境变量读取方式不同

### 2. Cloudflare 开发环境（端口 8787）

**启动命令**：
```bash
# 新增的专用命令
npm run dev:cf

# 或者使用现有的 preview 命令
npm run preview
```

**特点**：
- 🌐 **完全模拟生产环境** - Cloudflare Workers/Pages 环境
- 🗄️ **D1 数据库支持** - 完整的数据库功能
- 🔌 **API 路由完全支持** - 所有后端功能正常
- 🛡️ **环境变量正确读取** - 从 .dev.vars 和 wrangler.jsonc 读取

**适用场景**：
- 测试数据库创建功能
- 验证 API 路由
- 测试 Cloudflare 特性
- 部署前最终验证

**限制**：
- 🐌 启动较慢（需要先构建）
- ❌ 无热重载（需要重新构建）

## 📊 功能对比表

| 功能 | Vite Dev (5173) | Cloudflare Dev (8787) |
|------|-----------------|----------------------|
| **启动速度** | ⚡ 2-3秒 | 🐌 10-15秒 |
| **热重载** | ✅ 支持 | ❌ 不支持 |
| **数据库创建** | ❌ 可能失败 | ✅ 完全支持 |
| **API 路由** | ⚠️ 基本支持 | ✅ 完全支持 |
| **环境变量** | 📄 .env | 📄 .dev.vars + wrangler.jsonc |
| **生产环境一致性** | ❌ 不一致 | ✅ 完全一致 |

## 🛠️ 推荐开发流程

### 阶段1: UI 开发
```bash
# 使用 Vite 进行快速 UI 开发
npm run dev
# 访问 http://localhost:5173
```

**适合**：
- 界面布局和样式
- 组件开发和调试
- 前端逻辑验证

### 阶段2: 功能测试
```bash
# 使用 Cloudflare 环境测试完整功能
npm run dev:cf
# 访问 http://localhost:8787
```

**适合**：
- 数据库功能测试
- API 接口验证
- 完整流程测试

### 阶段3: 部署前验证
```bash
# 最终验证
npm run preview
# 访问 http://localhost:8787
```

## 🔧 环境配置

### Vite 环境配置
```bash
# .env 文件
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### Cloudflare 环境配置
```bash
# .dev.vars 文件
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

```json
// wrangler.jsonc
{
  "vars": {
    "CLOUDFLARE_ACCOUNT_ID": "your-account-id"
  }
}
```

## 🎯 具体使用建议

### 开发数据库功能时
```bash
# 1. 先用 Vite 开发界面
npm run dev

# 2. 界面完成后用 Cloudflare 测试功能
npm run dev:cf

# 3. 测试数据库创建功能
# 访问 http://localhost:8787
# 点击"新建数据库"进行测试
```

### 调试样式和布局时
```bash
# 使用 Vite 获得最佳开发体验
npm run dev
# 修改代码立即看到效果
```

### 部署前最终检查
```bash
# 使用 Cloudflare 环境进行完整测试
npm run preview
# 确保所有功能在生产环境中正常工作
```

## 🚨 常见问题

### Q: 为什么数据库功能在 Vite 环境下不工作？
**A**: Vite 使用 Node.js 环境，而数据库功能需要 Cloudflare Workers 环境。请使用 `npm run dev:cf` 测试数据库功能。

### Q: 为什么 Cloudflare 环境启动这么慢？
**A**: 因为需要先构建项目，然后启动 Wrangler 服务器。这是为了完全模拟生产环境。

### Q: 可以同时运行两个环境吗？
**A**: 可以，它们使用不同的端口：
- Vite: http://localhost:5173
- Cloudflare: http://localhost:8787

### Q: 环境变量在两个环境中不一致怎么办？
**A**: 确保同时配置 `.env` 和 `.dev.vars` 文件，保持内容一致。

## 📋 快速命令参考

```bash
# 前端开发（快速、热重载）
npm run dev                 # Vite 开发服务器

# 功能测试（完整环境）
npm run dev:cf             # Cloudflare 开发环境
npm run preview            # 预览模式

# 构建和部署
npm run build              # 构建项目
npm run deploy             # 部署到 Cloudflare

# 数据库管理
npm run db:auto-setup      # 自动设置数据库
npm run db:update-binding  # 更新绑定配置

# 验证和检查
npm run validate:cicd      # 验证 CI/CD 配置
npm run check              # 类型检查
```

## 🎉 总结

- **日常开发**: 使用 `npm run dev` (端口 5173) 获得最佳开发体验
- **功能测试**: 使用 `npm run dev:cf` (端口 8787) 测试完整功能
- **部署前验证**: 使用 `npm run preview` 进行最终检查

选择合适的开发环境可以大大提高开发效率！🚀
