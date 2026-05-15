import {
	App,
	PluginSettingTab,
	Setting,
	Notice,
	Modal,
	TFolder,
	SuggestModal,
	TAbstractFile,
} from "obsidian";
import MyPlugin from "./main";

/**
 * 文件夹选择模态框
 */
class FolderSuggestModal extends SuggestModal<string> {
	private onChooseCallback: (path: string) => void;
	private folderList: string[];

	constructor(app: App, onChooseCallback: (path: string) => void) {
		super(app);
		this.onChooseCallback = onChooseCallback;
		this.setPlaceholder("搜索或选择文件夹...");
		this.inputEl.placeholder = "搜索文件夹...";

		// 收集所有文件夹路径
		this.folderList = this.app.vault
			.getAllLoadedFiles()
			.filter((f): f is TFolder => f instanceof TFolder)
			.map((folder) => (folder.path === "/" ? "" : folder.path));
	}

	getSuggestions(query: string): string[] {
		const queryLower = query.toLowerCase();
		return this.folderList
			.filter((path) => path.toLowerCase().includes(queryLower))
			.slice(0, 100);
	}

	renderSuggestion(path: string, el: HTMLElement): void {
		// 显示文件夹图标和路径
		el.createEl("div", { text: "📁 " + (path || "根目录") });
	}

	onChooseSuggestion(path: string): void {
		this.onChooseCallback(path);
	}
}

export interface YamlTemplate {
	name: string;
	content: string;
	isDynamic: boolean;
}

export interface TagRule {
	keyword: string;
	tag: string;
	caseSensitive: boolean;
	enabled: boolean;
}

