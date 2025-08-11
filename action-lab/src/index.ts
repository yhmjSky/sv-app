/**
 * GitLab/CLI 专用动态添加Cloudflare绑定到wrangler配置文件脚本
 * 
 * 支持通过环境变量或命令行参数传递 bindings 和 file 参数
 */

// @ts-ignore
import toml from "@iarna/toml";
// @ts-ignore
import { readFileSync, writeFileSync } from "fs";
// @ts-ignore
// eslint-disable-next-line
declare const process: any;

// 获取参数的通用函数
function getParam(name: string, fallback?: string): string | undefined {
  // 1. 优先环境变量
  if (process.env[name]) return process.env[name]!;
  // 2. 其次命令行参数 --name=xxx
  const arg = process.argv.find((a: string) => a.startsWith(`--${name}=`));
  if (arg) return arg.split("=").slice(1).join("=");
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
const content = readFileSync(file, {
  encoding: "utf-8"
});

// 根据文件扩展名判断是TOML还是JSON格式
const isToml = file.toLowerCase().endsWith('.toml');

// 解析配置文件内容
const wrangler: any = (isToml)?(toml.parse(content)):(JSON.parse(content));

function getArrayPropertyInObject(path: string | null, key: string) {
  const keys = path?.split('.') || [];
  let parent = wrangler;
  if(path !== null) {
    for(let key of keys) {
      if(!parent[key]) {
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

for(let binding of bindings) {
  if(binding.type === "D1") {
    for(let environment of binding.environments) {
      let d1Databases;
      if(environment.environment) {
        d1Databases = getArrayPropertyInObject(`env.${environment.environment}`, "d1_databases");
      } else {
        d1Databases = getArrayPropertyInObject(null, "d1_databases");
      }
      // 如果d1Databases中已经存在相同的binding，则跳过
      if(d1Databases.find((item: any) => item.binding === binding.binding)) {
        continue;
      }
      d1Databases.push({
        binding: binding.binding,
        database_name: environment.databaseName,
        database_id: environment.databaseId
      });
    }
  } else if(binding.type === "KV") {
    for(let environment of binding.environments) {
      let kvNamespaces;
      if(environment.environment) {
        kvNamespaces = getArrayPropertyInObject(`env.${environment.environment}`, "kv_namespaces");
      } else {
        kvNamespaces = getArrayPropertyInObject(null, "kv_namespaces");
      }
      kvNamespaces.push({
        binding: binding.binding,
        id: environment.namespaceId
      });
    }
  }
}

const newContent = (isToml)?(toml.stringify(wrangler)):(JSON.stringify(wrangler, undefined, 2));
writeFileSync(file, newContent, {
  encoding: "utf-8"
}); 