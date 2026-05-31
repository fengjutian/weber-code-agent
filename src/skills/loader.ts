import fs from "node:fs";
import path from "node:path";
import { debugLog } from "../utils.js";
import { buildSkillDescriptor, parseSkillFile } from "./frontmatter.js";
import { renderPromptCommand } from "./render.js";
import type { PromptCommand, SkillDescriptor } from "./types.js";

/**
 * 负责从指定目录加载 skill 文件并管理已加载的 skill
 *
 * 加载规则：
 * - 扫描 skillsDir 下的每个子目录（子目录名即 skill 名）
 * - 每个 skill 目录下必须包含 SKILL.md 文件
 * - 支持多目录加载（按顺序，后加载的同名 skill 会覆盖先加载的）
 */
export class SkillLoader {
  // 存储 skill 名称到 PromptCommand 的映射
  private commands = new Map<string, PromptCommand>();

  constructor(skillsDirs: string[]) {
    for (const dir of skillsDirs) {
      this.loadAll(dir);
    }
  }

  /**
   * 递归加载指定目录下的所有 skill
   * @param skillsDir - skill 根目录，如 ~/.weber/skills
   */
  private loadAll(skillsDir: string): void {
    if (!fs.existsSync(skillsDir)) return;

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    // 按名称排序确保加载顺序一致
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      // 只处理目录（每个 skill 一个目录）
      if (!entry.isDirectory()) continue;

      const baseDir = path.join(skillsDir, entry.name);
      const filePath = path.join(baseDir, "SKILL.md");
      if (!fs.existsSync(filePath)) continue;

      // 解析 frontmatter 并构建 descriptor
      const text = fs.readFileSync(filePath, "utf8");
      const { meta, body } = parseSkillFile(text);
      const descriptor = buildSkillDescriptor(meta, body, entry.name, filePath, baseDir);
      this.commands.set(descriptor.name, this.toPromptCommand(descriptor));
    }
  }

  /**
   * 将 SkillDescriptor 转换为 PromptCommand 格式
   * PromptCommand 是传递给 prompt 构建器的格式
   */
  private toPromptCommand(skill: SkillDescriptor): PromptCommand {
    return {
      name: skill.name,
      description: skill.description,
      tags: skill.tags,
      whenToUse: skill.whenToUse,
      allowedTools: [...skill.allowedTools],
      argumentHint: skill.argumentHint,
      content: skill.body,
      filePath: skill.filePath,
      baseDir: skill.baseDir,
      source: "skill",
    };
  }

  /** 返回所有已加载的 PromptCommand */
  getPromptCommands(): PromptCommand[] {
    return [...this.commands.values()];
  }

  /**
   * 返回格式化的 skill 描述列表，用于在 prompt 中展示可用 skill
   */
  getDescriptions(): string {
    const commands = this.getPromptCommands();
    debugLog("promptCommands=%s", commands);
    if (commands.length === 0) return "(no skills available)";

    return commands
      .map((command) => {
        let line = ` - ${command.name}: ${command.description}`;
        if (command.tags) line += ` [${command.tags}]`;
        return line;
      })
      .join("\n");
  }

  /**
   * 根据名称获取完整的 SkillDescriptor
   */
  getSkill(name: string): SkillDescriptor | undefined {
    const command = this.commands.get(name);
    if (!command) {
      return undefined;
    }

    // 从 PromptCommand 反向转换回 SkillDescriptor
    return {
      name: command.name,
      description: command.description,
      tags: command.tags,
      whenToUse: command.whenToUse,
      allowedTools: [...command.allowedTools],
      argumentHint: command.argumentHint,
      body: command.content,
      filePath: command.filePath,
      baseDir: command.baseDir,
    };
  }

  /** 获取原始的 PromptCommand（不经过转换） */
  getCommand(name: string): PromptCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * 渲染 skill 内容，支持传入参数
   * @param name - skill 名称
   * @param args - 可选的渲染参数
   * @returns 渲染后的内容，如果 skill 不存在则返回错误信息
   */
  renderSkill(name: string, args?: string): string {
    const command = this.commands.get(name);
    if (!command) {
      return `Error: Unknown skill '${name}'. Available: ${[...this.commands.keys()].join(", ")}`;
    }
    return renderPromptCommand(command, args);
  }
}
