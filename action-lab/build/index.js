"use strict";
/**
 * GitLab/CLI 专用动态添加Cloudflare绑定到wrangler配置文件脚本
 *
 * 支持通过环境变量或命令行参数传递 bindings 和 file 参数
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const toml_1 = __importDefault(require("@iarna/toml"));
// @ts-ignore
const fs_1 = require("fs");
// 获取参数的通用函数
function getParam(name, fallback) {
    // 1. 优先环境变量
    if (process.env[name])
        return process.env[name];
    // 2. 其次命令行参数 --name=xxx
    const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
    if (arg)
        return arg.split("=").slice(1).join("=");
    // 3. 默认值
    return fallback;
}
// 获取 bindings 和 file 参数
const bindingsRaw = getParam("bindings");
const file = getParam("file");
if (!bindingsRaw || !file) {
    throw new Error("必须提供 bindings 和 file 参数，可通过环境变量或命令行参数传递。");
}
const bindings = JSON.parse(bindingsRaw);
// 读取配置文件内容
const content = (0, fs_1.readFileSync)(file, {
    encoding: "utf-8"
});
// 根据文件扩展名判断是TOML还是JSON格式
const isToml = file.toLowerCase().endsWith('.toml');
// 解析配置文件内容
const wrangler = (isToml) ? (toml_1.default.parse(content)) : (JSON.parse(content));
function getArrayPropertyInObject(path, key) {
    const keys = path?.split('.') || [];
    let parent = wrangler;
    if (path !== null) {
        for (let key of keys) {
            if (!parent[key]) {
                parent[key] = {};
            }
            parent = parent[key];
        }
    }
    if (!parent[key]) {
        parent[key] = [];
    }
    return parent[key];
}
for (let binding of bindings) {
    if (binding.type === "D1") {
        for (let environment of binding.environments) {
            let d1Databases;
            if (environment.environment) {
                d1Databases = getArrayPropertyInObject(`env.${environment.environment}`, "d1_databases");
            }
            else {
                d1Databases = getArrayPropertyInObject(null, "d1_databases");
            }
            // 如果d1Databases中已经存在相同的binding，则跳过
            if (d1Databases.find((item) => item.binding === binding.binding)) {
                continue;
            }
            d1Databases.push({
                binding: binding.binding,
                database_name: environment.databaseName,
                database_id: environment.databaseId
            });
        }
    }
    else if (binding.type === "KV") {
        for (let environment of binding.environments) {
            let kvNamespaces;
            if (environment.environment) {
                kvNamespaces = getArrayPropertyInObject(`env.${environment.environment}`, "kv_namespaces");
            }
            else {
                kvNamespaces = getArrayPropertyInObject(null, "kv_namespaces");
            }
            kvNamespaces.push({
                binding: binding.binding,
                id: environment.namespaceId
            });
        }
    }
}
const newContent = (isToml) ? (toml_1.default.stringify(wrangler)) : (JSON.stringify(wrangler, undefined, 2));
(0, fs_1.writeFileSync)(file, newContent, {
    encoding: "utf-8"
});
