import { YamlTemplate } from "./settings";

/**
 * YAML Frontmatter管理器
 * 处理YAML的插入、更新和动态生成
 */

/**
 * 检测并提取现有的frontmatter
 * @param content 文件内容
 * @returns { hasFrontmatter: boolean, frontmatter: string, body: string }
 */
export function extractFrontmatter(content: string): {
	hasFrontmatter: boolean;
	frontmatter: string;
	body: string;
} {
	const match = content.match(/^---\n([\s\S]*?)\n---\n/);

	if (match && match[1] !== undefined) {
		return {
			hasFrontmatter: true,
			frontmatter: match[1],
			body: content.slice(match[0].length),
		};
	}

	return {
		hasFrontmatter: false,
		frontmatter: "",
		body: content,
	};
}

/**
 * 解析简单的YAML字符串为对象
 * 支持基本的key: value格式
 * @param yamlString YAML字符串
 * @returns 解析后的对象
 */
export function parseSimpleYaml(yamlString: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = yamlString.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const colonIndex = trimmed.indexOf(":");
		if (colonIndex === -1) continue;

		const key = trimmed.substring(0, colonIndex).trim();
		let value: unknown = trimmed.substring(colonIndex + 1).trim();

		// 处理数组格式 [tag1, tag2]
		if (
			typeof value === "string" &&
			value.startsWith("[") &&
			value.endsWith("]")
		) {
			const arrayContent = value.slice(1, -1);
			value = arrayContent
				? arrayContent.split(",").map((item: string) => item.trim())
				: [];
		}
		// 移除引号
		else if (
			typeof value === "string" &&
			((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'")))
		) {
			value = value.slice(1, -1);
		}

		result[key] = value;
	}

	return result;
}

/**
 * 将对象转换为YAML字符串
 * @param obj 要转换的对象
 * @returns YAML字符串
 */
export function objectToYaml(obj: Record<string, unknown>): string {
	const lines: string[] = [];

	for (const [key, value] of Object.entries(obj)) {
		if (Array.isArray(value)) {
			if (value.length === 0) {
				lines.push(`${key}: []`);
			} else {
				lines.push(`${key}:`);
				for (const item of value) {
					lines.push(`  - ${item}`);
				}
			}
		} else {
			lines.push(`${key}: ${String(value)}`);
		}
	}

	return lines.join("\n");
}

/**
 * 替换模板中的变量
 * 支持 {{title}}, {{date}}, {{filepath}} 等变量
 * @param template 模板字符串
 * @param variables 变量映射
 * @returns 替换后的字符串
 */
export function replaceTemplateVariables(
	template: string,
	variables: Record<string, string>,
): string {
	let result = template;

	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
	}

	return result;
}

/**
 * 生成动态YAML数据
 * @param filePath 文件路径
 * @returns YAML数据对象
 */
export function generateDynamicYaml(filePath: string): Record<string, unknown> {
	const now = new Date();
	const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

	// 从文件路径提取标题
	const fileName = filePath.split("/").pop() || "Untitled";
	const title = fileName.replace(/\.md$/, "");

	// 从路径提取分类(文件夹名)
	const pathParts = filePath.split("/");
	// const category = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

	return {
		title: title,
		created: dateStr,
		updated: dateStr,
		categories: [],
		author: "",
		description: "",
		source: "",
		link: "",
		aliases: [],
		tags: [],
	};
}

/**
 * 插入或更新YAML frontmatter
 * @param content 原始文件内容
 * @param template YAML模板配置
 * @param filePath 文件路径(用于动态生成)
 * @returns 更新后的文件内容
 */
