import type { SkillDescriptor, SkillFrontmatter } from "./types.js";

/**
 * 解析 skill 文件后的结果结构
 * - meta: 解析后的 frontmatter 键值对
 * - body: 关闭 `---` 之后的内容
 */
type ParsedSkillFile = {
  meta: SkillFrontmatter;
  body: string;
};

/**
 * 移除字符串两端匹配的单引号或双引号
 * 用于处理 YAML 中的引号值，如 `"some value"` 或 `'another value'`
 */
function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * 将逗号分隔的字符串解析为非空、去除首尾空白的数组
 * 同时处理纯逗号分隔和带引号的值
 */
function parseListValue(value: string): string[] {
  return stripWrappingQuotes(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 解析使用 YAML frontmatter 的 skill 文件
 *
 * 期望格式：
 * ```
 * ---
 * name: my-skill
 * description: Does something useful
 * allowed-tools:
 *   - tool1
 *   - tool2
 * ---
 * Skill content goes here...
 * ```
 *
 * 支持：
 * - 键: 值对
 * - 多行列表（缩进的 `-` 项）
 * - 带引号的值（单引号或双引号，会被移除）
 * - 空值（视为空数组）
 * - 注释行（以 # 开头）
 */
export function parseSkillFile(text: string): ParsedSkillFile {
  // 匹配 YAML frontmatter：开头 ---、内容、结尾 ---、正文
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    // 未找到 frontmatter，将整个文本作为正文处理
    return { meta: {}, body: text.trim() };
  }

  const meta: Record<string, string | string[]> = {};
  const lines = (match[1] ?? "").split(/\r?\n/);
  // 解析多行列表项时，跟踪当前列表的键
  let currentListKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // 跳过空行和注释行
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    // 检查多行列表项（缩进的 "- value"）
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentListKey) {
      const existing = meta[currentListKey];
      const nextValue = stripWrappingQuotes(listMatch[1] ?? "");
      // 追加到现有列表或创建新列表
      if (Array.isArray(existing)) {
        existing.push(nextValue);
      } else if (typeof existing === "string" && existing.length > 0) {
        meta[currentListKey] = [existing, nextValue];
      } else {
        meta[currentListKey] = [nextValue];
      }
      continue;
    }

    // 查找第一个冒号来分割键和值
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      currentListKey = null;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();

    // 冒号后为空值意味着开始一个多行列表
    if (!rawValue) {
      meta[key] = [];
      currentListKey = key;
      continue;
    }

    // "allowed-tools" 是特殊的：即使在一行中也始终作为列表处理
    if (key === "allowed-tools") {
      meta[key] = parseListValue(rawValue);
    } else {
      meta[key] = stripWrappingQuotes(rawValue);
    }
    currentListKey = null;
  }

  return {
    meta: meta as SkillFrontmatter,
    body: (match[2] ?? "").trim(),
  };
}

/**
 * 从解析的 frontmatter 和正文内容构建 SkillDescriptor
 *
 * @param meta - 解析后的 frontmatter 键值对
 * @param body - frontmatter 之后的 skill 内容
 * @param fallbackName - 当 meta.name 未提供时使用的名称
 * @param filePath - skill 文件路径（用于引用）
 * @param baseDir - 用于解析相对路径的基准目录
 */
export function buildSkillDescriptor(
  meta: SkillFrontmatter,
  body: string,
  fallbackName: string,
  filePath: string,
  baseDir?: string,
): SkillDescriptor {
  // 将 allowed-tools 规范化为始终是数组
  const allowedTools = Array.isArray(meta["allowed-tools"])
    ? meta["allowed-tools"]
    : typeof meta["allowed-tools"] === "string"
      ? parseListValue(meta["allowed-tools"])
      : [];

  return {
    name: meta.name || fallbackName,
    description: meta.description || "No description",
    tags: meta.tags,
    whenToUse: meta.when_to_use,
    allowedTools,
    argumentHint: meta["argument-hint"],
    body,
    filePath,
    baseDir,
  };
}

