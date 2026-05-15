import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	TFolder,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	MyPluginSettings,
	SampleSettingTab,
} from "./settings";
import { insertYamlFrontmatter, addTagsToFrontmatter } from "./yaml-manager";
import { matchTags, extractBodyContent } from "./tag-matcher";

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// 添加左侧边栏按钮
		this.addRibbonIcon("tags", "添加YAML和标签", async () => {
			await this.applyYamlAndTags();
		});

		// 命令1: 应用YAML frontmatter
		this.addCommand({
			id: "apply-yaml",
			name: "应用YAML frontmatter",
			callback: async () => {
				await this.applyYaml();
			},
		});

		// 命令2: 应用匹配的标签
		this.addCommand({
			id: "apply-tags",
			name: "应用匹配的标签",
			callback: async () => {
				await this.applyTags();
			},
		});

		// 命令3: 同时应用YAML和标签(推荐)
		this.addCommand({
			id: "apply-yaml-and-tags",
			name: "应用YAML和标签",
			callback: async () => {
				await this.applyYamlAndTags();
			},
		});

		// 添加设置页面
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		// 清理工作(如果需要)
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 获取当前活动的Markdown视图
	 */
	getActiveMarkdownView(): MarkdownView | null {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	/**
	 * 应用YAML frontmatter
	 */
	async applyYaml(): Promise<void> {
		const view = this.getActiveMarkdownView();
		if (!view) {
			new Notice("请先打开一个笔记");
			return;
		}

		try {
			const editor = view.editor;
			const content = editor.getValue();
			const filePath = view.file?.path || "";

			// 使用第一个模板
			if (this.settings.yamlTemplates.length === 0) {
				new Notice("未配置YAML模板,请在设置中添加");
				return;
			}

			const template = this.settings.yamlTemplates[0];
			if (!template) {
				new Notice("YAML模板配置无效");
				return;
			}

			const updatedContent = insertYamlFrontmatter(
				content,
				template,
				filePath,
			);

			editor.setValue(updatedContent);
			new Notice("已添加YAML frontmatter");
		} catch (error) {
			new Notice(
				`操作失败: ${error instanceof Error ? error.message : String(error)}`,
			);
			console.error(error);
		}
	}

	/**
	 * 应用匹配的标签
	 */
	async applyTags(): Promise<void> {
		const view = this.getActiveMarkdownView();
		if (!view) {
			new Notice("请先打开一个笔记");
			return;
		}

		try {
			const editor = view.editor;
			const content = editor.getValue();

			// 提取正文内容
			const bodyContent = extractBodyContent(content);

			// 匹配标签
			const matchedTags = matchTags(bodyContent, this.settings.tagRules);

			if (matchedTags.length === 0) {
				new Notice("未匹配到任何标签");
				return;
			}

			// 添加标签到frontmatter
			const updatedContent = addTagsToFrontmatter(content, matchedTags);
			editor.setValue(updatedContent);
			new Notice(
				`已添加 ${matchedTags.length} 个标签: ${matchedTags.join(", ")}`,
			);
		} catch (error) {
			new Notice(
				`操作失败: ${error instanceof Error ? error.message : String(error)}`,
			);
			console.error(error);
		}
	}

	/**
	 * 同时应用YAML和标签(支持单文件或批量处理)
	 */
	async applyYamlAndTags(): Promise<void> {
		// 检查是否配置了目标目录
		if (this.settings.targetDirectory) {
			// 批量处理目录
			await this.processDirectory(this.settings.targetDirectory);
		} else {
			// 处理当前文件
			await this.processCurrentFile();
		}
	}

	/**
	 * 处理当前打开的文件
	 */
	async processCurrentFile(): Promise<void> {
		const view = this.getActiveMarkdownView();
		if (!view) {
			new Notice("请先打开一个笔记");
			return;
		}

		try {
			const editor = view.editor;
			const content = editor.getValue();
			const filePath = view.file?.path || "";

			// 1. 生成/插入YAML
			let updatedContent = content;
			if (this.settings.yamlTemplates.length > 0) {
				const template = this.settings.yamlTemplates[0];
				if (template) {
					updatedContent = insertYamlFrontmatter(
						content,
						template,
						filePath,
					);
				}
			}

			// 2. 匹配并添加标签
			const bodyContent = extractBodyContent(updatedContent);
			const matchedTags = matchTags(bodyContent, this.settings.tagRules);

			if (matchedTags.length > 0) {
				updatedContent = addTagsToFrontmatter(
					updatedContent,
					matchedTags,
				);
			}

			// 3. 保存更改
			editor.setValue(updatedContent);

			if (matchedTags.length > 0) {
				new Notice(
					`已添加YAML和 ${matchedTags.length} 个标签: ${matchedTags.join(", ")}`,
				);
			} else {
				new Notice("已添加YAML(未匹配到标签)");
			}
		} catch (error) {
			new Notice(
				`操作失败: ${error instanceof Error ? error.message : String(error)}`,
			);
			console.error(error);
		}
	}

	/**
	 * 批量处理目录下的所有Markdown文件
	 */
	async processDirectory(directoryPath: string): Promise<void> {
		try {
			// 获取目录
			const directory =
				this.app.vault.getAbstractFileByPath(directoryPath);

			if (!directory || !(directory instanceof TFolder)) {
				new Notice(`目录不存在: ${directoryPath}`);
				return;
			}

			// 递归获取所有Markdown文件
			const markdownFiles: TFile[] = [];
			this.collectMarkdownFiles(directory, markdownFiles);

			if (markdownFiles.length === 0) {
				new Notice(`目录中没有找到Markdown文件: ${directoryPath}`);
				return;
			}

			new Notice(`开始处理 ${markdownFiles.length} 个文件...`);

			let successCount = 0;
			let errorCount = 0;
			let totalTags = 0;

			// 批量处理文件
			for (const file of markdownFiles) {
				try {
					// 读取文件内容
					const content = await this.app.vault.read(file);
					let updatedContent = content;

					// 1. 生成/插入YAML
					if (this.settings.yamlTemplates.length > 0) {
						const template = this.settings.yamlTemplates[0];
						if (template) {
							updatedContent = insertYamlFrontmatter(
								content,
								template,
								file.path,
							);
						}
					}

					// 2. 匹配并添加标签
					const bodyContent = extractBodyContent(updatedContent);
					const matchedTags = matchTags(
						bodyContent,
						this.settings.tagRules,
					);

					if (matchedTags.length > 0) {
						updatedContent = addTagsToFrontmatter(
							updatedContent,
							matchedTags,
						);
						totalTags += matchedTags.length;
					}

					// 3. 保存更改
					await this.app.vault.modify(file, updatedContent);
					successCount++;
				} catch (error) {
					errorCount++;
					console.error(`处理文件失败 ${file.path}:`, error);
				}
			}

			// 显示处理结果
			if (errorCount === 0) {
				new Notice(
					`批量处理完成！成功处理 ${successCount} 个文件，添加了 ${totalTags} 个标签`,
				);
			} else {
				new Notice(
					`批量处理完成！成功 ${successCount} 个，失败 ${errorCount} 个，添加了 ${totalTags} 个标签`,
				);
			}
		} catch (error) {
			new Notice(
				`批量处理失败: ${error instanceof Error ? error.message : String(error)}`,
			);
			console.error(error);
		}
	}

	/**
	 * 递归收集目录下所有Markdown文件
	 */
	collectMarkdownFiles(folder: TFolder, files: TFile[]): void {
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === "md") {
				files.push(child);
			} else if (child instanceof TFolder) {
				this.collectMarkdownFiles(child, files);
			}
		}
	}
}