export function insertYamlFrontmatter(
	content: string,
	template: YamlTemplate,
	filePath: string = "",
): string {
	const { hasFrontmatter, frontmatter, body } = extractFrontmatter(content);

	let yamlData: Record<string, unknown>;

	if (template.isDynamic) {
		// 动态生成YAML
		const dynamicYaml = generateDynamicYaml(filePath);

		// 解析模板内容,获取用户自定义的静态字段
		const templateVariables: Record<string, string> = {
			title: filePath
				? filePath.split("/").pop()?.replace(/\.md$/, "") || "Untitled"
				: "Untitled",
			created: new Date().toISOString().split("T")[0] || "",
			updated: new Date().toISOString().split("T")[0] || "",
			filepath: filePath,
		};
		const replacedTemplate = replaceTemplateVariables(
			template.content,
			templateVariables,
		);
		const templateData = parseSimpleYaml(replacedTemplate);

		// 合并:动态生成的值优先,但保留模板中的自定义静态值
		yamlData = { ...templateData, ...dynamicYaml };
	} else {
		// 使用静态模板
		const variables: Record<string, string> = {
			title: filePath
				? filePath.split("/").pop()?.replace(/\.md$/, "") || "Untitled"
				: "Untitled",
			created: new Date().toISOString().split("T")[0] || "",
			updated: new Date().toISOString().split("T")[0] || "",
			filepath: filePath,
		};
		const replacedTemplate = replaceTemplateVariables(
			template.content,
			variables,
		);
		yamlData = parseSimpleYaml(replacedTemplate);
	}

	// 如果已有frontmatter,保留用户自定义的属性
	if (hasFrontmatter) {
		const existingData = parseSimpleYaml(frontmatter);

		// 合并策略:
		// 1. 保留所有用户已有的字段(不覆盖)
		// 2. 只添加模板中定义但用户没有的字段
		// 3. 特殊处理tags:合并去重

		const mergedData: Record<string, unknown> = { ...existingData };

		// 只添加模板中定义但用户没有的字段
		for (const [key, value] of Object.entries(yamlData)) {
			if (key === "tags") {
				// tags在循环外特殊处理
				continue;
			}
			if (!(key in mergedData)) {
				// 用户没有这个字段,添加模板的默认值
				mergedData[key] = value;
			}
			// 如果用户已有这个字段,保留用户的值,不做任何操作
		}

		// tags特殊处理:合并去重
		const existingTags = Array.isArray(mergedData.tags)
			? (mergedData.tags as string[])
			: [];
		const templateTags = Array.isArray(yamlData.tags)
			? (yamlData.tags as string[])
			: [];
		const allTags = [...existingTags, ...templateTags];
		// 去重
		const uniqueTags = Array.from(new Set(allTags));
		mergedData.tags = uniqueTags;

		yamlData = mergedData;
	}

	const yamlString = objectToYaml(yamlData);
	return `---\n${yamlString}\n---\n${body}`;
}

/**
 * 向frontmatter中添加标签
 * @param content 文件内容
 * @param newTags 要添加的新标签数组
 * @returns 更新后的文件内容
 */
export function addTagsToFrontmatter(
	content: string,
	newTags: string[],
): string {
	const { hasFrontmatter, frontmatter, body } = extractFrontmatter(content);

	if (!hasFrontmatter) {
		// 如果没有frontmatter,创建一个
		const yamlData = {
			tags: newTags,
		};
		const yamlString = objectToYaml(yamlData);
		return `---\n${yamlString}\n---\n${body}`;
	}

	const existingData = parseSimpleYaml(frontmatter);
	let existingTags: string[] = [];

	// 获取现有标签(已经是纯标签名,不需要#)
	if (existingData.tags) {
		if (Array.isArray(existingData.tags)) {
			existingTags = existingData.tags.map((tag: string) =>
				tag.startsWith("#") ? tag.substring(1) : tag,
			);
		} else if (typeof existingData.tags === "string") {
			existingTags = [
				existingData.tags.startsWith("#")
					? existingData.tags.substring(1)
					: existingData.tags,
			];
		}
	}

	// 新标签也要去掉#前缀(如果有的话)
	const cleanedNewTags = newTags.map((tag) =>
		tag.startsWith("#") ? tag.substring(1) : tag,
	);

	// 合并标签并去重
	const allTags = new Set([...existingTags, ...cleanedNewTags]);
	existingData.tags = Array.from(allTags);

	const yamlString = objectToYaml(existingData);
	return `---\n${yamlString}\n---\n${body}`;
}
