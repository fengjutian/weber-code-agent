import type { PromptCommand, SkillDescriptor } from "./types.js";

/**
 * 将 PromptCommand 渲染为带有 XML 标签的字符串格式
 *
 * 输出格式：
 * ```
 * <skill name="skill-name">
 * Base directory for this skill: /path/to/skill
 * When to use: 在什么情况下使用这个 skill
 * Allowed tools: tool1, tool2
 * Argument hint: 参数提示
 * User args:
 * 用户传入的参数
 *
 * skill 的正文内容
 * </skill>
 * ```
 *
 * @param command - 要渲染的 PromptCommand
 * @param args - 可选的用户参数，会附加在最后
 * @returns 渲染后的字符串
 */
export function renderPromptCommand(command: PromptCommand, args?: string): string {
  const parts: string[] = [`<skill name="${command.name}">`];

  if (command.baseDir) {
    parts.push(`Base directory for this skill: ${command.baseDir}`);
  }
  if (command.whenToUse) {
    parts.push(`When to use: ${command.whenToUse}`);
  }
  if (command.allowedTools.length > 0) {
    parts.push(`Allowed tools: ${command.allowedTools.join(", ")}`);
  }
  if (command.argumentHint) {
    parts.push(`Argument hint: ${command.argumentHint}`);
  }
  if (args && args.trim()) {
    parts.push(`User args:\n${args.trim()}`);
  }

  parts.push(command.content);
  parts.push("</skill>");
  return parts.join("\n\n");
}

/**
 * 将 SkillDescriptor 渲染为 prompt 格式
 * 这是一个便捷包装器，内部调用 renderPromptCommand
 *
 * @param skill - 要渲染的 SkillDescriptor
 * @param args - 可选的用户参数
 * @returns 渲染后的字符串
 */
export function renderSkillContent(skill: SkillDescriptor, args?: string): string {
  return renderPromptCommand({
    name: skill.name,
    description: skill.description,
    tags: skill.tags,
    whenToUse: skill.whenToUse,
    allowedTools: skill.allowedTools,
    argumentHint: skill.argumentHint,
    content: skill.body,
    filePath: skill.filePath,
    baseDir: skill.baseDir,
    source: "skill",
  }, args);
}
