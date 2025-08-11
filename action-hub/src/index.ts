/**
 * GitHub Action 用于动态添加Cloudflare绑定到wrangler配置文件
 * 
 * 此脚本接收绑定信息并将其添加到wrangler.toml或wrangler.json文件中
 */

// 导入所需依赖
import toml from "@iarna/toml";
import { getInput } from "@actions/core";
import { readFileSync, writeFileSync } from "fs";

// 从Action输入中获取绑定信息并解析为JSON
const bindings = JSON.parse(
  getInput("bindings", {
    required: true,
    trimWhitespace: true
  })
);

// 从Action输入中获取目标配置文件路径
const file = getInput("file", {
  required: true,
  trimWhitespace: true
});

// 读取配置文件内容
const content = readFileSync(file, {
  encoding: "utf-8"
});

// 根据文件扩展名判断是TOML还是JSON格式
const isToml = file.toLowerCase().endsWith('.toml');

// 解析配置文件内容
const wrangler: any = (isToml)?(toml.parse(content)):(JSON.parse(content));

/**
 * 在对象中获取或创建数组属性
 * 
 * 此函数用于在嵌套对象中创建数组属性，如果路径中的对象不存在则会创建
 * 
 * @param path 对象路径，使用点分隔，如 'env.production'
 * @param key 要创建的数组属性名称
 * @returns 创建的数组引用
 */
function getArrayPropertyInObject(path: string | null, key: string) {
  // 如果路径不为空，则按点分隔解析路径
  const keys = path?.split('.') || [];

  let parent = wrangler;

  // 遍历路径，确保每一级对象都存在
  if(path !== null) {
    for(let key of keys) {
      if(!parent[key]) {
        parent[key] = {};
      }
  
      parent = parent[key];
    }
  }

  // 如果数组属性不存在，则创建它
  if (!parent[key]) {
    parent[key] = [];
  }

  return parent[key];
}

// 处理每个绑定
for(let binding of bindings) {
  // 处理D1数据库绑定
  if(binding.type === "D1") {
    for(let environment of binding.environments) {
      let d1Databases;

      // 根据是否指定环境，获取对应的d1_databases数组
      if(environment.environment) {
        d1Databases = getArrayPropertyInObject(`env.${environment.environment}`, "d1_databases");
      }
      else {
        d1Databases = getArrayPropertyInObject(null, "d1_databases");
      }

      // 如果d1Databases中已经存在相同的binding，则跳过
      if(d1Databases.find((item: any) => item.binding === binding.binding)) {
        continue;
      }

      // 添加D1数据库绑定配置
      d1Databases.push({
        binding: binding.binding,
        database_name: environment.databaseName,
        database_id: environment.databaseId
      });
    }
  }
  // 处理KV命名空间绑定
  else if(binding.type === "KV") {
    for(let environment of binding.environments) {
      let kvNamespaces;

      // 根据是否指定环境，获取对应的kv_namespaces数组
      if(environment.environment) {
        kvNamespaces = getArrayPropertyInObject(`env.${environment.environment}`, "kv_namespaces");
      }
      else {
        kvNamespaces = getArrayPropertyInObject(null, "kv_namespaces");
      }

      // 添加KV命名空间绑定配置
      kvNamespaces.push({
        binding: binding.binding,
        id: environment.namespaceId
      });
    }
  }
}

// 根据文件格式将配置对象转换回字符串
const newContent = (isToml)?(toml.stringify(wrangler)):(JSON.stringify(wrangler, undefined, 2));

// 将更新后的内容写回文件
writeFileSync(file, newContent, {
  encoding: "utf-8"
});
