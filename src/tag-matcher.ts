import { TagRule } from "./settings";
import { extractFrontmatter } from "./yaml-manager";

/**
 * 转义正则表达式特殊字符
 * @param str 要转义的字符串
 * @returns 转义后的字符串
 */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * 标签匹配引擎
 * 根据配置的规则扫描笔记正文并返回匹配的标签
 */

/**
 * 提取笔记正文内容(移除frontmatter)
 * @param fullContent 完整的文件内容
 * @returns 纯正文内容
 */
export function extractBodyContent(fullContent: string): string {
	const { body } = extractFrontmatter(fullContent);
	return body;
}

/**
 * 根据规则匹配标签
 * @param content 要扫描的内容(通常是正文)
 * @param rules 标签匹配规则数组
 * @returns 匹配的标签数组(带#前缀)
 */
export function matchTags(content: string, rules: TagRule[]): string[] {
	const matchedTags = new Set<string>();

	for (const rule of rules) {
		// 跳过未启用的规则
		if (!rule.enabled) continue;

		try {
			// 智能处理: 如果关键词包含 | 说明用户想使用正则(如 "教程|tutorial"),直接使用
			// 否则视为普通文本,转义所有正则特殊字符(如 "c++" -> "c\+\+")
			let keyword = rule.keyword;
			if (!keyword.includes("|")) {
				// 不包含正则或操作符,视为普通文本,转义所有特殊字符
				keyword = escapeRegExp(keyword);
			}

			// 构建正则表达式
			const flags = rule.caseSensitive ? "g" : "gi";
			const regex = new RegExp(keyword, flags);

			// 测试是否匹配
			if (regex.test(content)) {
				// 标签名不加#前缀(存储到frontmatter中时不需要#)
				const tag = rule.tag.startsWith("#")
					? rule.tag.substring(1)
					: rule.tag;
				matchedTags.add(tag);
			}
		} catch (error) {
			// 如果正则表达式无效,跳过该规则并记录错误
			console.warn(`标签规则 "${rule.keyword}" 无效:`, error);
		}
	}

	return Array.from(matchedTags);
}

/**
 * 预览匹配结果(用于调试或显示)
 * @param content 要扫描的内容
 * @param rules 标签匹配规则数组
 * @returns 匹配详情对象数组
 */
export function previewTagMatches(
	content: string,
	rules: TagRule[],
): Array<{
	rule: TagRule;
	matched: boolean;
	tag: string;
}> {
	const results: Array<{ rule: TagRule; matched: boolean; tag: string }> = [];

	for (const rule of rules) {
		const tag = rule.tag.startsWith("#") ? rule.tag : `#${rule.tag}`;

		if (!rule.enabled) {
			results.push({ rule, matched: false, tag });
			continue;
		}

		try {
			const flags = rule.caseSensitive ? "g" : "gi";
			const regex = new RegExp(rule.keyword, flags);
			const matched = regex.test(content);

			results.push({ rule, matched, tag });
		} catch {
			results.push({ rule, matched: false, tag });
		}
	}

	return results;
}
