import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import MyPlugin from "./main";

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
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	yamlTemplates: [
		{
			name: "默认模板",
			content: "title: {{title}}\ndate: {{date}}\ntags: []",
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

		// YAML模板设置区域
		new Setting(containerEl).setName("YAML模板设置").setHeading();
		this.displayYamlTemplates(containerEl);

		// 标签规则设置区域
		new Setting(containerEl).setName("标签匹配规则").setHeading();
		this.displayTagRules(containerEl);
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
						content: "title: {{title}}\ndate: {{date}}\ntags: []",
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
				.setDesc("根据笔记内容自动生成YAML")
				.addToggle((toggle) =>
					toggle
						.setValue(template.isDynamic)
						.onChange(async (value) => {
							template.isDynamic = value;
							await this.plugin.saveSettings();
						}),
				);

			// 模板内容编辑器
			if (!template.isDynamic) {
				const contentDiv = templateDiv.createDiv({
					attr: { style: "margin-top: 10px;" },
				});
				contentDiv.createEl("label", { text: "模板内容:" });
				const textarea = contentDiv.createEl("textarea", {
					attr: {
						rows: "5",
						style: "width: 100%; margin-top: 5px; font-family: monospace;",
					},
				});
				textarea.value = template.content;
				textarea.addEventListener("change", () => {
					template.content = textarea.value;
					void this.plugin.saveSettings().then(() => {
						new Notice("模板已保存");
					});
				});
			}
		});
	}

	/**
	 * 显示标签匹配规则配置
	 */
	displayTagRules(containerEl: HTMLElement): void {
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
					style: "margin-bottom: 10px; padding: 10px; border: 1px solid var(--background-modifier-border); border-radius: 5px;",
				},
			});

			// 启用/禁用开关
			new Setting(ruleDiv)
				.setName(`规则 ${index + 1}`)
				.addToggle((toggle) =>
					toggle.setValue(rule.enabled).onChange(async (value) => {
						rule.enabled = value;
						await this.plugin.saveSettings();
					}),
				)
				.addButton((button) =>
					button
						.setIcon("trash")
						.setTooltip("删除规则")
						.onClick(async () => {
							this.plugin.settings.tagRules.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
							new Notice("已删除规则");
						}),
				);

			// 关键词输入
			new Setting(ruleDiv)
				.setName("关键词(支持正则)")
				.setDesc("匹配笔记内容的关键词或正则表达式")
				.addText((text) =>
					text
						.setPlaceholder("例如: 教程|tutorial")
						.setValue(rule.keyword)
						.onChange(async (value) => {
							rule.keyword = value;
							await this.plugin.saveSettings();
						}),
				);

			// 标签输入
			new Setting(ruleDiv)
				.setName("标签")
				.setDesc("匹配成功后添加的标签(不含#)")
				.addText((text) =>
					text
						.setPlaceholder("例如: tutorial")
						.setValue(rule.tag)
						.onChange(async (value) => {
							rule.tag = value;
							await this.plugin.saveSettings();
						}),
				);

			// 区分大小写选项
			new Setting(ruleDiv)
				.setName("区分大小写")
				.setDesc("关键词匹配时是否区分大小写")
				.addToggle((toggle) =>
					toggle
						.setValue(rule.caseSensitive)
						.onChange(async (value) => {
							rule.caseSensitive = value;
							await this.plugin.saveSettings();
						}),
				);
		});
	}
}