export interface MyPluginSettings {
	yamlTemplates: YamlTemplate[];
	tagRules: TagRule[];
	targetDirectory: string; // 目标目录路径,为空则处理当前文件
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	yamlTemplates: [
		{
			name: "默认模板",
			content:
				"title: {{title}}\ncreated: {{created}}\nupdated: {{updated}}\ncategories: []\nauthor: \ndescription: \nsource: \nlink: \naliases: []\ntags: []",
			isDynamic: true,
		},
	],
	tagRules: [
		{
			keyword: "教程|tutorial",
			tag: "tutorial",
			caseSensitive: false,
			enabled: true,
		},
		{
			keyword: "笔记|note",
			tag: "note",
			caseSensitive: false,
			enabled: true,
		},
	],
	targetDirectory: "", // 默认为空,处理当前文件
};

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 目标目录设置区域
		new Setting(containerEl).setName("处理设置").setHeading();
		this.displayTargetDirectory(containerEl);

		// YAML模板设置区域
		new Setting(containerEl).setName("YAML模板设置").setHeading();
		this.displayYamlTemplates(containerEl);

		// 标签规则设置区域
		new Setting(containerEl).setName("标签匹配规则").setHeading();
		this.displayTagRules(containerEl);
	}

	/**
	 * 显示目标目录配置
	 */
	displayTargetDirectory(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("目标目录")
			.setDesc(
				'指定要批量处理的目录路径(相对于Vault根目录)。留空则只处理当前打开的文件。例如: "00-Inbox" 或 "Notes/Tutorials"',
			)
			.addText((text) =>
				text
					.setPlaceholder("留空则处理当前文件")
					.setValue(this.plugin.settings.targetDirectory)
					.onChange(async (value) => {
						this.plugin.settings.targetDirectory = value.trim();
						await this.plugin.saveSettings();
					}),
			)
			.addButton((button) =>
				button.setButtonText("选择").onClick(async () => {
					// 使用Obsidian的文件夹选择器
					new FolderSuggestModal(this.app, (selectedPath) => {
						this.plugin.settings.targetDirectory = selectedPath;
						void this.plugin.saveSettings();
						// 更新输入框显示
						const inputEl = containerEl.querySelector("input");
						if (inputEl) {
							(inputEl as HTMLInputElement).value = selectedPath;
						}
						new Notice(`已选择目录: ${selectedPath || "当前文件"}`);
					}).open();
				}),
			);
	}

	/**
	 * 显示YAML模板配置
	 */
	displayYamlTemplates(containerEl: HTMLElement): void {
		// 添加新模板按钮
		new Setting(containerEl)
			.setName("添加新模板")
			.setDesc("创建一个新的YAML frontmatter模板")
			.addButton((button) =>
				button.setButtonText("添加").onClick(async () => {
					this.plugin.settings.yamlTemplates.push({
						name: "新模板",
						content:
							"title: {{title}}\ndate: {{date}}\nupdated: {{updated}}\ncategories: []\nauthor: \ndescription: \nsource: \nlink: \naliases: []\ntags: []",
						isDynamic: true,
					});
					await this.plugin.saveSettings();
					this.display();
					new Notice("已添加新模板");
				}),
			);

		// 显示现有模板列表
		this.plugin.settings.yamlTemplates.forEach((template, index) => {
			const templateDiv = containerEl.createDiv({
				cls: "yaml-template-item",
				attr: {
					style: "margin-bottom: 10px; padding: 10px; border: 1px solid var(--background-modifier-border); border-radius: 5px;",
				},
			});

			// 模板名称
			new Setting(templateDiv)
				.setName(`模板 ${index + 1}: ${template.name}`)
				.addText((text) =>
					text
						.setPlaceholder("模板名称")
						.setValue(template.name)
						.onChange(async (value) => {
							template.name = value;
							await this.plugin.saveSettings();
						}),
				)
				.addButton((button) =>
					button
						.setIcon("trash")
						.setTooltip("删除模板")
						.onClick(async () => {
							this.plugin.settings.yamlTemplates.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
							new Notice("已删除模板");
						}),
				);

			// 动态生成选项
			new Setting(templateDiv)
				.setName("动态生成")
				.setDesc("根据笔记内容自动生成YAML(关闭后可手动编辑模板内容)")
				.addToggle((toggle) =>
					toggle
						.setValue(template.isDynamic)
						.onChange(async (value) => {
							template.isDynamic = value;
							await this.plugin.saveSettings();
							this.display(); // 重新渲染以显示/隐藏编辑器
						}),
				);

			// 模板内容编辑器(始终显示)
			const contentDiv = templateDiv.createDiv({
				attr: { style: "margin-top: 10px;" },
			});
			contentDiv.createEl("label", {
				text: template.isDynamic
					? "模板内容(动态生成时会覆盖此内容):"
					: "模板内容:",
				attr: {
					style: template.isDynamic
						? "color: var(--text-muted);"
						: "",
				},
			});
			const textarea = contentDiv.createEl("textarea", {
				attr: {
					rows: "6",
					style: "width: 100%; margin-top: 5px; font-family: monospace;",
					placeholder: template.isDynamic
						? "动态生成时会使用内置模板"
						: "输入YAML模板内容",
				},
			});
			textarea.value = template.content;
			textarea.addEventListener("change", () => {
				template.content = textarea.value;
				void this.plugin.saveSettings().then(() => {
					new Notice("模板已保存");
				});
			});
		});
	}

	/**
	 * 显示批量导入对话框
	 */
	showBatchImportModal(): void {
		const modal = new Modal(this.app);
		modal.titleEl.setText("批量导入标签规则");

		const contentDiv = modal.contentEl.createDiv({
			attr: { style: "padding: 10px;" },
		});

		contentDiv.createEl("p", {
			text: "请输入JSON格式的规则映射（关键词 -> 标签）：",
		});

		const textarea = contentDiv.createEl("textarea", {
			attr: {
				rows: "15",
				style: "width: 100%; font-family: monospace; font-size: 12px;",
			},
		});

		// 预设示例
		textarea.value = `{
    "javascript": "javascript",
    "python": "python",
    "obsidian": "obsidian",
    "日记": "diary",
    "读书笔记": "reading",
    "项目管理": "project"
}`;

		const buttonDiv = contentDiv.createDiv({
			attr: { style: "margin-top: 15px; text-align: right;" },
		});

		buttonDiv
			.createEl("button", {
				text: "取消",
				attr: { style: "margin-right: 10px;" },
			})
			.addEventListener("click", () => {
				modal.close();
			});

		buttonDiv
			.createEl("button", {
				text: "导入",
				attr: {
					class: "mod-cta",
					style: "margin-right: 10px;",
				},
			})
			.addEventListener("click", async () => {
				try {
					const jsonText = textarea.value.trim();
					if (!jsonText) {
						new Notice("请输入JSON内容");
						return;
					}

					const rulesMap = JSON.parse(jsonText);

					if (
						typeof rulesMap !== "object" ||
						Array.isArray(rulesMap)
					) {
						new Notice(
							'JSON格式错误：需要对象格式 {"关键词": "标签"}',
						);
						return;
					}

					let importCount = 0;
					for (const [keyword, tag] of Object.entries(rulesMap)) {
						if (
							typeof keyword === "string" &&
							typeof tag === "string"
						) {
							// 移除标签的#前缀（如果有）
							const cleanTag = tag.startsWith("#")
								? tag.substring(1)
								: tag;

							this.plugin.settings.tagRules.push({
								keyword: keyword,
								tag: cleanTag,
								caseSensitive: false,
								enabled: true,
							});
							importCount++;
						}
					}

					await this.plugin.saveSettings();
					this.display();
					modal.close();
					new Notice(`成功导入 ${importCount} 条规则`);
				} catch (error) {
					new Notice(
						`导入失败：${error instanceof Error ? error.message : "JSON格式错误"}`,
					);
					console.error(error);
				}
			});

		modal.open();
	}

	/**
	 * 显示标签匹配规则配置
	 */
	displayTagRules(containerEl: HTMLElement): void {
		// 批量导入按钮
		new Setting(containerEl)
			.setName("批量导入规则")
			.setDesc("从JSON格式快速导入多个标签匹配规则")
			.addButton((button) =>
				button.setButtonText("导入").onClick(() => {
					this.showBatchImportModal();
				}),
			);

		// 添加新规则按钮
		new Setting(containerEl)
			.setName("添加新规则")
			.setDesc("创建一个新的标签匹配规则")
			.addButton((button) =>
				button.setButtonText("添加").onClick(async () => {
					this.plugin.settings.tagRules.push({
						keyword: "",
						tag: "",
						caseSensitive: false,
						enabled: true,
					});
					await this.plugin.saveSettings();
					this.display();
					new Notice("已添加新规则");
				}),
			);

		// 显示现有规则列表
		this.plugin.settings.tagRules.forEach((rule, index) => {
			const ruleDiv = containerEl.createDiv({
				cls: "tag-rule-item",
				attr: {
					style: "margin-bottom: 8px; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;",
				},
			});

			// 规则头部: 名称 + 开关 + 删除按钮
			const headerDiv = ruleDiv.createDiv({
				attr: {
					style: "display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;",
				},
			});

			const titleSpan = headerDiv.createSpan({
				text: `规则 ${index + 1}`,
				attr: { style: "font-weight: 600; font-size: 0.95em;" },
			});

			const controlsDiv = headerDiv.createDiv({
				attr: {
					style: "display: flex; align-items: center; gap: 8px;",
				},
			});

			// 启用/禁用开关
			const toggle = controlsDiv.createEl("input", {
				attr: {
					type: "checkbox",
					style: "cursor: pointer;",
				},
			}) as HTMLInputElement;
			toggle.checked = rule.enabled;
			toggle.addEventListener("change", () => {
				rule.enabled = toggle.checked;
				void this.plugin.saveSettings();
			});

			// 删除按钮
			const deleteBtn = controlsDiv.createEl("button", {
				text: "🗑️",
				attr: {
					style: "padding: 2px 8px; cursor: pointer; background: transparent; border: 1px solid var(--background-modifier-border); border-radius: 3px;",
				},
			});
			deleteBtn.addEventListener("click", () => {
				this.plugin.settings.tagRules.splice(index, 1);
				void this.plugin.saveSettings().then(() => {
					this.display();
					new Notice("已删除规则");
				});
			});

			// 关键词和标签并排显示
			const fieldsDiv = ruleDiv.createDiv({
				attr: {
					style: "display: grid; grid-template-columns: 1fr 1fr; gap: 8px;",
				},
			});

			// 关键词输入
			const keywordGroup = fieldsDiv.createDiv();
			const keywordLabel = keywordGroup.createEl("label", {
				text: "关键词(支持正则)",
				attr: {
					style: "display: block; font-size: 0.85em; margin-bottom: 4px; color: var(--text-muted);",
				},
			});
			const keywordInput = keywordGroup.createEl("input", {
				attr: {
					type: "text",
					placeholder: "教程|tutorial",
					value: rule.keyword,
					style: "width: 100%; padding: 4px 8px; font-size: 0.9em;",
				},
			});
			keywordInput.addEventListener("change", () => {
				rule.keyword = keywordInput.value;
				void this.plugin.saveSettings();
			});

			// 标签输入
			const tagGroup = fieldsDiv.createDiv();
			const tagLabel = tagGroup.createEl("label", {
				text: "标签(不含#)",
				attr: {
					style: "display: block; font-size: 0.85em; margin-bottom: 4px; color: var(--text-muted);",
				},
			});
			const tagInput = tagGroup.createEl("input", {
				attr: {
					type: "text",
					placeholder: "tutorial",
					value: rule.tag,
					style: "width: 100%; padding: 4px 8px; font-size: 0.9em;",
				},
			});
			tagInput.addEventListener("change", () => {
				rule.tag = tagInput.value;
				void this.plugin.saveSettings();
			});

			// 区分大小写选项(行内显示)
			const optionsDiv = ruleDiv.createDiv({
				attr: {
					style: "margin-top: 8px; display: flex; align-items: center; gap: 8px;",
				},
			});

			const caseToggle = optionsDiv.createEl("input", {
				attr: {
					type: "checkbox",
					style: "cursor: pointer;",
				},
			}) as HTMLInputElement;
			caseToggle.checked = rule.caseSensitive;
			caseToggle.addEventListener("change", () => {
				rule.caseSensitive = caseToggle.checked;
				void this.plugin.saveSettings();
			});

			optionsDiv.createSpan({
				text: "区分大小写",
				attr: { style: "font-size: 0.85em; color: var(--text-muted);" },
			});
		});
	}
}
