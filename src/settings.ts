import { Component, DropdownComponent, Events, HexString, IconName, MarkdownRenderer, Modifier, Notice, ObsidianProtocolData, Platform, PluginSettingTab, Setting, TextAreaComponent, TextComponent, debounce, setIcon, setTooltip } from 'obsidian';

import { t } from './i18n/index';
import PDFPlus from 'main';
import { ExtendedPaneType } from 'lib/workspace-lib';
import { AutoFocusTarget } from 'lib/copy-link';
import { CommandSuggest, FuzzyFileSuggest, FuzzyFolderSuggest, FuzzyMarkdownFileSuggest, KeysOfType, getModifierDictInPlatform, getModifierNameInPlatform, isHexString } from 'utils';
import { InstallerVersionModal, PAGE_LABEL_UPDATE_METHODS, PageLabelUpdateMethod } from 'modals';
import { ScrollMode, SidebarView, SpreadMode } from 'pdfjs-enums';
import { Menu } from 'obsidian';
import { PDFExternalLinkPostProcessor, PDFInternalLinkPostProcessor, PDFOutlineItemPostProcessor, PDFThumbnailItemPostProcessor } from 'post-process';
import { BibliographyManager } from 'bib';


const SELECTION_BACKLINK_VISUALIZE_STYLE = {
	'highlight': 'Highlight',
	'underline': 'Underline',
} as const;
export type SelectionBacklinkVisualizeStyle = keyof typeof SELECTION_BACKLINK_VISUALIZE_STYLE;

const HOVER_HIGHLIGHT_ACTIONS = {
	'open': 'Open backlink',
	'preview': 'Popover preview of backlink',
} as const;

const PANE_TYPE: Record<ExtendedPaneType, string> = {
	'': 'Current tab',
	'tab': 'New tab',
	'right': 'Split right',
	'left': 'Split left',
	'down': 'Split down',
	'up': 'Split up',
	'window': 'New window',
	'right-sidebar': 'Right sidebar',
	'left-sidebar': 'Left sidebar'
};

const AUTO_FOCUS_TARGETS: Record<AutoFocusTarget, string> = {
	'last-paste': 'Last pasted .md',
	'last-active': 'Last active .md',
	'last-active-and-open': 'Last active & open .md',
	'last-paste-then-last-active': 'Last pasted .md if any, otherwise last active .md',
	'last-paste-then-last-active-and-open': 'Last pasted .md if any, otherwise last active & open .md',
	'last-active-and-open-then-last-paste': 'Last active & open .md if any, otherwise last pasted .md',
};

const NEW_FILE_LOCATIONS = {
	'root': 'Vault folder',
	'current': 'Same folder as current file',
	'folder': 'In the folder specified below',
} as const;
type NewFileLocation = keyof typeof NEW_FILE_LOCATIONS;

const NEW_ATTACHMENT_LOCATIONS = {
	'root': 'Vault folder',
	'current': 'Same folder as current file',
	'folder': 'In the folder specified below',
	'subfolder': 'In subfolder under current folder',
	'obsidian': 'Same as Obsidian\'s attachment location',
} as const;
type NewAttachmentLocation = keyof typeof NEW_ATTACHMENT_LOCATIONS;

const IMAGE_EXTENSIONS = [
	'png',
	'jpg',
	'webp',
	'bmp',
] as const;
export type ImageExtension = typeof IMAGE_EXTENSIONS[number];

export interface NamedTemplate {
	name: string;
	template: string;
}

export const DEFAULT_BACKLINK_HOVER_COLOR = 'green';

const ACTION_ON_CITATION_HOVER = {
	'none': 'Same as other internal links',
	'pdf-plus-bib-popover': 'PDF++\'s custom bibliography popover',
	'google-scholar-popover': 'Google Scholar popover',
} as const;

const MOBILE_COPY_ACTIONS = {
	'text': 'Copy text',
	'obsidian': 'Obsidian default (copy as quote)',
	'pdf-plus': 'Run PDF++\'s copy command',
} as const;

export interface PDFPlusSettings {
	displayTextFormats: NamedTemplate[];
	defaultDisplayTextFormatIndex: number,
	syncDisplayTextFormat: boolean;
	syncDefaultDisplayTextFormat: boolean;
	copyCommands: NamedTemplate[];
	useAnotherCopyTemplateWhenNoSelection: boolean;
	copyTemplateWhenNoSelection: string;
	trimSelectionEmbed: boolean;
	embedMargin: number;
	noSidebarInEmbed: boolean;
	noSpreadModeInEmbed: boolean;
	embedUnscrollable: boolean;
	singleTabForSinglePDF: boolean;
	highlightExistingTab: boolean;
	existingTabHighlightOpacity: number;
	existingTabHighlightDuration: number;
	paneTypeForFirstPDFLeaf: ExtendedPaneType;
	openLinkNextToExistingPDFTab: boolean;
	openPDFWithDefaultApp: boolean;
	openPDFWithDefaultAppAndObsidian: boolean;
	focusObsidianAfterOpenPDFWithDefaultApp: boolean;
	syncWithDefaultApp: boolean;
	dontActivateAfterOpenPDF: boolean;
	dontActivateAfterOpenMD: boolean;
	highlightDuration: number;
	noTextHighlightsInEmbed: boolean;
	noAnnotationHighlightsInEmbed: boolean;
	persistentTextHighlightsInEmbed: boolean;
	persistentAnnotationHighlightsInEmbed: boolean;
	highlightBacklinks: boolean;
	selectionBacklinkVisualizeStyle: SelectionBacklinkVisualizeStyle;
	dblclickEmbedToOpenLink: boolean;
	highlightBacklinksPane: boolean;
	highlightOnHoverBacklinkPane: boolean;
	backlinkHoverColor: HexString;
	colors: Record<string, HexString>;
	defaultColor: string;
	defaultColorPaletteItemIndex: number;
	syncColorPaletteItem: boolean;
	syncDefaultColorPaletteItem: boolean;
	colorPaletteInToolbar: boolean;
	noColorButtonInColorPalette: boolean;
	colorPaletteInEmbedToolbar: boolean;
	quietColorPaletteTooltip: boolean;
	showStatusInToolbar: boolean;
	highlightColorSpecifiedOnly: boolean;
	doubleClickHighlightToOpenBacklink: boolean;
	hoverHighlightAction: keyof typeof HOVER_HIGHLIGHT_ACTIONS;
	paneTypeForFirstMDLeaf: ExtendedPaneType;
	singleMDLeafInSidebar: boolean;
	alwaysUseSidebar: boolean;
	ignoreExistingMarkdownTabIn: ('leftSplit' | 'rightSplit' | 'floatingSplit')[];
	defaultColorPaletteActionIndex: number,
	syncColorPaletteAction: boolean;
	syncDefaultColorPaletteAction: boolean;
	proxyMDProperty: string;
	hoverPDFLinkToOpen: boolean;
	ignoreHeightParamInPopoverPreview: boolean;
	filterBacklinksByPageDefault: boolean;
	showBacklinkToPage: boolean;
	enableHoverPDFInternalLink: boolean;
	recordPDFInternalLinkHistory: boolean;
	alwaysRecordHistory: boolean;
	renderMarkdownInStickyNote: boolean;
	enablePDFEdit: boolean;
	author: string;
	writeHighlightToFileOpacity: number;
	defaultWriteFileToggle: boolean;
	syncWriteFileToggle: boolean;
	syncDefaultWriteFileToggle: boolean;
	enableAnnotationContentEdit: boolean;
	warnEveryAnnotationDelete: boolean;
	warnBacklinkedAnnotationDelete: boolean;
	enableAnnotationDeletion: boolean;
	enableEditEncryptedPDF: boolean;
	pdfLinkColor: HexString;
	pdfLinkBorder: boolean;
	replaceContextMenu: boolean;
	showContextMenuOnMouseUpIf: 'always' | 'never' | Modifier;
	contextMenuConfig: { id: string, visible: boolean }[];
	selectionProductMenuConfig: ('color' | 'copy-format' | 'display')[];
	writeFileProductMenuConfig: ('color' | 'copy-format' | 'display')[];
	annotationProductMenuConfig: ('copy-format' | 'display')[];
	updateColorPaletteStateFromContextMenu: boolean;
	showContextMenuOnTablet: boolean;
	mobileCopyAction: keyof typeof MOBILE_COPY_ACTIONS;
	executeBuiltinCommandForOutline: boolean;
	executeBuiltinCommandForZoom: boolean;
	executeFontSizeAdjusterCommand: boolean;
	closeSidebarWithShowCommandIfExist: boolean;
	autoHidePDFSidebar: boolean;
	defaultSidebarView: SidebarView;
	outlineDrag: boolean;
	outlineContextMenu: boolean;
	outlineLinkDisplayTextFormat: string;
	outlineLinkCopyFormat: string;
	recordHistoryOnOutlineClick: boolean;
	popoverPreviewOnOutlineHover: boolean;
	thumbnailDrag: boolean;
	thumbnailContextMenu: boolean;
	thumbnailLinkDisplayTextFormat: string;
	thumbnailLinkCopyFormat: string;
	recordHistoryOnThumbnailClick: boolean;
	popoverPreviewOnThumbnailHover: boolean;
	annotationPopupDrag: boolean;
	showAnnotationPopupOnHover: boolean;
	useCallout: boolean;
	calloutType: string;
	calloutIcon: string;
	// canvasContextMenu: boolean;
	highlightBacklinksInEmbed: boolean;
	highlightBacklinksInHoverPopover: boolean;
	highlightBacklinksInCanvas: boolean;
	clickPDFInternalLinkWithModifierKey: boolean;
	clickOutlineItemWithModifierKey: boolean;
	clickThumbnailWithModifierKey: boolean;
	focusEditorAfterAutoPaste: boolean;
	clearSelectionAfterAutoPaste: boolean;
	respectCursorPositionWhenAutoPaste: boolean;
	blankLineAboveAppendedContent: boolean;
	autoCopy: boolean;
	autoFocus: boolean;
	autoPaste: boolean;
	autoFocusTarget: AutoFocusTarget;
	autoPasteTarget: AutoFocusTarget;
	openAutoFocusTargetIfNotOpened: boolean;
	howToOpenAutoFocusTargetIfNotOpened: ExtendedPaneType | 'hover-editor';
	closeHoverEditorWhenLostFocus: boolean;
	closeSidebarWhenLostFocus: boolean;
	openAutoFocusTargetInEditingView: boolean;
	executeCommandWhenTargetNotIdentified: boolean;
	commandToExecuteWhenTargetNotIdentified: string;
	autoPasteTargetDialogTimeoutSec: number;
	autoCopyToggleRibbonIcon: boolean;
	autoCopyIconName: string;
	autoFocusToggleRibbonIcon: boolean;
	autoFocusIconName: string;
	autoPasteToggleRibbonIcon: boolean;
	autoPasteIconName: string;
	viewSyncFollowPageNumber: boolean;
	viewSyncPageDebounceInterval: number;
	openAfterExtractPages: boolean;
	howToOpenExtractedPDF: ExtendedPaneType;
	warnEveryPageDelete: boolean;
	warnBacklinkedPageDelete: boolean;
	extractPageInPlace: boolean;
	askExtractPageInPlace: boolean;
	pageLabelUpdateWhenInsertPage: PageLabelUpdateMethod;
	pageLabelUpdateWhenDeletePage: PageLabelUpdateMethod;
	pageLabelUpdateWhenExtractPage: PageLabelUpdateMethod;
	askPageLabelUpdateWhenInsertPage: boolean;
	askPageLabelUpdateWhenDeletePage: boolean;
	askPageLabelUpdateWhenExtractPage: boolean;
	copyOutlineAsListFormat: string;
	copyOutlineAsListDisplayTextFormat: string;
	copyOutlineAsHeadingsFormat: string;
	copyOutlineAsHeadingsDisplayTextFormat: string;
	copyOutlineAsHeadingsMinLevel: number;
	newFileNameFormat: string;
	newFileTemplatePath: string;
	newPDFLocation: NewFileLocation;
	newPDFFolderPath: string;
	rectEmbedStaticImage: boolean;
	rectImageFormat: 'file' | 'data-url';
	rectImageExtension: ImageExtension;
	rectEmbedResolution: number;
	zoomToFitRect: boolean;
	rectFollowAdaptToTheme: boolean;
	includeColorWhenCopyingRectLink: boolean;
	backlinkIconSize: number;
	showBacklinkIconForSelection: boolean;
	showBacklinkIconForAnnotation: boolean;
	showBacklinkIconForOffset: boolean;
	showBacklinkIconForRect: boolean;
	showBoundingRectForBacklinkedAnnot: boolean;
	hideReplyAnnotation: boolean;
	hideStampAnnotation: boolean;
	searchLinkHighlightAll: 'true' | 'false' | 'default';
	searchLinkCaseSensitive: 'true' | 'false' | 'default';
	searchLinkMatchDiacritics: 'true' | 'false' | 'default';
	searchLinkEntireWord: 'true' | 'false' | 'default';
	dontFitWidthWhenOpenPDFLink: boolean;
	preserveCurrentLeftOffsetWhenOpenPDFLink: boolean;
	defaultZoomValue: string; // 'page-width' | 'page-height' | 'page-fit' | '<PERCENTAGE>'
	scrollModeOnLoad: ScrollMode;
	spreadModeOnLoad: SpreadMode;
	usePageUpAndPageDown: boolean;
	hoverableDropdownMenuInToolbar: boolean;
	zoomLevelInputBoxInToolbar: boolean;
	popoverPreviewOnExternalLinkHover: boolean;
	actionOnCitationHover: keyof typeof ACTION_ON_CITATION_HOVER;
	anystylePath: string;
	enableBibInEmbed: boolean;
	enableBibInHoverPopover: boolean;
	enableBibInCanvas: boolean;
	citationIdPatterns: string;
	copyAsSingleLine: boolean;
	removeWhitespaceBetweenCJChars: boolean;
	// Follows the same format as Obsidian's "Default location for new attachments
	// (`attachmentFolderPath`)" option, except for an empty string meaning 
	// following the Obsidian default
	dummyFileFolderPath: string;
	externalURIPatterns: string[];
	modifierToDropExternalPDFToCreateDummy: Modifier[];
	vim: boolean;
	vimrcPath: string;
	vimVisualMotion: boolean;
	vimScrollSize: number;
	vimLargerScrollSizeWhenZoomIn: boolean;
	vimContinuousScrollSpeed: number;
	vimSmoothScroll: boolean;
	vimHlsearch: boolean;
	vimIncsearch: boolean;
	enableVimInContextMenu: boolean;
	enableVimOutlineMode: boolean;
	vimSmoothOutlineMode: boolean;
	vimHintChars: string;
	vimHintArgs: string;
	PATH: string;
	autoCheckForUpdates: boolean;
	fixObsidianTextSelectionBug: boolean;
}

export const DEFAULT_SETTINGS: PDFPlusSettings = {
	displayTextFormats: [
		// {
		// 	name: 'Obsidian default',
		// 	template: '{{file.basename}}, page {{page}}',
		// },
		{
			name: 'Title & page',
			template: '{{file.basename}}, p.{{pageLabel}}',
		},
		{
			name: 'Page',
			template: 'p.{{pageLabel}}',
		},
		{
			name: 'Text',
			template: '{{text}}',
		},
		{
			name: 'Emoji',
			template: '📖'
		},
		{
			name: 'None',
			template: ''
		}
	],
	defaultDisplayTextFormatIndex: 0,
	syncDisplayTextFormat: true,
	syncDefaultDisplayTextFormat: false,
	copyCommands: [
		{
			name: 'Quote',
			template: '> ({{linkWithDisplay}})\n> {{text}}\n',
		},
		{
			name: 'Link',
			template: '{{linkWithDisplay}}'
		},
		{
			name: 'Embed',
			template: '!{{link}}',
		},
		{
			name: 'Callout',
			template: '> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}\n> {{text}}\n',
		},
		{
			name: 'Quote in callout',
			template: '> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}\n> > {{text}}\n> \n> ',
		}
	],
	useAnotherCopyTemplateWhenNoSelection: false,
	copyTemplateWhenNoSelection: '{{linkToPageWithDisplay}}',
	trimSelectionEmbed: false,
	embedMargin: 50,
	noSidebarInEmbed: true,
	noSpreadModeInEmbed: true,
	embedUnscrollable: false,
	singleTabForSinglePDF: true,
	highlightExistingTab: false,
	existingTabHighlightOpacity: 0.5,
	existingTabHighlightDuration: 0.75,
	paneTypeForFirstPDFLeaf: 'left',
	openLinkNextToExistingPDFTab: true,
	openPDFWithDefaultApp: false,
	openPDFWithDefaultAppAndObsidian: true,
	focusObsidianAfterOpenPDFWithDefaultApp: true,
	syncWithDefaultApp: false,
	dontActivateAfterOpenPDF: true,
	dontActivateAfterOpenMD: true,
	highlightDuration: 0.75,
	noTextHighlightsInEmbed: false,
	noAnnotationHighlightsInEmbed: true,
	persistentTextHighlightsInEmbed: true,
	persistentAnnotationHighlightsInEmbed: false,
	highlightBacklinks: true,
	selectionBacklinkVisualizeStyle: 'highlight',
	dblclickEmbedToOpenLink: true,
	highlightBacklinksPane: true,
	highlightOnHoverBacklinkPane: true,
	backlinkHoverColor: '',
	colors: {
		'Yellow': '#ffd000',
		'Red': '#ea5252',
		'Note': '#086ddd',
		'Important': '#bb61e5',
	},
	defaultColor: '',
	defaultColorPaletteItemIndex: 0,
	syncColorPaletteItem: true,
	syncDefaultColorPaletteItem: false,
	colorPaletteInToolbar: true,
	noColorButtonInColorPalette: true,
	colorPaletteInEmbedToolbar: false,
	quietColorPaletteTooltip: false,
	showStatusInToolbar: true,
	highlightColorSpecifiedOnly: false,
	doubleClickHighlightToOpenBacklink: true,
	hoverHighlightAction: 'preview',
	paneTypeForFirstMDLeaf: 'right',
	singleMDLeafInSidebar: true,
	alwaysUseSidebar: true,
	ignoreExistingMarkdownTabIn: [],
	defaultColorPaletteActionIndex: 4,
	syncColorPaletteAction: true,
	syncDefaultColorPaletteAction: false,
	proxyMDProperty: 'PDF',
	hoverPDFLinkToOpen: false,
	ignoreHeightParamInPopoverPreview: true,
	filterBacklinksByPageDefault: true,
	showBacklinkToPage: true,
	enableHoverPDFInternalLink: true,
	recordPDFInternalLinkHistory: true,
	alwaysRecordHistory: true,
	renderMarkdownInStickyNote: false,
	enablePDFEdit: false,
	author: '',
	writeHighlightToFileOpacity: 0.2,
	defaultWriteFileToggle: false,
	syncWriteFileToggle: true,
	syncDefaultWriteFileToggle: false,
	enableAnnotationDeletion: true,
	warnEveryAnnotationDelete: false,
	warnBacklinkedAnnotationDelete: true,
	enableAnnotationContentEdit: true,
	enableEditEncryptedPDF: false,
	pdfLinkColor: '#04a802',
	pdfLinkBorder: false,
	replaceContextMenu: true,
	showContextMenuOnMouseUpIf: 'Mod',
	contextMenuConfig: [
		{ id: 'action', visible: true },
		{ id: 'selection', visible: true },
		{ id: 'write-file', visible: true },
		{ id: 'annotation', visible: true },
		{ id: 'modify-annotation', visible: true },
		{ id: 'link', visible: true },
		{ id: 'text', visible: true },
		{ id: 'search', visible: true },
		{ id: 'speech', visible: true },
		{ id: 'page', visible: true },
		{ id: 'settings', visible: true },
	],
	selectionProductMenuConfig: ['color', 'copy-format', 'display'],
	writeFileProductMenuConfig: ['color', 'copy-format', 'display'],
	annotationProductMenuConfig: ['copy-format', 'display'],
	updateColorPaletteStateFromContextMenu: true,
	mobileCopyAction: 'pdf-plus',
	showContextMenuOnTablet: false,
	executeBuiltinCommandForOutline: true,
	executeBuiltinCommandForZoom: true,
	executeFontSizeAdjusterCommand: true,
	closeSidebarWithShowCommandIfExist: true,
	autoHidePDFSidebar: false,
	defaultSidebarView: SidebarView.THUMBS,
	outlineDrag: true,
	outlineContextMenu: true,
	outlineLinkDisplayTextFormat: '{{file.basename}}, {{text}}',
	outlineLinkCopyFormat: '{{linkWithDisplay}}',
	recordHistoryOnOutlineClick: true,
	popoverPreviewOnOutlineHover: true,
	thumbnailDrag: true,
	thumbnailContextMenu: true,
	thumbnailLinkDisplayTextFormat: '{{file.basename}}, p.{{pageLabel}}',
	thumbnailLinkCopyFormat: '{{linkWithDisplay}}',
	recordHistoryOnThumbnailClick: true,
	popoverPreviewOnThumbnailHover: true,
	annotationPopupDrag: true,
	showAnnotationPopupOnHover: true,
	useCallout: true,
	calloutType: 'PDF',
	calloutIcon: 'highlighter',
	// canvasContextMenu: true
	highlightBacklinksInEmbed: false,
	highlightBacklinksInHoverPopover: false,
	highlightBacklinksInCanvas: true,
	clickPDFInternalLinkWithModifierKey: true,
	clickOutlineItemWithModifierKey: true,
	clickThumbnailWithModifierKey: true,
	focusEditorAfterAutoPaste: true,
	clearSelectionAfterAutoPaste: true,
	respectCursorPositionWhenAutoPaste: true,
	blankLineAboveAppendedContent: true,
	autoCopy: false,
	autoFocus: false,
	autoPaste: false,
	autoFocusTarget: 'last-active-and-open-then-last-paste',
	autoPasteTarget: 'last-active-and-open-then-last-paste',
	openAutoFocusTargetIfNotOpened: true,
	howToOpenAutoFocusTargetIfNotOpened: 'right',
	closeHoverEditorWhenLostFocus: true,
	closeSidebarWhenLostFocus: false,
	openAutoFocusTargetInEditingView: true,
	executeCommandWhenTargetNotIdentified: true,
	commandToExecuteWhenTargetNotIdentified: 'switcher:open',
	autoPasteTargetDialogTimeoutSec: 20,
	autoCopyToggleRibbonIcon: true,
	autoCopyIconName: 'highlighter',
	autoFocusToggleRibbonIcon: true,
	autoFocusIconName: 'zap',
	autoPasteToggleRibbonIcon: true,
	autoPasteIconName: 'clipboard-paste',
	viewSyncFollowPageNumber: true,
	viewSyncPageDebounceInterval: 0.3,
	openAfterExtractPages: true,
	howToOpenExtractedPDF: 'tab',
	warnEveryPageDelete: false,
	warnBacklinkedPageDelete: true,
	extractPageInPlace: false,
	askExtractPageInPlace: true,
	pageLabelUpdateWhenInsertPage: 'keep',
	pageLabelUpdateWhenDeletePage: 'keep',
	pageLabelUpdateWhenExtractPage: 'keep',
	askPageLabelUpdateWhenInsertPage: true,
	askPageLabelUpdateWhenDeletePage: true,
	askPageLabelUpdateWhenExtractPage: true,
	copyOutlineAsListFormat: '{{linkWithDisplay}}',
	copyOutlineAsListDisplayTextFormat: '{{text}}',
	copyOutlineAsHeadingsFormat: '{{text}}\n\n{{linkWithDisplay}}',
	copyOutlineAsHeadingsDisplayTextFormat: 'p.{{pageLabel}}',
	copyOutlineAsHeadingsMinLevel: 2,
	newFileNameFormat: '',
	newFileTemplatePath: '',
	newPDFLocation: 'current',
	newPDFFolderPath: '',
	rectEmbedStaticImage: false,
	rectImageFormat: 'file',
	rectImageExtension: 'webp',
	zoomToFitRect: false,
	rectFollowAdaptToTheme: true,
	rectEmbedResolution: 100,
	includeColorWhenCopyingRectLink: true,
	backlinkIconSize: 50,
	showBacklinkIconForSelection: false,
	showBacklinkIconForAnnotation: false,
	showBacklinkIconForOffset: true,
	showBacklinkIconForRect: false,
	showBoundingRectForBacklinkedAnnot: false,
	hideReplyAnnotation: false,
	hideStampAnnotation: false,
	searchLinkHighlightAll: 'true',
	searchLinkCaseSensitive: 'true',
	searchLinkMatchDiacritics: 'default',
	searchLinkEntireWord: 'false',
	dontFitWidthWhenOpenPDFLink: true,
	preserveCurrentLeftOffsetWhenOpenPDFLink: false,
	defaultZoomValue: 'page-width',
	scrollModeOnLoad: ScrollMode.VERTICAL,
	spreadModeOnLoad: SpreadMode.NONE,
	usePageUpAndPageDown: true,
	hoverableDropdownMenuInToolbar: true,
	zoomLevelInputBoxInToolbar: true,
	popoverPreviewOnExternalLinkHover: true,
	actionOnCitationHover: 'pdf-plus-bib-popover',
	anystylePath: '',
	enableBibInEmbed: false,
	enableBibInHoverPopover: false,
	enableBibInCanvas: true,
	citationIdPatterns: '^cite.\n^bib\\d+$',
	copyAsSingleLine: true,
	removeWhitespaceBetweenCJChars: true,
	dummyFileFolderPath: '',
	externalURIPatterns: [
		'.*\\.pdf$',
		'https://arxiv.org/pdf/.*'
	],
	modifierToDropExternalPDFToCreateDummy: ['Shift'],
	vim: false,
	vimrcPath: '',
	vimVisualMotion: true,
	vimScrollSize: 40,
	vimLargerScrollSizeWhenZoomIn: true,
	vimContinuousScrollSpeed: 1.2,
	vimSmoothScroll: true,
	vimHlsearch: true,
	vimIncsearch: true,
	enableVimInContextMenu: true,
	enableVimOutlineMode: true,
	vimSmoothOutlineMode: true,
	vimHintChars: 'hjklasdfgyuiopqwertnmzxcvb',
	vimHintArgs: 'all',
	PATH: '',
	autoCheckForUpdates: true,
	fixObsidianTextSelectionBug: true,
};


export function isPDFPlusSettingsKey(key: string): key is keyof PDFPlusSettings {
	return DEFAULT_SETTINGS.hasOwnProperty(key);
}


const modKey = getModifierNameInPlatform('Mod').toLowerCase();


export class PDFPlusSettingTab extends PluginSettingTab {
	component: Component;
	items: Partial<Record<keyof PDFPlusSettings, Setting>>;
	headings: Map<string, Setting>;
	iconHeadings: Map<string, Setting>;
	headerEls: Map<string, HTMLElement>;
	promises: Promise<any>[];

	contentEl: HTMLElement;
	headerContainerEl: HTMLElement;

	events = new Events();

	constructor(public plugin: PDFPlus) {
		super(plugin.app, plugin);
		this.component = new Component();
		this.items = {};
		this.headings = new Map();
		this.iconHeadings = new Map();
		this.headerEls = new Map();
		this.promises = [];

		this.containerEl.addClass('pdf-plus-settings');
		this.headerContainerEl = this.containerEl.createDiv('header-container');
		this.contentEl = this.containerEl.createDiv('content');
	}

	addSetting(settingName?: keyof PDFPlusSettings) {
		const item = new Setting(this.contentEl);
		if (settingName) {
			this.items[settingName] = item;
			this.component.registerDomEvent(item.settingEl, 'contextmenu', (evt) => {
				evt.preventDefault();
				new Menu()
					.addItem((item) => {
						item.setTitle('Restore default value of this setting')
							.setIcon('lucide-undo-2')
							.onClick(async () => {
								// @ts-ignore
								this.plugin.settings[settingName] = this.plugin.getDefaultSettings()[settingName];
								await this.plugin.saveSettings();

								this.redisplay();

								new Notice(`${this.plugin.manifest.name}: Default setting restored. Note that some options require a restart to take effect.`, 6000);
							});
					})
					.addItem((item) => {
						item.setTitle('Copy link to this setting')
							.setIcon('lucide-link')
							.onClick(() => {
								navigator.clipboard.writeText(`obsidian://pdf-plus?setting=${settingName}`);
							});
					})
					.showAtMouseEvent(evt);
			});
		}
		return item;
	}

	addHeading(heading: string, id: string, icon?: IconName, processHeaderDom?: (dom: { headerEl: HTMLElement, iconEl: HTMLElement, titleEl: HTMLElement }) => void) {
		const setting = this.addSetting()
			.setName(heading)
			.setHeading()
			.then((setting) => {
				if (icon) {
					const parentEl = setting.settingEl.parentElement;
					if (parentEl) {
						parentEl.insertBefore(createDiv('spacer'), setting.settingEl);
					}

					const iconEl = createDiv();
					setting.settingEl.prepend(iconEl);
					setIcon(iconEl, icon);

					setting.settingEl.addClass('pdf-plus-setting-heading');
				}
			});

		this.headings.set(id, setting);
		this.component.registerDomEvent(setting.settingEl, 'contextmenu', (evt) => {
			evt.preventDefault();
			new Menu()
				.addItem((item) => {
					item.setTitle('Copy link to this heading')
						.setIcon('lucide-link')
						.onClick(() => {
							navigator.clipboard.writeText(`obsidian://pdf-plus?setting=heading:${id}`);
						});
				})
				.showAtMouseEvent(evt);
		});

		if (icon) {
			this.headerContainerEl.createDiv('clickable-icon header', (headerEl) => {
				const iconEl = headerEl.createDiv();
				setIcon(iconEl, icon);

				const titleEl = headerEl.createDiv('header-title');
				titleEl.setText(heading);

				setTooltip(headerEl, heading);

				this.component.registerDomEvent(headerEl, 'click', (evt) => {
					(setting.settingEl.previousElementSibling ?? setting.settingEl).scrollIntoView({ behavior: 'smooth' });
					this.updateHeaderElClassOnScroll(evt);
				});

				processHeaderDom?.({ headerEl, iconEl, titleEl });

				this.iconHeadings.set(id, setting);
				this.headerEls.set(id, headerEl);
			});
		}

		return setting;
	}

	updateHeaderElClass() {
		const tabHeight = this.containerEl.getBoundingClientRect().height;

		const headingEntries = Array.from(this.iconHeadings.entries());
		for (let i = 0; i < headingEntries.length; i++) {
			const top = headingEntries[i][1].settingEl.getBoundingClientRect().top;
			const bottom = headingEntries[i + 1]?.[1].settingEl.getBoundingClientRect().top
				?? this.contentEl.getBoundingClientRect().bottom;
			const isVisible = top <= tabHeight * 0.85 && bottom >= tabHeight * 0.2 + this.headerContainerEl.clientHeight;
			const id = headingEntries[i][0];
			this.headerEls.get(id)?.toggleClass('is-active', isVisible);
		}
	}

	updateHeaderElClassOnScroll(evt?: MouseEvent) {
		const win = evt?.win ?? activeWindow;
		const timer = win.setInterval(() => this.updateHeaderElClass(), 50);
		win.setTimeout(() => win.clearInterval(timer), 1500);
	}

	scrollTo(settingName: keyof PDFPlusSettings, options?: { behavior: ScrollBehavior }) {
		const setting = this.items[settingName];
		if (setting) this.scrollToSetting(setting, options);
	}

	scrollToHeading(id: string, options?: { behavior: ScrollBehavior }) {
		const setting = this.headings.get(id);
		if (setting) this.scrollToSetting(setting, options);
	}

	scrollToSetting(setting: Setting, options?: { behavior: ScrollBehavior }) {
		const el = setting.settingEl;
		if (el) this.containerEl.scrollTo({ top: el.offsetTop - this.headerContainerEl.offsetHeight, ...options });
	}

	openFromObsidianUrl(params: ObsidianProtocolData) {
		const id = params.setting;
		if (id.startsWith('heading:')) {
			this.plugin.openSettingTab()
				.scrollToHeading(id.slice('heading:'.length));
		} else if (isPDFPlusSettingsKey(id)) {
			this.plugin.openSettingTab()
				.scrollTo(id);
		}
		return;
	}

	getVisibilityToggler(setting: Setting, condition: () => boolean) {
		const toggleVisibility = () => {
			condition() ? setting.settingEl.show() : setting.settingEl.hide();
		};
		toggleVisibility();
		return toggleVisibility;
	}

	showConditionally(setting: Setting | Setting[], condition: () => boolean) {
		const settings = Array.isArray(setting) ? setting : [setting];
		const togglers = settings.map((setting) => this.getVisibilityToggler(setting, condition));
		this.events.on('update', () => togglers.forEach((toggler) => toggler()));
		return settings;
	}

	addTextSetting(settingName: KeysOfType<PDFPlusSettings, string>, placeholder?: string, onBlurOrEnter?: (setting: Setting) => any) {
		const setting = this.addSetting(settingName)
			.addText((text) => {
				text.setValue(this.plugin.settings[settingName])
					.setPlaceholder(placeholder ?? '')
					.then((text) => {
						if (placeholder) {
							text.inputEl.size = Math.max(text.inputEl.size, text.inputEl.placeholder.length);
						}
					})
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				if (onBlurOrEnter) {
					this.component.registerDomEvent(text.inputEl, 'blur', () => {
						onBlurOrEnter(setting);
					});
					this.component.registerDomEvent(text.inputEl, 'keypress', (evt) => {
						if (evt.key === 'Enter') onBlurOrEnter(setting);
					});
				}
			});
		return setting;
	}

	addTextAreaSetting(settingName: KeysOfType<PDFPlusSettings, string>, placeholder?: string, onBlur?: () => any) {
		return this.addSetting(settingName)
			.addTextArea((text) => {
				text.setValue(this.plugin.settings[settingName])
					.setPlaceholder(placeholder ?? '')
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				if (onBlur) this.component.registerDomEvent(text.inputEl, 'blur', onBlur);
			});
	}

	addNumberSetting(settingName: KeysOfType<PDFPlusSettings, number>) {
		return this.addSetting(settingName)
			.addText((text) => {
				text.setValue('' + this.plugin.settings[settingName])
					.setPlaceholder('' + DEFAULT_SETTINGS[settingName])
					.then((text) => text.inputEl.type = 'number')
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value === '' ? DEFAULT_SETTINGS[settingName] : +value;
						await this.plugin.saveSettings();
					});
			});
	}

	addToggleSetting(settingName: KeysOfType<PDFPlusSettings, boolean>, extraOnChange?: (value: boolean) => void) {
		return this.addSetting(settingName)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addColorPickerSetting(settingName: KeysOfType<PDFPlusSettings, HexString>, extraOnChange?: (value: HexString) => void) {
		return this.addSetting(settingName)
			.addColorPicker((picker) => {
				picker.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addDropdownSetting(settingName: KeysOfType<PDFPlusSettings, string>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: string) => void): Setting;
	addDropdownSetting(settingName: KeysOfType<PDFPlusSettings, string>, options: Record<string, string>, extraOnChange?: (value: string) => void): Setting;
	addDropdownSetting(settingName: KeysOfType<PDFPlusSettings, string>, ...args: any[]) {
		let options: string[] = [];
		let display = (optionValue: string) => optionValue;
		let extraOnChange = (value: string) => { };
		if (Array.isArray(args[0])) {
			options = args[0];
			if (typeof args[1] === 'function') display = args[1];
			if (typeof args[2] === 'function') extraOnChange = args[2];
		} else {
			options = Object.keys(args[0]);
			display = (optionValue: string) => args[0][optionValue];
			if (typeof args[1] === 'function') extraOnChange = args[1];
		}
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				dropdown.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addIndexDropdownSetting(settingName: KeysOfType<PDFPlusSettings, number>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: number) => void): Setting {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display?.(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				const index = this.plugin.settings[settingName];
				const option = options[index];
				dropdown.setValue(option)
					.onChange(async (value) => {
						const newIndex = options.indexOf(value);
						if (newIndex !== -1) {
							// @ts-ignore
							this.plugin.settings[settingName] = newIndex;
							await this.plugin.saveSettings();
							extraOnChange?.(newIndex);
						}
					});
			});
	}

	addEnumDropdownSetting(settingName: KeysOfType<PDFPlusSettings, number>, enumObj: Record<string, string>, extraOnChange?: (value: number) => void) {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const [key, value] of Object.entries(enumObj)) {
					if (parseInt(key).toString() === key) {
						dropdown.addOption(key, value);
					}
				}
				dropdown.setValue('' + this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = +value;
						await this.plugin.saveSettings();
						extraOnChange?.(+value);
					});
			});
	}

	addSliderSetting(settingName: KeysOfType<PDFPlusSettings, number>, min: number, max: number, step: number) {
		return this.addSetting(settingName)
			.addSlider((slider) => {
				slider.setLimits(min, max, step)
					.setValue(this.plugin.settings[settingName])
					.setDynamicTooltip()
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
			});
	}

	addDesc(desc: string) {
		return this.addSetting()
			.setDesc(desc);
	}

	addFileLocationSetting(
		settingName: KeysOfType<PDFPlusSettings, NewFileLocation>,
		postProcessDropdownSetting: (setting: Setting) => any,
		folderPathSettingName: KeysOfType<PDFPlusSettings, string>,
		postProcessFolderPathSetting: (setting: Setting) => any
	) {
		return [
			this.addDropdownSetting(settingName, NEW_FILE_LOCATIONS, () => this.redisplay())
				.then(postProcessDropdownSetting),
			this.addSetting()
				.addText((text) => {
					text.setValue(this.plugin.settings[folderPathSettingName]);
					text.inputEl.size = 30;
					new FuzzyFolderSuggest(this.app, text.inputEl)
						.onSelect(({ item: folder }) => {
							// @ts-ignore
							this.plugin.settings[folderPathSettingName] = folder.path;
							this.plugin.saveSettings();
						});
				})
				.then((setting) => {
					postProcessFolderPathSetting(setting);
					if (this.plugin.settings[settingName] !== 'folder') {
						setting.settingEl.hide();
					}
				})
		];
	}

	addAttachmentLocationSetting(settingName: KeysOfType<PDFPlusSettings, string>, defaultSubfolder: string, postProcessSettings: (locationSetting: Setting, folderPathSetting: Setting, subfolderPathSetting: Setting) => any) {
		let locationDropdown: DropdownComponent;
		let folderPathText: TextComponent;
		let subfolderPathText: TextComponent;

		const toggleVisibility = () => {
			const value = locationDropdown.getValue();
			folderPathSetting.settingEl.toggle(value === 'folder');
			subfolderPathSetting.settingEl.toggle(value === 'subfolder');
		};
		const getNewAttachmentFolderPath = () => {
			const value = locationDropdown.getValue() as NewAttachmentLocation;
			if (value === 'root') {
				return '/';
			}
			if (value === 'folder') {
				return folderPathText.getValue() || defaultSubfolder;
			}
			if (value === 'current') {
				return './';
			}
			if (value === 'subfolder') {
				return './' + (subfolderPathText.getValue() || defaultSubfolder);
			}
			return ''; // An empty string means matching the Obsidian default
		};
		const setValues = (value: string) => {
			if (value === '') {
				locationDropdown.setValue('obsidian');
				return;
			}
			if (value === '/') {
				locationDropdown.setValue('root');
				return;
			}
			if (value !== '.' && value !== './') {
				if (value.startsWith('./')) {
					const subfolderName = value.slice(2);
					locationDropdown.setValue('subfolder');
					subfolderPathText.setValue(subfolderName !== defaultSubfolder ? subfolderName : '');
					return;
				}
				locationDropdown.setValue('folder');
				folderPathText.setValue(value !== defaultSubfolder ? value : '');
				return;
			}
			locationDropdown.setValue('current');
			return;
		};

		const locationSetting = this.addSetting(settingName)
			.addDropdown((dropdown) => {
				dropdown.onChange(async () => {
					toggleVisibility();
					// @ts-ignore
					this.plugin.settings[settingName] = getNewAttachmentFolderPath();
					await this.plugin.saveSettings();
				});
				dropdown.addOptions(NEW_ATTACHMENT_LOCATIONS);
				locationDropdown = dropdown;
			});
		const folderPathSetting = this.addSetting()
			.addText((text) => {
				text.setPlaceholder(defaultSubfolder)
					.onChange(async () => {
						// @ts-ignore
						this.plugin.settings[settingName] = getNewAttachmentFolderPath();
						await this.plugin.saveSettings();
					});
				new FuzzyFolderSuggest(this.app, text.inputEl)
					.onSelect(() => {
						setTimeout(async () => {
							// @ts-ignore
							this.plugin.settings[settingName] = getNewAttachmentFolderPath();
							await this.plugin.saveSettings();
						});
					});
				folderPathText = text;
			});
		const subfolderPathSetting = this.addSetting()
			.addText((text) => {
				text.setPlaceholder(defaultSubfolder)
					.onChange(async () => {
						// @ts-ignore
						this.plugin.settings[settingName] = getNewAttachmentFolderPath();
						await this.plugin.saveSettings();
					});
				subfolderPathText = text;
			});

		postProcessSettings(locationSetting, folderPathSetting, subfolderPathSetting);

		setValues(this.plugin.settings[settingName]);
		toggleVisibility();
	}

	addFundingButton() {
		const postProcessIcon = (iconEl: Element) => {
			const svg = iconEl.firstElementChild;
			if (svg?.tagName === 'svg') {
				svg.setAttribute('fill', 'var(--color-red)');
				svg.setAttribute('stroke', 'var(--color-red)');
			}
		};

		return this.addHeading(
			t('heading.support-development', 'Support development'),
			'funding',
			'lucide-heart',
			({ iconEl }) => postProcessIcon(iconEl)
		)
			.setDesc(t('desc.support-development', 'If you find PDF++ helpful, please consider supporting the development to help me keep this plugin alive.\n\nIf you prefer PayPal, please make donations via Ko-fi. Thank you!'))
			.then((setting) => {
				const infoEl = setting.infoEl;
				const iconEl = setting.settingEl.firstElementChild;
				if (!iconEl) return;

				const container = setting.settingEl.createDiv();
				container.appendChild(iconEl);
				container.appendChild(infoEl);
				setting.settingEl.prepend(container);

				setting.settingEl.id = 'pdf-plus-funding';
				container.id = 'pdf-plus-funding-icon-info-container';
				iconEl.id = 'pdf-plus-funding-icon';

				postProcessIcon(iconEl);
			})
			.addButton((button) => {
				button
					.setButtonText(t('button.github-sponsors', 'GitHub Sponsors'))
					.onClick(() => {
						open('https://github.com/sponsors/RyotaUshio');
					});
			})
			.addButton((button) => {
				button
					.setButtonText(t('button.buy-me-a-coffee', 'Buy Me a Coffee'))
					.onClick(() => {
						open('https://www.buymeacoffee.com/ryotaushio');
					});
			})
			.addButton((button) => {
				button
					.setButtonText(t('button.ko-fi', 'Ko-fi'))
					.onClick(() => {
						open('https://ko-fi.com/ryotaushio');
					});
			});
	}

	async renderMarkdown(lines: string[] | string, el: HTMLElement) {
		this.promises.push(this._renderMarkdown(lines, el));
		el.addClass('markdown-rendered');
	}

	async _renderMarkdown(lines: string[] | string, el: HTMLElement) {
		await MarkdownRenderer.render(this.app, Array.isArray(lines) ? lines.join('\n') : lines, el, '', this.component);
		if (el.childNodes.length === 1 && el.firstChild instanceof HTMLParagraphElement) {
			el.replaceChildren(...el.firstChild.childNodes);
		}
	}

	addColorSetting(index: number) {
		const colors = this.plugin.settings.colors;
		let [name, color] = Object.entries(colors)[index];
		let previousColor = color;
		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder('Color name (case-insensitive)')
					.then((text) => {
						text.inputEl.size = text.inputEl.placeholder.length;
						setTooltip(text.inputEl, 'Color name (case-insensitive)');
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (newName in colors) {
							new Notice('This color name is already used.');
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						delete colors[name];

						for (const key of ['defaultColor', 'backlinkHoverColor'] as const) {
							const setting = this.items[key];
							if (setting) {
								const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 2})`);
								if (optionEl) {
									optionEl.value = newName;
									optionEl.textContent = newName;
								}
							}
						}

						if (this.plugin.settings.defaultColor === name) {
							this.plugin.settings.defaultColor = newName;
						}
						name = newName;
						colors[name] = color;
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
					});
			})
			.addColorPicker((picker) => {
				picker.setValue(color);
				picker.onChange(async (newColor) => {
					previousColor = color;
					color = newColor;
					colors[name] = color;
					await this.plugin.saveSettings();
					this.plugin.loadStyle();
				});
			})
			.addExtraButton((button) => {
				button.setIcon('rotate-ccw')
					.setTooltip('Return to previous color')
					.onClick(async () => {
						color = previousColor;
						colors[name] = color;
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
						this.redisplay();
					});
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (this.plugin.settings.defaultColor === name) {
							this.plugin.settings.defaultColor = '';
						}
						delete colors[name];
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
						this.redisplay();
					});
			});
	}

	addNameValuePairListSetting<Item>(items: Item[], index: number, defaultIndexKey: KeysOfType<PDFPlusSettings, number>, accesors: {
		getName: (item: Item) => string,
		setName: (item: Item, value: string) => void,
		getValue: (item: Item) => string,
		setValue: (item: Item, value: string) => void,
	}, configs: {
		name: {
			placeholder: string,
			formSize: number,
			duplicateMessage: string,
		},
		value: {
			placeholder: string,
			formSize: number,
			formRows?: number, // for multi-line value
		},
		delete: {
			deleteLastMessage: string,
		}
	}) {
		const { getName, setName, getValue, setValue } = accesors;
		const item = items[index];
		const name = getName(item);
		const value = getValue(item);

		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder(configs.name.placeholder)
					.then((text) => {
						text.inputEl.size = configs.name.formSize;
						setTooltip(text.inputEl, configs.name.placeholder);
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (items.some((item) => getName(item) === newName)) {
							new Notice(configs.name.duplicateMessage);
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						setName(item, newName);

						const setting = this.items[defaultIndexKey];
						if (setting) {
							const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 1})`);
							if (optionEl) {
								optionEl.value = newName;
								optionEl.textContent = newName;
							}
						}

						await this.plugin.saveSettings();
					});
			})
			.then((setting) => {
				if (configs.value.hasOwnProperty('formRows')) {
					setting.addTextArea((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((textarea) => {
								textarea.inputEl.rows = configs.value.formRows!;
								textarea.inputEl.cols = configs.value.formSize;
								setTooltip(textarea.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					});
				} else {
					setting.addText((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((text) => {
								text.inputEl.size = configs.value.formSize;
								setTooltip(text.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					});
				}
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (items.length === 1) {
							new Notice(configs.delete.deleteLastMessage);
							return;
						}
						items.splice(index, 1);
						if (this.plugin.settings[defaultIndexKey] > index) {
							this.plugin.settings[defaultIndexKey]--;
						} else if (this.plugin.settings[defaultIndexKey] === index) {
							// @ts-ignore
							this.plugin.settings[defaultIndexKey] = 0;
						}
						await this.plugin.saveSettings();
						this.redisplay();
					});
			})
			.setClass('no-border');
	}

	addNamedTemplatesSetting(items: NamedTemplate[], index: number, defaultIndexKey: KeysOfType<PDFPlusSettings, number>, configs: Parameters<PDFPlusSettingTab['addNameValuePairListSetting']>[4]) {
		return this.addNameValuePairListSetting(
			items,
			index,
			defaultIndexKey, {
			getName: (item) => item.name,
			setName: (item, value) => { item.name = value; },
			getValue: (item) => item.template,
			setValue: (item, value) => { item.template = value; },
		}, configs);
	}

	addDisplayTextSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.displayTextFormats,
			index,
			'defaultDisplayTextFormatIndex', {
			name: {
				placeholder: 'Format name',
				formSize: 30,
				duplicateMessage: 'This format name is already used.',
			},
			value: {
				placeholder: 'Display text format',
				formSize: 50,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last display text format.',
			}
		});
	}

	addCopyCommandSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.copyCommands,
			index,
			'defaultColorPaletteActionIndex', {
			name: {
				placeholder: 'Format name',
				formSize: 30,
				duplicateMessage: 'This format name is already used.',
			},
			value: {
				placeholder: 'Copied text format',
				formSize: 50,
				formRows: 3,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last copy format.',
			}
		});
	}

	addHotkeySettingButton(setting: Setting, query?: string) {
		setting.addButton((button) => {
			button.setButtonText(t('button.open-hotkeys-settings', 'Open hotkeys settings'))
				.onClick(() => {
					this.plugin.openHotkeySettingTab(query);
				});
		});
	}

	addPagePreviewSettingButton(setting: Setting) {
		return setting
			.addButton((button) => {
				button.setButtonText(t('button.open-page-preview-settings', 'Open page preview settings'))
					.onClick(() => {
						this.app.setting.openTabById('page-preview');
					});
			});
	}

	addRequireModKeyOnHoverSetting(id: string) {
		const display = this.app.workspace.hoverLinkSources[id].display;
		const required = this.plugin.requireModKeyForLinkHover(id);
		return this.addSetting()
			.setName(`Require ${modKey} key while hovering`)
			.setDesc(`Currently ${required ? 'required' : 'not required'}. You can toggle this on and off in the core Page Preview plugin settings > ${display}.`)
			.then((setting) => this.addPagePreviewSettingButton(setting));
	}

	addIconSetting(settingName: KeysOfType<PDFPlusSettings, string>, leaveBlankToRemoveIcon: boolean) {
		const normalizeIconNameNoPrefix = (name: string) => {
			if (name.startsWith('lucide-')) {
				return name.slice(7);
			}
			return name;
		};

		const normalizeIconNameWithPrefix = (name: string) => {
			if (!name.startsWith('lucide-')) {
				return 'lucide-' + name;
			}
			return name;
		};

		const renderAndValidateIcon = (setting: Setting) => {
			const iconPreviewEl = setting.controlEl.querySelector<HTMLElement>(':scope>.icon-preview')
				?? setting.controlEl.createDiv('icon-preview');
			setIcon(iconPreviewEl, normalizeIconNameWithPrefix(this.plugin.settings[settingName]));

			const text = setting.components[0] as TextComponent;
			if ((!leaveBlankToRemoveIcon || this.plugin.settings[settingName]) && !iconPreviewEl.childElementCount) {
				text.inputEl.addClass('error');
				setTooltip(text.inputEl, 'No icon found');
			} else {
				text.inputEl.removeClass('error');
				setTooltip(text.inputEl, '');
			}
		};

		return this.addTextSetting(settingName, undefined, (setting) => {
			// @ts-ignore
			this.plugin.settings[settingName] = normalizeIconNameNoPrefix(this.plugin.settings[settingName]);
			this.plugin.saveSettings();
			renderAndValidateIcon(setting);
		})
			.then((setting) => {
				this.renderMarkdown([
					'You can use any icon from [Lucide](https://lucide.dev/icons).'
					+ (leaveBlankToRemoveIcon ? ' Leave blank to remove icons.' : ''),
				], setting.descEl);
			})
			.then(renderAndValidateIcon);
	}

	addProductMenuSetting(key: KeysOfType<PDFPlusSettings, ('color' | 'copy-format' | 'display')[]>, heading: string) {
		const categories = DEFAULT_SETTINGS[key];
		const displayNames: Record<string, string> = {
			'color': 'Colors',
			'copy-format': 'Copy format',
			'display': 'Display text format',
		};
		const values = this.plugin.settings[key];

		const setting = this.addHeading(heading, key);

		setting.addExtraButton((button) => {
			button
				.setTooltip('Reset')
				.setIcon('rotate-ccw')
				.onClick(() => {
					values.length = 0;
					// @ts-ignore
					values.push(...categories);
					this.redisplay();
				});
		});

		const dropdowns: DropdownComponent[] = [];
		const remainingCategories: string[] = categories.slice();

		for (let i = 0; i < categories.length; i++) {
			if (i > 0) {
				if (!Platform.isDesktopApp) {
					// On the mobile app, nested menus don't work, so we only show the top-level items.
					return;
				}

				const upperLevelCategory = dropdowns[i - 1].getValue();
				if (!upperLevelCategory) return;

				remainingCategories.remove(upperLevelCategory);
			}

			this.addSetting()
				.then((setting) => {
					if (Platform.isDesktopApp) {
						setting.setName(i === 0 ? 'Top-level menu' : i === 1 ? 'Submenu' : 'Subsubmenu');
					}
				})
				.addDropdown((dropdown) => {
					for (const category of remainingCategories) {
						dropdown.addOption(category, displayNames[category]);
					}
					if (i > 0) dropdown.addOption('', 'None');

					let currentValue: string = values[i] ?? '';
					if (currentValue && !remainingCategories.includes(currentValue)) {
						if (remainingCategories[0]) {
							// @ts-ignore
							values[i] = remainingCategories[0];
							currentValue = values[i];
						}
					}
					dropdown.setValue(currentValue)
						.onChange((value) => {
							if (value) {
								// @ts-ignore
								values[i] = value;
							} else {
								while (values.length > i) values.pop();
							}

							this.plugin.saveSettings();
							this.redisplay();
						});
					dropdowns.push(dropdown);
				})
				.then((setting) => {
					setting.settingEl.addClasses(['no-border', 'small-padding']);
				});
		}

		return setting;
	}

	createLinkTo(id: keyof PDFPlusSettings, name?: string) {
		return createEl('a', '', (el) => {
			el.onclick = (evt) => {
				this.scrollTo(id, { behavior: 'smooth' });
				this.updateHeaderElClassOnScroll(evt);
			};
			activeWindow.setTimeout(() => {
				const setting = this.items[id];
				if (!name && setting) {
					name = '"' + setting.nameEl.textContent + '"';
				}
				el.setText(name ?? '');
			});
		});
	}

	createLinkToHeading(id: string, name?: string) {
		return createEl('a', '', (el) => {
			el.onclick = (evt) => {
				this.scrollToHeading(id, { behavior: 'smooth' });
				this.updateHeaderElClassOnScroll(evt);
			};
			activeWindow.setTimeout(() => {
				const setting = this.headings.get(id);
				if (!name && setting) {
					name = '"' + setting.nameEl.textContent + '"';
				}
				el.setText(name ?? '');
			});
		});
	}

	/** Refresh the setting tab and then scroll back to the original position. */
	redisplay() {
		const scrollTop = this.contentEl.scrollTop;
		this.display();
		this.contentEl.scroll({ top: scrollTop });

		this.events.trigger('update');
	}

	async display(): Promise<void> {
		// First of all, re-display the installer version modal that was shown in plugin.onload again if necessary,
		// in case the user has accidentally closed it.
		InstallerVersionModal.openIfNecessary(this.plugin);

		this.plugin.checkDeprecatedSettings();


		// Setting tab rendering starts here

		this.headerContainerEl.empty();
		this.contentEl.empty();
		this.promises = [];
		this.component.load();


		// Show which section is currently being displayed by highlighting the corresponding icon in the header.
		activeWindow.setTimeout(() => this.updateHeaderElClass());
		for (const eventType of ['wheel', 'touchmove'] as const) {
			this.component.registerDomEvent(
				this.contentEl, eventType,
				debounce(() => this.updateHeaderElClass(), 100),
				{ passive: true }
			);
		}


		this.contentEl.createDiv('top-note', async (el) => {
			await this.renderMarkdown([
				'> [!TIP]',
				'> - ' + t('top-notice.navigate', 'You can easily navigate through the settings by clicking the icons in the header above.'),
				'> - ' + t('top-notice.reopen', 'Some settings below require reopening tabs or reloading the plugin to take effect.'),
				'> - ' + t('top-notice.docs', '[Visit the docs](https://ryotaushio.github.io/obsidian-pdf-plus/)'),
				'> - <a id="pdf-plus-funding-link-placeholder"></a>',
			], el);
			const linkEl = document.getElementById('pdf-plus-funding-link-placeholder');
			if (linkEl) {
				linkEl.textContent = t('top-notice.keep-alive', 'Help me keep PDF++ alive!');
				linkEl.onclick = (evt) => {
					this.scrollToHeading('funding', { behavior: 'smooth' });
					this.updateHeaderElClassOnScroll(evt);
				};
			}
		});


		this.addHeading(t('heading.editing-pdf', 'Editing PDF files'), 'edit', 'lucide-save')
			.then((setting) => {
				this.renderMarkdown([
					t('edit.desc-1', 'By allowing PDF++ to modify PDF files directly, you can:'),
					t('edit.desc-2', '- Add, edit and delete highlights and links in PDF files.'),
					t('edit.desc-3', '- Add, insert, delete or extract PDF pages and auto-update links.'),
					t('edit.desc-4', '- Add, rename, move and delete outline items.'),
					t('edit.desc-5', '- Edit [page labels](https://ryotaushio.github.io/obsidian-pdf-plus/page-labels.html).'),
					'',
					t('edit.learn-more', '[Learn more](https://ryotaushio.github.io/obsidian-pdf-plus/editing-pdfs.html)')
				], setting.descEl);
			});
		this.addToggleSetting('enablePDFEdit', () => this.redisplay())
			.setName(t('setting.enable-pdf-edit', 'Enable PDF editing'))
			.then((setting) => {
				this.renderMarkdown([
					t('edit.warning', 'PDF++ will not modify PDF files themselves unless you turn on this option. <span style="color: var(--text-warning);">The author assumes no responsibility for any data corruption. Please make sure you have a backup of your files.</span> Also note that PDF++ currently does not support editing encrypted PDFs.'),
				], setting.descEl);
			});
		if (this.plugin.settings.enablePDFEdit) {
			this.addTextSetting('author', t('edit.your-name-placeholder', 'Your name'), (setting) => {
				const inputEl = (setting.components[0] as TextComponent).inputEl;
				inputEl.toggleClass('error', !inputEl.value);
			})
				.setName(t('setting.annotation-author', 'Annotation author'))
				.setDesc(t('desc.annotation-author', 'It must contain at least one character in order to make annotations referenceable & editable within Obsidian.'))
				.then((setting) => {
					const inputEl = (setting.components[0] as TextComponent).inputEl;
					inputEl.toggleClass('error', !inputEl.value);
				});
		}


		this.addHeading(t('heading.backlink-highlight', 'Backlink highlighting'), 'backlink-highlight', 'lucide-highlighter')
			.setDesc(t('desc.backlink-highlight', 'Annotate PDF files with highlights just by linking to text selection. You can easily copy links to selections using color palette in the toolbar. See the "Color palette" section for the details.'))
			.then((setting) => setting.settingEl.addClass('normal-margin-top'));
		this.addToggleSetting('highlightBacklinks')
			.setName(t('setting.highlight-backlinks', 'Highlight backlinks in PDF viewer'))
			.setDesc(t('desc.highlight-backlinks-in-viewer', 'In the PDF viewer, any referenced text will be highlighted for easy identification.'));
		this.addDesc(t('desc.try-turn-off', 'Try turning off the following options if you experience performance issues.'));
		this.addToggleSetting('highlightBacklinksInEmbed')
			.setName(t('setting.highlight-backlinks-in-embed', 'Highlight backlinks in PDF embeds'));
		this.addToggleSetting('highlightBacklinksInCanvas')
			.setName(t('setting.highlight-backlinks-in-canvas', 'Highlight backlinks in Canvas'));
		this.addToggleSetting('highlightBacklinksInHoverPopover')
			.setName(t('setting.highlight-backlinks-in-hover-popover', 'Highlight backlinks in hover popover previews'));
		this.addDropdownSetting('selectionBacklinkVisualizeStyle', SELECTION_BACKLINK_VISUALIZE_STYLE)
			.setName(t('setting.highlight-style', 'Highlight style'))
			.setDesc(t('desc.highlight-style', 'How backlinks to a text selection should be visualized.'));
		this.addDropdownSetting('hoverHighlightAction', HOVER_HIGHLIGHT_ACTIONS, () => this.redisplay())
			.setName(t('setting.hover-highlight-action', 'Action when hovering over highlighted text'))
			.setDesc(t('desc.hover-highlight-action', `Easily open backlinks or display a popover preview of it by pressing ${getModifierNameInPlatform('Mod').toLowerCase()} (by default) while hovering over a highlighted text in PDF viewer.`));
		this.addRequireModKeyOnHoverSetting('pdf-plus');
		this.addToggleSetting('doubleClickHighlightToOpenBacklink')
			.setName(t('setting.double-click-to-open-backlink', 'Double click highlighted text to open the corresponding backlink'));

		this.addHeading(t('heading.open-backlink', 'How backlinks are opened'), 'open-backlink')
			.setDesc(
				t('desc.open-backlink-prefix', 'Customize how backlinks are opened when ')
				+ (this.plugin.settings.hoverHighlightAction === 'open' ? `${getModifierNameInPlatform('Mod').toLowerCase()}+hovering over or ` : '')
				+ t('desc.open-backlink-suffix', 'double-clicking highlighted text.')
			);
		this.addDropdownSetting('paneTypeForFirstMDLeaf', PANE_TYPE, () => this.redisplay())
			.setName(t('setting.pane-type-for-first-md-leaf', `How to open the markdown file when no markdown file is opened`));
		if (this.plugin.settings.paneTypeForFirstMDLeaf === 'left-sidebar' || this.plugin.settings.paneTypeForFirstMDLeaf === 'right-sidebar') {
			this.addToggleSetting('alwaysUseSidebar')
				.setName(t('setting.always-use-sidebar', 'Always use sidebar to open markdown files from highlighted text'))
				.setDesc(t('desc.always-use-sidebar', `If turned on, the ${this.plugin.settings.paneTypeForFirstMDLeaf === 'left-sidebar' ? 'left' : 'right'} sidebar will be used whether there is existing markdown tabs or not.`));
			this.addToggleSetting('singleMDLeafInSidebar')
				.setName(t('setting.single-md-leaf-in-sidebar', 'Don\'t open multiple panes in sidebar'))
				.setDesc(t('desc.single-md-leaf-in-sidebar', 'Turn this on if you want to open markdown files in a single pane in the sidebar.'));
		}
		this.addSetting('ignoreExistingMarkdownTabIn')
			.setName(t('setting.ignore-existing-md-tabs', 'Ignore existing markdown tabs in...'))
			.setDesc(t('desc.ignore-existing-md-tabs', 'If some notes are opened in the ignored splits, PDF++ will still open the backlink in the way specified in the previous setting. For example, you might want to ignore the left sidebar if you are pinning a certain note (e.g. daily note) in it.'));
		const splits: Record<string, string> = {
			'leftSplit': t('option.left-sidebar', 'Left sidebar'),
			'rightSplit': t('option.right-sidebar', 'Right sidebar'),
			'floatingSplit': t('option.popout-windows', 'Popout windows'),
		};
		const ignoredSplits = this.plugin.settings.ignoreExistingMarkdownTabIn;
		for (const [_split, displayName] of Object.entries(splits)) {
			const split = _split as 'leftSplit' | 'rightSplit' | 'floatingSplit';
			this.addSetting()
				.addToggle((toggle) => {
					toggle
						.setValue(ignoredSplits.includes(split))
						.onChange((value) => {
							value ? ignoredSplits.push(split) : ignoredSplits.remove(split);
							this.plugin.saveSettings();
						});
				})
				.then((setting) => {
					setting.controlEl.prepend(createEl('span', { text: displayName }));
					setting.settingEl.addClasses(['no-border', 'ignore-split-setting']);
				});
		}

		this.addToggleSetting('dontActivateAfterOpenMD')
			.setName(t('setting.dont-activate-after-open-md', 'Don\'t move focus to markdown view after opening a backlink'))
			.setDesc(t('desc.dont-activate-after-open-md', 'This option will be ignored when you open a link in a tab in the same split as the current tab.'));

		this.addHeading(t('heading.color', 'Colors'), 'color');
		this.addSetting('colors')
			.setName(t('setting.highlight-colors', 'Highlight colors'))
			.then((setting) => this.renderMarkdown([
				t('color.desc-1', 'You can optionally highlight the selection with **a specified color** by appending "&color=`<COLOR NAME>`" to a link text, where `<COLOR NAME>` is one of the colors that you register below. e.g `[[file.pdf#page=1&selection=4,0,5,20&color=red]].` '),
				t('color.desc-2', 'Color names are case-insensitive. '),
				'',
				t('color.desc-3', 'You can ues the color palette in PDF toolbars to easily copy links with "&color=..." appended automatically. See the "Color palette" section for the details.'),
				'',
				t('color.desc-4', 'You can also opt not to use this plugin-dependent notation and apply a single color (the "default highlight color" setting) to all highlights.'),
				'',
				t('color.desc-5', 'These colors are also available as CSS variables, e.g. `--pdf-plus-yellow-rgb`. You can use them for various CSS customizations. See [README](https://github.com/RyotaUshio/obsidian-pdf-plus?tab=readme-ov-file#css-customization) for the details.'),
			], setting.descEl))
			.addButton((button) => {
				button
					.setIcon('plus')
					.setTooltip(t('tooltip.add-new-color', 'Add a new color'))
					.onClick(() => {
						this.plugin.settings.colors[''] = '#';
						this.redisplay();
					});
			});
		for (let i = 0; i < Object.keys(this.plugin.settings.colors).length; i++) {
			this.addColorSetting(i)
				.setClass('no-border');
		}

		this.addToggleSetting('highlightColorSpecifiedOnly', () => this.redisplay())
			.setName(t('setting.highlight-color-specified-only', 'Highlight a backlink only if a color is specified'))
			.setDesc(t('desc.highlight-color-specified-only', 'By default, all backlinks are highlighted. If this option is enabled, a backlink will be highlighted only when a color is specified in the link text.'));

		if (!this.plugin.settings.highlightColorSpecifiedOnly) {
			this.addDropdownSetting(
				'defaultColor',
				['', ...Object.keys(this.plugin.settings.colors)],
				(option) => option || t('option.obsidian-default', 'Obsidian default'),
				() => this.plugin.loadStyle()
			)
				.setName(t('setting.default-highlight-color', 'Default highlight color'))
				.setDesc(t('desc.default-highlight-color', 'If no color is specified in link text, this color will be used.'));
		}

		this.addHeading(t('heading.backlink-bounding-rect', 'Backlink indicator bounding rectangles'), 'backlink-bounding-rect');
		this.addToggleSetting('showBoundingRectForBacklinkedAnnot')
			.setName(t('setting.show-bounding-rect', 'Show bounding rectangles for backlinked annotations'))
			.setDesc(t('desc.show-bounding-rect', 'Bounding rectangles will be shown for annotations with backlinks.'));


		this.addHeading(t('heading.backlink-icon', 'Backlink indicator icons'), 'backlink-icon')
			.setDesc(t('desc.backlink-icon', 'Show icons for text selections, annotations, offsets and rectangular selections with backlinks.'));
		this.addToggleSetting('showBacklinkIconForSelection')
			.setName(t('setting.show-backlink-icon-for-selection', 'Show icon for text selection with backlinks'));
		this.addToggleSetting('showBacklinkIconForAnnotation')
			.setName(t('setting.show-backlink-icon-for-annotation', 'Show icon for annotation with backlinks'));
		this.addToggleSetting('showBacklinkIconForOffset')
			.setName(t('setting.show-backlink-icon-for-offset', 'Show icon for offset backlinks'));
		this.addToggleSetting('showBacklinkIconForRect')
			.setName(t('setting.show-backlink-icon-for-rect', 'Show icon for rectangular selection backlinks'));
		this.addSliderSetting('backlinkIconSize', 10, 100, 5)
			.setName(t('setting.backlink-icon-size', 'Icon size'));


		this.addHeading(t('heading.rect-embed', 'Rectangular selection embeds'), 'rect', 'lucide-box-select')
			.then((setting) => {
				this.renderMarkdown([
					t('rect-embed.desc', 'You can embed a specified rectangular area from a PDF page into your note. [Learn more](https://ryotaushio.github.io/obsidian-pdf-plus/embedding-rectangular-selections.html)')
				], setting.descEl);
			});
		this.addToggleSetting('rectEmbedStaticImage', () => this.redisplay())
			.setName(t('setting.rect-embed-paste-as-image', 'Paste as image'))
			.setDesc(t('desc.rect-embed-paste-as-image', 'By default, rectangular selection embeds are re-rendered every time you open the markdown file, which can slow down the loading time. Turn on this option to replace them with static images and improve the performance.'));
		if (this.plugin.settings.rectEmbedStaticImage) {
			this.addDropdownSetting('rectImageFormat', { 'file': t('option.create-embed-image-file', 'Create & embed image file'), 'data-url': t('option.embed-as-data-url', 'Embed as data URL') }, () => this.redisplay())
				.setName(t('setting.how-to-embed-image', 'How to embed the image'))
				.then((setting) => this.renderMarkdown([
					t('rect-embed.file-desc', '- "Create & embed image file": Create an image file and embed it in the markdown file. The image file will be saved in the folder you specify in the "Default location for new attachments" setting in the core Obsidian settings.'),
					t('rect-embed.data-url-desc', '- "Embed as data URL": Embed the image as a [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) without creating a file. This option is useful when you don\'t want to mess up your attachment folder. It also helps you make your notes self-contained.'),
				], setting.descEl));
			if (this.plugin.settings.rectImageFormat === 'file') {
				this.addDropdownSetting('rectImageExtension', IMAGE_EXTENSIONS)
					.setName(t('setting.image-file-format', 'Image file format'));
			}
		}
		this.addToggleSetting('rectFollowAdaptToTheme')
			.setName(t('setting.rect-follow-adapt-to-theme', 'Follow "adapt to theme" setting'))
			.setDesc(t('desc.rect-follow-adapt-to-theme', 'If enabled, rectangular selection embeds will be inverted in color when the "Adapt to theme" setting is enabled in the PDF toolbar. This will help you reduce eye strain in dark mode.'));
		this.addSliderSetting('rectEmbedResolution', 10, 200, 1)
			.setName(t('setting.rect-embed-resolution', 'Rendering resolution'))
			.setDesc(t('desc.rect-embed-resolution', 'The higher the value, the better the rendering quality, but the longer time it takes to render. The default value is 100.'));
		this.addToggleSetting('includeColorWhenCopyingRectLink')
			.setName(t('setting.include-color-when-copying-rect-link', 'Include the selected color\'s name when copying a link to a rectangular selection'))
			.setDesc(t('desc.include-color-when-copying-rect-link', 'When enabled, the name of the color selected in the color palette will be included in the link text. As a result, the rectangular selection will be highlighted with the specified color in the PDF viewer.'));
		this.addToggleSetting('zoomToFitRect')
			.setName(t('setting.zoom-to-fit-rect', 'Zoom to fit rectangular selection when opening link'))
			.setDesc(createFragment((el) => {
				el.appendText(t('desc.zoom-to-fit-rect-1', 'When enabled, the PDF viewer will zoom to fit the rectangular selection when you open a link to it. Otherwise, the viewer will keep the current zoom level. '));
				el.appendText(t('desc.zoom-to-fit-rect-2', 'Note: check out the '));
				el.appendChild(this.createLinkTo('dblclickEmbedToOpenLink'));
				el.appendText(t('desc.zoom-to-fit-rect-3', ' option as well.'));
			}));


		this.addHeading(t('heading.callout', 'PDF++ callouts'), 'callout', 'lucide-quote')
			.then((setting) => {
				this.renderMarkdown(
					t('callout.desc', 'Create [callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) with the same color as the highlight color without any CSS snippet scripting.'),
					setting.descEl
				);
			});
		this.addToggleSetting('useCallout')
			.setName(t('setting.use-callout', 'Use PDF++ callouts'))
			.then((setting) => {
				this.renderMarkdown([
					t('callout.use-callout-desc', 'You can also disable this option and choose to use your own custom [CSS snippets](https://help.obsidian.md/Extending+Obsidian/CSS+snippets). See our [README](https://github.com/RyotaUshio/obsidian-pdf-plus?tab=readme-ov-file#css-customization) for the details.')
				], setting.descEl);
			});
		this.addTextSetting('calloutType', undefined, () => this.redisplay())
			.setName(t('setting.callout-type-name', 'Callout type name'))
			.then((setting) => {
				const type = this.plugin.settings.calloutType;
				const colorName = Object.keys(this.plugin.settings.colors).first()?.toLowerCase() ?? 'yellow';
				this.renderMarkdown([
					t('callout.example-intro', `For example, if this is set to "${type}", use the following syntax to insert a callout with color "${colorName}":`),
					'',
					'```markdown',
					`> [!${type}|${colorName}] ` + t('callout.example-title', 'Title'),
					'> ' + t('callout.example-content', 'Content'),
					'```',
					'',
					t('callout.rgb-info', 'You can also use explicit RGB color values like "255, 208, 0" instead of color names.'),
					t('callout.recommendation', 'I recommend setting this as a custom color palette action in the setting below, like so:'),
					'',
					'```markdown',
					'> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}',
					'> {{text}}',
					'```',
				], setting.descEl);
			});
		this.addIconSetting('calloutIcon', true)
			.setName(t('setting.callout-icon', 'Callout icon'));


		this.addHeading(t('heading.toolbar', 'PDF toolbar'), 'toolbar', 'lucide-palette');
		this.addToggleSetting('hoverableDropdownMenuInToolbar')
			.setName(t('setting.hoverable-dropdown-menus', 'Hoverable dropdown menus'))
			.setDesc(t('desc.hoverable-dropdown-menus', '(Not supported on smartphones) When enabled, the dropdown menus (⌄) in the PDF toolbar will be opened by hovering over the icon, and you don\'t need to click it.'));
		this.addToggleSetting('zoomLevelInputBoxInToolbar')
			.setName(t('setting.show-zoom-level-box', 'Show zoom level box'))
			.setDesc(t('desc.show-zoom-level-box', 'A input box will be added to the PDF toolbar, which indicated the current zoom level and allows you to set the zoom level by typing a number.'));

		this.addHeading(t('heading.palette', 'Color palette'), 'palette')
			.setDesc(t('desc.palette', 'Clicking a color while selecting a range of text will copy a link to the selection with "&color=..." appended.'));
		this.addToggleSetting('colorPaletteInToolbar', () => {
			this.redisplay();
			this.plugin.loadStyle();
		})
			.setName(t('setting.show-palette-in-toolbar', 'Show color palette in the toolbar'))
			.setDesc(t('desc.show-palette-in-toolbar', 'A color palette will be added to the toolbar of the PDF viewer.'));
		if (this.plugin.settings.colorPaletteInToolbar) {
			this.addToggleSetting('noColorButtonInColorPalette', () => this.plugin.loadStyle())
				.setName(t('setting.no-color-button', 'Show "without specifying color" button in the color palette'));
			this.addToggleSetting('colorPaletteInEmbedToolbar', () => this.plugin.loadStyle())
				.setName(t('setting.show-palette-in-embeds', 'Show color palette in PDF embeds as well'));
			this.addIndexDropdownSetting('defaultColorPaletteItemIndex', ['', ...Object.keys(this.plugin.settings.colors)], (option) => option || t('option.dont-specify', 'Don\'t specify'))
				.setName(t('setting.default-palette-color', 'Default color selected in color palette'))
				.setDesc(t('desc.default-palette-color', 'This color will be selected in the color palette in a newly opened PDF viewer.'));
			this.addToggleSetting('syncColorPaletteItem', () => this.redisplay())
				.setName(t('setting.sync-palette-color', 'Share a single color among all color palettes'))
				.setDesc(t('desc.sync-palette-color', 'If disabled, you can specify a different color for each color palette.'));
			if (this.plugin.settings.syncColorPaletteItem) {
				this.addToggleSetting('syncDefaultColorPaletteItem')
					.setName(t('setting.sync-default-palette-color', 'Share the color with newly opened color palettes as well'));
			}
			this.addToggleSetting('quietColorPaletteTooltip')
				.setName(t('setting.quiet-palette-tooltip', 'Quiet tooltips in color palette'))
				.setDesc(t('desc.quiet-palette-tooltip', `When disabled${!DEFAULT_SETTINGS.quietColorPaletteTooltip ? ' (default)' : ''}, the tooltip will show the color name as well as the selected copy format and display text format. If enabled, only the color name will be shown.`));
		}


		this.addHeading(t('heading.viewer-options', 'Viewer options'), 'viewer-option', 'lucide-monitor');
		this.addSetting('defaultZoomValue')
			.setName(t('setting.default-zoom-level', 'Default zoom level'))
			.setDesc(t('desc.default-zoom-level', 'This option will be ignored in PDF embeds.'))
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						'page-width': t('option.fit-width', 'Fit width'),
						'page-height': t('option.fit-height', 'Fit height'),
						'page-fit': t('option.fit-page', 'Fit page'),
						'custom': t('option.custom', 'Custom...'),
					})
					.setValue(this.plugin.settings.defaultZoomValue.startsWith('page-') ? this.plugin.settings.defaultZoomValue : 'custom')
					.onChange(async (value) => {
						if (value === 'custom') value = '100';
						this.plugin.settings.defaultZoomValue = value;
						toggleCustomZoomLevelSettingVisibility();
						await this.plugin.saveSettings();
					});
			});
		const toggleCustomZoomLevelSettingVisibility = this.getVisibilityToggler(
			this.addSetting()
				.setName(t('setting.custom-zoom-level', 'Custom zoom level (%)'))
				.addSlider((slider) => {
					slider.setLimits(10, 400, 5)
						.setDynamicTooltip()
						.setValue(this.plugin.settings.defaultZoomValue.startsWith('page-') ? 100 : parseInt(this.plugin.settings.defaultZoomValue))
						.onChange(async (value) => {
							this.plugin.settings.defaultZoomValue = '' + value;
							await this.plugin.saveSettings();
						});
				}),
			() => !this.plugin.settings.defaultZoomValue.startsWith('page-')
		);
		this.addEnumDropdownSetting('scrollModeOnLoad', {
			[ScrollMode.VERTICAL]: t('option.scroll-vertical', 'Vertical'),
			[ScrollMode.HORIZONTAL]: t('option.scroll-horizontal', 'Horizontal'),
			[ScrollMode.PAGE]: t('option.scroll-in-page', 'In-page'),
			[ScrollMode.WRAPPED]: t('option.scroll-wrapped', 'Wrapped'),
		}, () => toggleSpreadModeOnLoadSettingVisibility())
			.setName(t('setting.default-scroll-mode', 'Default scroll mode'));
		const toggleSpreadModeOnLoadSettingVisibility = this.getVisibilityToggler(
			this.addEnumDropdownSetting('spreadModeOnLoad', {
				[SpreadMode.NONE]: t('option.spread-single', 'Single page'),
				[SpreadMode.ODD]: t('option.spread-two-odd', 'Two page (odd)'),
				[SpreadMode.EVEN]: t('option.spread-two-even', 'Two page (even)'),
			})
				.setName(t('setting.default-spread-mode', 'Default spread mode')),
			() => this.plugin.settings.scrollModeOnLoad !== ScrollMode.WRAPPED
		);
		this.addToggleSetting('usePageUpAndPageDown')
			.setName(t('setting.use-pageup-pagedown', 'Use PageUp/PageDown key to go to previous/next page'))
			.setDesc(createFragment((el) => {
				el.appendText(t('desc.use-pageup-pagedown-1', 'You need to reopen PDF viewers after changing this option. Note that you can achieve the same thing (and even more advanced stuff) using '));
				el.appendChild(this.createLinkToHeading('vim', t('desc.vim-keybindings-link', 'Vim keybindings')));
				el.appendText(t('desc.use-pageup-pagedown-2', '.'));
			}));

		this.addHeading(t('heading.context-menu', 'Context menu in PDF viewer'), 'context-menu', 'lucide-mouse-pointer-click')
			.setDesc(t('desc.context-menu', '(Desktop & tablet only) Customize the behavior of the context menu that pops up when you right-click in the PDF viewer. For mobile users, see also the next section.'));
		this.addToggleSetting('replaceContextMenu', () => this.redisplay())
			.setName(t('setting.replace-context-menu', 'Replace the built-in context menu with PDF++\'s custom menu'));
		if (!this.plugin.settings.replaceContextMenu) {
			this.addSetting()
				.setName(t('setting.display-text-format', 'Display text format'))
				.setDesc(t('desc.display-text-format', 'You can customize the display text format in the setting "Copied text foramt > Display text format" below.'));
		} else {
			this.addToggleSetting('showContextMenuOnTablet')
				.setName(t('setting.show-context-menu-on-tablet', 'Show context menu on tablet devices as well'))
				.setDesc(t('desc.show-context-menu-on-tablet', 'By default, Obsidian does not show the context menu after text selection on mobile devices, including tablets (iPad, etc.). If you want to show the context menu on tablets, turn this option on. Even if this option is turned off, you copy select the OS-native "Copy" option to run the "' + this.plugin.lib.commands.stripCommandNamePrefix(this.plugin.lib.commands.getCommand('copy-link-to-selection').name) + '" command.'));

			const modDict = getModifierDictInPlatform();
			this.addDropdownSetting('showContextMenuOnMouseUpIf', {
				'always': t('option.always', 'Always'),
				...Object.fromEntries(Object.entries(modDict).map(([modifier, name]) => {
					return [modifier, t('option.key-is-pressed', `${name} key is pressed`)];
				})),
				'never': t('option.never', 'Never'),
			})
				.setName(t('setting.show-context-menu-after-select', 'Show the context menu right after selecting text when...'))
				.setDesc(createFragment((el) => {
					el.appendText(t('desc.show-context-menu-after-select-1', 'If '));
					el.appendChild(this.createLinkToHeading('auto-copy', t('desc.auto-copy-link', 'auto-copy')));
					el.appendText(t('desc.show-context-menu-after-select-2', ' is enabled, it will be prioritized and the context menu will not be shown.'));
				}));

			{
				this.addHeading(t('heading.context-menu-items', 'Menu items'), 'context-menu-items')
					.setDesc(t('desc.context-menu-items', 'Customize which menu items to show.'));

				const itemOrSectionName: Record<string, string> = {
					'action': t('context-menu.action', 'Look up "(selection)"'),
					'selection': t('context-menu.selection', 'Copy link to selection'),
					'write-file': t('context-menu.write-file', `Add ${this.plugin.settings.selectionBacklinkVisualizeStyle} to file`),
					'annotation': t('context-menu.annotation', 'Copy link to annotation'),
					'modify-annotation': t('context-menu.modify-annotation', 'Edit/delete annotation'),
					'link': t('context-menu.link', 'Copy PDF link / Search on Google Scholar / Paste copied PDF link to selection / Copy URL'),
					'text': t('context-menu.text', 'Copy selected text / Copy annotated text'),
					'search': t('context-menu.search', 'Copy link to search'),
					'speech': t('context-menu.speech', 'Read aloud selected text'),
					'page': t('context-menu.page', 'Copy link to page'),
					'settings': t('context-menu.settings', 'Customize menu...'),
				};

				const sections = this.plugin.settings.contextMenuConfig;
				const sectionSettings: Setting[] = [];
				for (let i = 0; i < sections.length; i++) {
					const section = sections[i];
					const name = itemOrSectionName[section.id];
					if (!name) continue;

					sectionSettings.push(
						this.addSetting()
							.setName(name)
							.addToggle((toggle) => {
								toggle
									.setValue(section.visible)
									.onChange((value) => {
										section.visible = value;
										this.plugin.saveSettings();
									});
							})
							.then((setting) => {
								if (section.id === 'action') {
									setting.setDesc(t('desc.context-menu-action', 'Available only on macOS.'));
								}
								else if (section.id === 'write-file' || section.id === 'modify-annotation') {
									setting.setDesc(createFragment((el) => {
										el.appendText(t('desc.context-menu-requires', 'Requires '));
										el.appendChild(this.createLinkTo('enablePDFEdit', t('desc.pdf-editing-link', 'PDF editing')));
										el.appendText(t('desc.context-menu-to-be-enabled', ' to be enabled.'));
									}));
								}
								else if (section.id === 'link') {
									setting.setDesc(t('desc.context-menu-link', '"Search on Google Scholar": Available when right-clicking citation links in PDFs.'));
								}
								else if (section.id === 'speech') {
									setting.setDesc(createFragment((el) => {
										el.appendText(t('desc.context-menu-speech-1', 'Requires the '));
										el.createEl('a', { text: t('desc.context-menu-speech-plugin', 'Text to Speech'), href: 'obsidian://show-plugin?id=obsidian-tts' });
										el.appendText(t('desc.context-menu-speech-2', ' plugin to be enabled.'));
									}));
								}
								else if (section.id === 'page') {
									setting.setDesc(t('desc.context-menu-page', 'Available when right-clicking with no text selected.'));
								}
							})
					);
				}
			}

			this.addDesc(t('desc.customize-nested-menus', 'Customize nested menus.'));
			this.addProductMenuSetting('selectionProductMenuConfig', t('context-menu.selection', 'Copy link to selection'));
			this.addProductMenuSetting('writeFileProductMenuConfig', t('context-menu.write-file', `Add ${this.plugin.settings.selectionBacklinkVisualizeStyle} to file`));
			this.addProductMenuSetting('annotationProductMenuConfig', t('context-menu.annotation', 'Copy link to annotation'));
			this.addToggleSetting('updateColorPaletteStateFromContextMenu')
				.setName(t('setting.update-palette-from-context', 'Update color palette from context menu'))
				.setDesc(
					t('desc.update-palette-from-context', 'In the context menu, the items (color, copy format and display text format) set in the color palette are selected by default. If this option is enabled, selecting a menu item will also update the color palette state and hence the default-selected items in the context menu as well.')
					+ t('desc.update-palette-from-context-mod', ` Even if this option is enabled, you can prevent the color palette from being updated by holding down the ${getModifierNameInPlatform('Mod')} key while selecting the menu item.`)
				);
		}


		this.addHeading(t('heading.mobile-copy', 'Copying on mobile'), 'mobile-copy', 'lucide-smartphone');
		this.addDropdownSetting('mobileCopyAction', MOBILE_COPY_ACTIONS)
			.setName(t('setting.mobile-copy-action', `Action triggered by selecting "Copy" option on mobile devices`));


		this.addHeading(t('heading.copy-hotkeys', 'Copying links via hotkeys'), 'copy-hotkeys', 'lucide-keyboard');
		this.addSetting()
			.setName(t('setting.setup-hotkeys', 'Set up hotkeys for copying links'))
			.then((setting) => {
				this.renderMarkdown([
					t('copy-hotkeys.desc-1', 'PDF++ offers two commands for quickly copying links via hotkeys.'),
					'',
					t('copy-hotkeys.desc-2', '1. **Copy link to selection or annotation:**'),
					t('copy-hotkeys.desc-3', '   Copies a link to the text selection or focused annotation in the PDF viewer, which is formatted according to the options specified in the PDF toolbar.'),
					t('copy-hotkeys.desc-4', '   <br>If the "Add highlights to file directly" toggle switch in the PDF toolbar is on, it first adds a highlight annotation directly to the PDF file, and then copies the link to the created annotation.'),
					t('copy-hotkeys.desc-5', '2. **Copy link to current page view:** Copies a link, clicking which will open the PDF file at the current scroll position and zoom level.'),
					'',
					t('copy-hotkeys.desc-6', 'After running this command, you can add the copied link to the PDF file itself: select a range of text, right-click, and then click "Paste copied link to selection".')
				], setting.descEl);
			})
			.then((setting) => this.addHotkeySettingButton(setting, `${this.plugin.manifest.name}: Copy link`));
		this.addSetting()
			.setName(t('setting.further-workflow', 'Further workflow enhancements'))
			.setDesc(createFragment((el) => {
				el.appendText(t('desc.further-workflow', 'See the '));
				el.appendChild(this.createLinkToHeading('auto', t('desc.auto-section-link', '"Auto-copy / auto-focus / auto-paste"')));
				el.appendText(t('desc.further-workflow-2', ' section below.'));
			}));


		this.addHeading(t('heading.other-hotkeys', 'Other shortcut commands'), 'other-hotkeys', 'lucide-layers-2');
		this.addSetting()
			.then((setting) => {
				this.renderMarkdown([
					t('other-hotkeys.desc-1', 'PDF++ also offers the following commands for reducing mouse clicks on the PDF toolbar by assigning hotkeys to them.'),
					'',
					t('other-hotkeys.desc-2', '- **Show outline** / **show thumbnail**'),
					t('other-hotkeys.desc-3', '- **Close PDF siderbar**'),
					t('other-hotkeys.desc-4', '- **Zoom in** / **zoom out**'),
					t('other-hotkeys.desc-5', '- **Fit width** / **fit height**'),
					t('other-hotkeys.go-to-page', '- **Go to page**: This command brings the cursor to the page number input field in the PDF toolbar. Enter a page number and press Enter to jump to the page.'),
					t('other-hotkeys.show-format-menu', '- **Show copy format menu** / **show display text format menu**: By running thes commands via hotkeys and then using the arrow keys, you can quickly select a format from the menu without using the mouse.'),
					t('other-hotkeys.desc-8', '- **Enable PDF edit** / **disable PDF edit**'),
					t('other-hotkeys.desc-9', '- And more...'),
				], setting.descEl);
			})
			.then((setting) => this.addHotkeySettingButton(setting));
		this.addToggleSetting('executeBuiltinCommandForOutline')
			.setName(t('setting.exec-builtin-outline', 'Show outline: when the active file is not PDF, run the core Outline plugin\'s "Show outline" command'))
			.setDesc(t('desc.exec-builtin-outline', 'By turning this on, you can use the same hotkey to show the outline of a markdown file and a PDF file without key conflict.'));
		this.addToggleSetting('closeSidebarWithShowCommandIfExist')
			.setName(t('setting.close-sidebar-on-show', 'Show outline / show thumbnail: close the sidebar if it is already open'))
			.setDesc(t('desc.close-sidebar-on-show', 'Enabling this will allow you to use the same hotkey to close the sidebar if it is already open.'));
		this.addToggleSetting('executeBuiltinCommandForZoom')
			.setName(t('setting.exec-builtin-zoom', 'Zoom in / zoom out: when the active file is not PDF, run the built-in "Zoom in" / "Zoom out" command'))
			.setDesc(t('desc.exec-builtin-zoom', 'By turning this on, you can use the same hotkey to zoom in/out a PDF viewer or any other type of view without key conflict.'));
		this.addToggleSetting('executeFontSizeAdjusterCommand')
			.setName(t('setting.exec-font-size-adjuster', 'Zoom in / zoom out: when the active file is not PDF, run Font Size Adjuster\'s "Increment font size" / "Decrement font size" command'))
			.then((setting) => {
				this.renderMarkdown([
					t('other-hotkeys.font-size-adjuster-1', '(Requires the [Font Size Adjuster](obsidian://show-plugin?id=font-size) plugin enabled) '),
					t('other-hotkeys.font-size-adjuster-2', 'If both of this option and the above option are enabled, this option will be prioritized. The built-in "Zoom in" / "Zoom out" command will be executed if Font Size Adjuster is not installed or disabled.')
				], setting.descEl);
			});


		this.addHeading(t('heading.template', 'Copy templates'), 'template', 'lucide-copy')
			.setDesc(t('desc.copy-templates', 'The template format that will be used when copying a link to a selection or an annotation in PDF viewer. '));
		this.addSetting()
			.then((setting) => this.renderMarkdown([
				// 'The template format that will be used when copying a link to a selection or an annotation in PDF viewer. ',
				'Each `{{...}}` will be evaluated as a JavaScript expression given the variables listed below.',
				'',
				'Available variables are:',
				'',
				'- `file` or `pdf`: The PDF file ([`TFile`](https://docs.obsidian.md/Reference/TypeScript+API/TFile)). Use `file.basename` for the file name without extension, `file.name` for the file name with extension, `file.path` for the full path relative to the vault root, etc.',
				'- `page`: The page number (`Number`). The first page is always page 1.',
				'- `pageLabel`: The page number displayed in the counter in the toolbar (`String`). This can be different from `page`.',
				'    - **Tip**: You can modify page labels with PDF++\'s "Edit page labels" command.',
				'- `pageCount`: The total number of pages (`Number`).',
				'- `text` or `selection`: The selected text (`String`). In the case of links to annotations written directly in the PDF file, this is the text covered by the annotation.',
				'- `comment`: In the case of links to annotations written directly in the PDF file, this is the comment associated with the annotation (`String`). Otherwise, it is an empty string `""`.',
				'- `folder`: The folder containing the PDF file ([`TFolder`](https://docs.obsidian.md/Reference/TypeScript+API/TFolder)). This is an alias for `file.parent`.',
				'- `obsidian`: The Obsidian API. See the [official developer documentation](https://docs.obsidian.md/Home) and the type definition file [`obsidian.d.ts`](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) for the details.',
				'- `dv`: Available if the [Dataview](obsidian://show-plugin?id=dataview) plugin is enabled. See Dataview\'s [official documentation](https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/) for the details. You can use it almost the same as the `dv` variable available in `dataviewjs` code blocks, but there are some differences. For example, `dv.current()` is not available.',
				// '- `tp`: Available if the [Templater](obsidian://show-plugin?id=templater-obsidian) plugin is enabled. See Templater\'s [official documentation](https://silentvoid13.github.io/Templater/internal-functions/overview.html) for the details.',
				'- `quickAddApi`: Available if the [QuickAdd](obsidian://show-plugin?id=quickadd) plugin is enabled. See QuickAdd\'s [official documentation](https://quickadd.obsidian.guide/docs/QuickAddAPI) for the details.',
				'- `app`: The global Obsidian app object ([`App`](https://docs.obsidian.md/Reference/TypeScript+API/App)).',
				'- and other global variables such as:',
				'  - [`moment`](https://momentjs.com/docs/#/displaying/): For exampe, use `moment().format("YYYY-MM-DD")` to get the current date in the "YYYY-MM-DD" format.',
				'',
				`Additionally, you have access to the following variables when the PDF file has a corresponding markdown file specified via the "${this.plugin.settings.proxyMDProperty}" property(see the "Property to associate a markdown file to a PDF file" setting below): `,
				'',
				'- `md`: The markdown file associated with the PDF file ([`TFile`](https://docs.obsidian.md/Reference/TypeScript+API/TFile)). If there is no such file, this is `null`.',
				'- `properties`: The properties of `md` as an `Object` mapping each property name to the corresponding value. If `md` is `null` or the `md` has no properties, this is an empty object `{}`.',
				'\n<span style="color: var(--text-warning);">The following variables are deprecated and will be removed in the near future</span>: `linkedFile`, `linkedFileProperties`. Remove them from your templates if you are using them.',
			], setting.descEl));
		this.addTextSetting('proxyMDProperty', undefined, () => this.redisplay())
			.setName(t('setting.proxy-md-property', 'Property to associate a markdown file to a PDF file'))
			.then((setting) => {
				this.renderMarkdown([
					'Create a markdown file with this property to associate it with a PDF file. The PDF file is specified by a link, e.g. `[[file.pdf]]`.',
					'It can be used to store properties/metadata that can be used when copying links.',
					'',
					'<span style="color: var(--text-warning);">[Dataview](obsidian://show-plugin?id=dataview)\'s inline field syntax such as `' + this.plugin.settings.proxyMDProperty + ':: [[file.pdf]]` is supported for the time being, but it is deprecated and will likely not work in the future.</span>',
					'',
					'Remarks:',
					'- Make sure the associated markdown file can be uniquely identified. For example, if you have two markdown files `file1.md` and `file2.md` and both of their `' + this.plugin.settings.proxyMDProperty + '` properties point to the same PDF file, PDF++ cannot determine which markdown file is associated with `file.pdf`. However, PDF++ v1.0.0 or later will add support for this.',
					'- If you are in Source Mode, be sure to enclose the link in double quotes.',
				], setting.descEl);
			});
		this.addSetting('displayTextFormats')
			.setName(t('setting.display-text-format', 'Display text format'))
			.then((setting) => this.renderMarkdown([
				// 'For example, the default format is `{{ file.basename }}, page { { page } } `. Another example of a useful format is `{ { file.basename } }, p.{ { pageLabel } } `. ',
				'This format will be also used when copying a link to a selection or an annotation from the context menu.'
			], setting.descEl))
			.addButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add a new display text format')
					.onClick(() => {
						this.plugin.settings.displayTextFormats.push({
							name: '',
							template: '',
						});
						this.redisplay();
					});
			});
		for (let i = 0; i < this.plugin.settings.displayTextFormats.length; i++) {
			this.addDisplayTextSetting(i);
		}
		this.addIndexDropdownSetting('defaultDisplayTextFormatIndex', this.plugin.settings.displayTextFormats.map((format) => format.name), undefined, () => {
			this.plugin.loadStyle();
		})
			.setName(t('setting.default-display-text-format', 'Default display text format'));
		this.addToggleSetting('syncDisplayTextFormat')
			.setName(t('setting.sync-display-text-format', 'Share a single display text format among all PDF viewers'))
			.setDesc(t('desc.sync-display-text-format', 'If disabled, you can specify a different display text format for each PDF viewer from the dropdown menu in the PDF toolbar.'));
		if (this.plugin.settings.syncDisplayTextFormat) {
			this.addToggleSetting('syncDefaultDisplayTextFormat')
				.setName(t('setting.sync-default-display-text-format', 'Share the display text format with newly opened PDF viewers as well'));
		}

		this.addSetting('copyCommands')
			.setName(t('setting.custom-copy-formats', 'Custom copy formats'))
			.then((setting) => this.renderMarkdown([
				'Customize the format to use when you copy a link by clicking a color palette item or running the commands while selecting a range of text in PDF viewer.',
				'',
				'In addition to the variables listed above, here you can use',
				'',
				'- `link`: The link without display text, e.g. `[[file.pdf#page=1&selection=0,1,2,3&color=red]]`,',
				'- `linkWithDisplay`: The link with display text, e.g. `[[file.pdf#page=1&selection=0,1,2,3&color=red|file, page 1]]`,',
				'- `linktext`: The text content of the link without brackets and the display text, e.g. `file.pdf#page=1&selection=0,1,2,3&color=red`<br>(if the "Use \\[\\[Wikilinks\\]\\]" setting is turned off, `linktext` will be properly encoded for use in markdown links),',
				'- `display`: The display text formatted according to the above setting, e.g. `file, page 1`,',
				'- `linkToPage`: The link to the page without display text, e.g. `[[file.pdf#page=1]]`,',
				'- `linkToPageWithDisplay`: The link to the page with display text, e.g. `[[file.pdf#page=1|file, page 1]]`,',
				'- `calloutType`: The callout type you specify in the "Callout type name" setting above, in this case, ' + `"${this.plugin.settings.calloutType}", and`,
				'- `color` (or `colorName`): In the case of text selections, this is the name of the selected color in lowercase, e.g. `red`. If no color is specified, it will be an empty string. For text markup annotations (e.g. highlights and underlines), this is the RGB value of the color, e.g. `255,208,0`.',
			], setting.descEl))
			.addButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add a new copy command')
					.onClick(() => {
						this.plugin.settings.copyCommands.push({
							name: '',
							template: '',
						});
						this.redisplay();
					});
			});
		for (let i = 0; i < this.plugin.settings.copyCommands.length; i++) {
			this.addCopyCommandSetting(i);
		}
		this.addIndexDropdownSetting('defaultColorPaletteActionIndex', this.plugin.settings.copyCommands.map((command) => command.name), undefined, () => {
			this.plugin.loadStyle();
		})
			.setName(t('setting.default-color-palette-action', 'Default action when clicking on color palette'));
		this.addToggleSetting('syncColorPaletteAction')
			.setName(t('setting.sync-color-palette-action', 'Share a single action among all PDF viewers'))
			.setDesc(t('desc.sync-color-palette-action', 'If disabled, you can specify a different action for each PDF viewer from the dropdown menu in the PDF toolbar.'));
		if (this.plugin.settings.syncColorPaletteAction) {
			this.addToggleSetting('syncDefaultColorPaletteAction')
				.setName(t('setting.sync-default-color-palette-action', 'Share the action with newly opened PDF viewers as well'));
		}
		this.addToggleSetting('useAnotherCopyTemplateWhenNoSelection', () => this.redisplay())
			.setName(t('setting.use-another-copy-template-when-no-selection', 'Use another template when no text is selected'))
			.setDesc(t('desc.use-another-copy-template', 'For example, you can use this to copy a link to the page when there is no selection.'));
		if (this.plugin.settings.useAnotherCopyTemplateWhenNoSelection) {
			this.addTextSetting('copyTemplateWhenNoSelection')
				.setName(t('setting.copy-template-when-no-selection', 'Link copy template used when no text is selected'));
		}


		this.addHeading(t('heading.auto', 'Auto-copy / auto-focus / auto-paste'), 'auto', 'lucide-zap')
			.setDesc(t('desc.auto', 'Speed up the process of copying & pasting PDF links to your notes with some automation. Note that you can\'t activate both of auto-focus and auto-paste at the same time.'));

		this.addHeading(t('heading.auto-copy', 'Auto-copy'), 'auto-copy')
			.setDesc(t('desc.auto-copy', 'If enabled, the "Copy link to selection or annotation" command will be triggered automatically every time you select a range of text in a PDF viewer, meaning you don\'t even have to press a hotkey to copy a link.'));
		this.addToggleSetting('autoCopy', () => this.plugin.autoCopyMode.toggle(this.plugin.settings.autoCopy))
			.setName(t('setting.auto-copy-enable', 'Enable'))
			.setDesc(t('desc.auto-copy-enable', 'You can also toggle auto-copy via an icon in the left ribbon menu if the next setting is enabled.'));
		this.addToggleSetting('autoCopyToggleRibbonIcon', () => this.redisplay())
			.setName(t('setting.auto-copy-ribbon-icon', 'Show an icon to toggle auto-copy in the left ribbon menu'))
			.setDesc(t('desc.auto-copy-ribbon-icon', 'You can also toggle this mode via a command. Reload the plugin after changing this setting to take effect.'));
		if (this.plugin.settings.autoCopyToggleRibbonIcon) {
			this.addIconSetting('autoCopyIconName', false)
				.setName(t('setting.auto-copy-ribbon-icon-name', 'Icon name'))
				.then((setting) => {
					setting.descEl.appendText(' Reload the plugin after changing this setting to take effect.');
				});
		}

		this.addHeading(t('heading.auto-focus', 'Auto-focus'), 'auto-focus')
			.setDesc(t('desc.auto-focus', 'If enabled, a markdown file will be focused automatically after copying a link to PDF text selection or annotation.'));
		this.addSetting('autoFocus')
			.setName(t('setting.auto-focus-enable', 'Enable'))
			.setDesc(t('desc.auto-focus-enable', 'Recommended if you prefer something less agressive than auto-paste. You can also toggle auto-focus via an icon in the left ribbon menu if the next setting is enabled.'))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoFocus)
					.onChange((value) => {
						this.plugin.toggleAutoFocus(value);
						this.redisplay(); // Reflect the change to the auto-paste toggle (we cannot activate both of them at the same time)
					});
			});
		this.addToggleSetting('autoFocusToggleRibbonIcon', () => this.redisplay())
			.setName(t('setting.auto-focus-ribbon-icon', 'Show an icon to toggle auto-focus in the left ribbon menu'))
			.setDesc(t('desc.auto-focus-ribbon-icon', 'You can also toggle auto-focus via a command. Reload the plugin after changing this setting to take effect.'));
		if (this.plugin.settings.autoFocusToggleRibbonIcon) {
			this.addIconSetting('autoFocusIconName', false)
				.setName(t('setting.auto-focus-ribbon-icon-name', 'Icon name'))
				.then((setting) => {
					setting.descEl.appendText(' Reload the plugin after changing this setting to take effect.');
				});
		}
		this.addDropdownSetting('autoFocusTarget', AUTO_FOCUS_TARGETS)
			.setName(t('setting.auto-focus-target', 'Target markdown file to focus on'));

		this.addHeading(t('heading.auto-paste', 'Auto-paste'), 'auto-paste')
			.setDesc(t('desc.auto-paste', 'If enabled, the copied link to PDF text selection or annotation will be automatically pasted into a markdown file right after copying.'));
		this.addSetting('autoPaste')
			.setName(t('setting.auto-paste-enable', 'Enable'))
			.setDesc(t('desc.auto-paste-enable', 'You can also toggle auto-paste via an icon in the left ribbon menu if the next setting is enabled.'))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoPaste)
					.onChange((value) => {
						this.plugin.toggleAutoPaste(value);
						this.redisplay(); // Reflect the change to the auto-focus toggle (you canot activate both of them at the same time)
					});
			});
		this.addToggleSetting('autoPasteToggleRibbonIcon', () => this.redisplay())
			.setName(t('setting.auto-paste-ribbon-icon', 'Show an icon to toggle auto-paste in the left ribbon menu'))
			.setDesc(t('desc.auto-paste-ribbon-icon', 'You can also toggle auto-paste via a command. Reload the plugin after changing this setting to take effect.'));
		if (this.plugin.settings.autoPasteToggleRibbonIcon) {
			this.addIconSetting('autoPasteIconName', false)
				.setName(t('setting.auto-paste-ribbon-icon-name', 'Icon name'))
				.then((setting) => {
					setting.descEl.appendText(' Reload the plugin after changing this setting to take effect.');
				});
		}
		this.addDropdownSetting('autoPasteTarget', AUTO_FOCUS_TARGETS)
			.setName(t('setting.auto-paste-target', 'Target markdown file to paste links to'));
		this.addToggleSetting('focusEditorAfterAutoPaste', () => this.events.trigger('update'))
			.setName(t('setting.auto-paste-focus-editor', 'Focus editor after auto-pasting'))
			.setDesc(t('desc.auto-paste-focus-editor', 'If enabled, auto-paste will focus on the editor after pasting.'));
		this.showConditionally(
			this.addToggleSetting('clearSelectionAfterAutoPaste')
				.setName(t('setting.auto-paste-clear-selection', 'Clear text selection after auto-pasting'))
				.setDesc(t('desc.auto-paste-clear-selection', 'If enabled, the text selection in the PDF viewer will be automatically cleared after performing auto-pasting.')),
			() => !this.plugin.settings.focusEditorAfterAutoPaste
		);
		this.addToggleSetting('respectCursorPositionWhenAutoPaste', () => this.events.trigger('update'))
			.setName(t('setting.auto-paste-respect-cursor', 'Respect current cursor position'))
			.setDesc(t('desc.auto-paste-respect-cursor', 'When enabled, triggering auto-pasting will paste the copied text at the current cursor position if the target note is already opened. If disabled, the text will be always appended to the end of the note.'));
		this.showConditionally(
			this.addToggleSetting('blankLineAboveAppendedContent')
				.setName(t('setting.auto-paste-blank-line', 'Blank line above the appended content'))
				.setDesc(t('desc.auto-paste-blank-line', 'Because you disabled the option above, auto-pasted content will be added at the end of your note. Enable this option to make sure that you have a blank line between the existing content and the newly added content.')),
			() => !this.plugin.settings.respectCursorPositionWhenAutoPaste
		);

		this.addHeading(t('heading.auto-general', 'General'), 'auto-general')
			.setDesc(t('desc.auto-general', 'General settings that apply to both auto-focus and auto-paste.'));
		this.addToggleSetting('openAutoFocusTargetIfNotOpened', () => this.redisplay())
			.setName(t('setting.auto-open-target', 'Open target markdown file if not opened'));
		if (this.plugin.settings.openAutoFocusTargetIfNotOpened) {
			this.addDropdownSetting(
				'howToOpenAutoFocusTargetIfNotOpened',
				{ ...PANE_TYPE, 'hover-editor': 'Hover Editor' },
				() => this.redisplay()
			)
				.setName(t('setting.auto-open-behavior', 'How to open target markdown file when not opened'))
				.then((setting) => {
					this.renderMarkdown(
						'The "Hover Editor" option is available if the [Hover Editor](obsidian://show-plugin?id=obsidian-hover-editor) plugin is enabled.',
						setting.descEl
					);
					if (this.plugin.settings.howToOpenAutoFocusTargetIfNotOpened === 'hover-editor') {
						if (!this.app.plugins.plugins['obsidian-hover-editor']) {
							setting.descEl.addClass('error');
						}
					}
				});
			this.showConditionally(
				this.addToggleSetting('closeHoverEditorWhenLostFocus')
				.setName(t('setting.hover-editor-close', 'Close Hover Editor when it loses focus'))
				.setDesc(t('desc.hover-editor-close', 'This option will not affect the behavior of Hover Editor outside of PDF++.')),
				() => this.plugin.settings.howToOpenAutoFocusTargetIfNotOpened === 'hover-editor'
			);
			this.addToggleSetting('closeSidebarWhenLostFocus')
				.setName(t('setting.auto-hide-sidebar', 'Auto-hide sidebar when it loses focus after auto-pasting'))
				.setDesc(t('desc.auto-hide-sidebar', 'After auto-pasting into a markdown file opened in the left or right sidebar, the sidebar will be automatically collapsed once it loses focus.'));

			this.addToggleSetting('openAutoFocusTargetInEditingView')
				.setName(t('setting.always-editing-view', 'Always open in editing view'))
				.setDesc(t('desc.always-editing-view', 'This option can be useful especially when you set the previous option to "Hover Editor".'));
		}
		this.addToggleSetting('executeCommandWhenTargetNotIdentified', () => this.redisplay())
			.setName(t('setting.execute-command-unknown', 'Execute command when target file cannot be determined'))
			.setDesc(t('desc.execute-command-unknown', 'When PDF++ cannot determine which markdown file to focus on or paste to, it will execute the command specified in the next option to let you pick a target file.'));
		const commandName = this.app.commands.findCommand(`${this.plugin.manifest.id}:create-new-note`)?.name ?? 'PDF++: Create new note for auto-focus or auto-paste';
		if (this.plugin.settings.executeCommandWhenTargetNotIdentified) {
			this.addSetting('commandToExecuteWhenTargetNotIdentified')
				.setName(t('setting.unknown-command', 'Command to execute'))
				.then((setting) => {
					this.renderMarkdown([
						'Here\'s some examples of useful commands:',
						'',
						`- ${this.app.commands.findCommand('file-explorer:new-file')?.name ?? 'Create new note'}`,
						`- ${this.app.commands.findCommand('file-explorer:new-file-in-new-pane')?.name ?? 'Create note to the right'}`,
						`- ${this.app.commands.findCommand('switcher:open')?.name ?? 'Quick switcher: Open quick switcher'}`,
						'- [Omnisearch](obsidian://show-plugin?id=omnisearch): Vault search',
						'- [Hover Editor](obsidian://show-plugin?id=obsidian-hover-editor): Open new Hover Editor',
						`- **${commandName}**: See below for the details.`,
					], setting.descEl);
				})
				.addText((text) => {
					const id = this.plugin.settings.commandToExecuteWhenTargetNotIdentified;
					const command = this.app.commands.findCommand(id);
					if (command) {
						text.setValue(command.name);
					} else {
						text.inputEl.addClass('error');
						text.setPlaceholder('Command not found');
					}
					text.inputEl.size = 30;
					new CommandSuggest(this, text.inputEl);
				});
			this.addSliderSetting('autoPasteTargetDialogTimeoutSec', 1, 60, 1)
				.setName(t('setting.auto-paste-max-wait', '[Auto-paste] Maximum time to wait for the command to open the target file (sec)'))
				.setDesc(t('desc.auto-paste-max-wait', 'The link will be auto-pasted into the first markdown file that you open within this time frame after the command is executed. If you don\'t open any markdown file during this time, the auto-paste will not occur. This option is not related to auto-focus.'));
		}

		this.addHeading(t('heading.create-new-note-command', `The "${commandName}" command`, { commandName }), 'create-new-note-command')
			.setDesc(t('desc.create-new-note-command', 'Creates a new note and opens it in a new pane specified in the "How to open target markdown file when not opened" option.'));
		this.addTextSetting('newFileNameFormat', 'Leave blank not to specify')
			.setName(t('setting.new-note-title-format', 'New note title format'))
			.then(async (setting) => {
				await this.renderMarkdown([
					'If this option is left blank or the active file is not a PDF, "Untitled \\*" will be used (if the language is set to English). You can use the following variables: `file`, `folder`, `app`, and other global variables such as `moment`.',
				], setting.descEl);
				setting.descEl.createSpan({ text: 'See ' });
				setting.descEl.appendChild(this.createLinkToHeading('template', 'above'));
				setting.descEl.createSpan({ text: ' for the details about these variables.' });
			});
		this.addTextSetting('newFileTemplatePath', 'Leave blank not to use a template')
			.setName(t('setting.template-file-path', 'Template file path'))
			.then(async (setting) => {
				await this.renderMarkdown([
					'You can leave this blank if you don\'t want to use a template.',
					'You can use `file`, `folder`, `app`, and other global variables such as `moment`.',
				], setting.descEl);
				setting.descEl.createSpan({ text: 'See ' });
				setting.descEl.appendChild(this.createLinkToHeading('template', 'above'));
				setting.descEl.createSpan({ text: ' for the details about these variables.' });
				await this.renderMarkdown([
					'You can also include [Templater](obsidian://show-plugin?id=templater-obsidian) syntaxes in the template.',
					'In that case, make sure the "Trigger templater on new file creation" option is enabled in the Templater settings.',
					'',
					'Example:',
					'```',
					'---',
					`${this.plugin.settings.proxyMDProperty}: "[[{{ file.path }}|{{ file.basename }}]]"`,
					'---',
					'<%* const title = await tp.system.prompt("Type note tile") -%>',
					'<%* await tp.file.rename(title) %>',
					'```',
				], setting.descEl);

				const inputEl = (setting.components[0] as TextComponent).inputEl;
				new FuzzyMarkdownFileSuggest(this.app, inputEl)
					.onSelect(({ item: file }) => {
						this.plugin.settings.newFileTemplatePath = file.path;
						this.plugin.saveSettings();
					});
			});


		this.addHeading(t('heading.annot', 'PDF Annotations'), 'annot', 'lucide-message-square');
		this.addToggleSetting('annotationPopupDrag')
			.setName(t('setting.annotation-popup-drag', 'Drag & drop annotation popup to insert a link to the annotation'))
			.setDesc(t('desc.annotation-popup-drag', 'Note that turning on this option disables text selection in the annotation popup (e.g. modified date, author, etc).'));
		this.addToggleSetting('showAnnotationPopupOnHover')
			.setName(t('setting.show-annotation-popup-on-hover', 'If an annotation has a comment, show the annotation popup on hover'))
			.setDesc(t('desc.show-annotation-popup-on-hover', 'This is the same behavior as the PDF viewers of some web browsers (e.g. Chrome/Firefox). You may have to reopen the PDF file after changing this option.'));
		this.addToggleSetting('renderMarkdownInStickyNote')
			.setName(t('setting.render-markdown-in-sticky-note', 'Render markdown in annotation popups when the annotation has text contents'));
		if (this.plugin.settings.enablePDFEdit) {
			this.addSliderSetting('writeHighlightToFileOpacity', 0, 1, 0.01)
				.setName(t('setting.highlight-opacity', 'Highlight opacity'));
			this.addToggleSetting('defaultWriteFileToggle')
				.setName(t('setting.default-write-file-toggle', 'Write highlight to file by default'))
				.setDesc(t('desc.default-write-file-toggle', 'You can turn this on and off with the toggle button in the PDF viewer toolbar.'));
			this.addToggleSetting('syncWriteFileToggle')
				.setName(t('setting.sync-write-file-toggle', 'Share the same toggle state among all PDF viewers'))
				.setDesc(t('desc.sync-write-file-toggle', 'If disabled, you can specify whether to write highlights to files for each PDF viewer.'));
			if (this.plugin.settings.syncWriteFileToggle) {
				this.addToggleSetting('syncDefaultWriteFileToggle')
					.setName(t('setting.sync-default-write-file-toggle', 'Share the state with newly opened PDF viewers as well'));
			}
			this.addToggleSetting('enableAnnotationContentEdit', () => this.redisplay())
				.setName(t('setting.enable-annotation-content-edit', 'Enable editing annotation contents'))
				.setDesc(t('desc.enable-annotation-content-edit', 'If enabled, you can edit the text contents of annotations embedded in PDF files by clicking the "Edit" button in the annotation popup.'));
			this.addToggleSetting('enableAnnotationDeletion', () => this.redisplay())
				.setName(t('setting.enable-annotation-deletion', 'Enable annotation deletion'))
				.setDesc(t('desc.enable-annotation-deletion', 'If enabled, you can delete annotations embedded in PDF files by clicking the "Delete" button in the annotation popup.'));
			if (this.plugin.settings.enableAnnotationDeletion) {
				this.addToggleSetting('warnEveryAnnotationDelete', () => this.redisplay())
					.setName(t('setting.warn-every-annotation-delete', 'Always warn when deleting an annotation'));
				if (!this.plugin.settings.warnEveryAnnotationDelete) {
					this.addToggleSetting('warnBacklinkedAnnotationDelete')
						.setName(t('setting.warn-backlinked-annotation-delete', 'Warn when deleting an annotation with backlinks'));
				}
			}
		}


		this.addHeading(t('heading.pdf-link', 'PDF internal links'), 'pdf-link', 'link')
			.setDesc(t('desc.pdf-link', 'Make it easier to work with internal links embedded in PDF files.'));
		this.addToggleSetting('clickPDFInternalLinkWithModifierKey')
			.then((setting) => {
				this.renderMarkdown(
					'Use [modifier keys](https://help.obsidian.md/User+interface/Tabs#Open+a+link) to open PDF internal links in various ways',
					setting.nameEl
				);
			})
			.then((setting) => {
				if (this.plugin.requireModKeyForLinkHover(PDFInternalLinkPostProcessor.HOVER_LINK_SOURCE_ID)) setting.setDesc(t('desc.avoid-conflicts-with-hover', `You may want to turn this off to avoid conflicts with hover+{modKey}.`, { modKey }));
				setting.descEl.appendText(t('desc.reopen-tabs-after-changing', 'Reopen tabs or reload the app after changing this option.'));
			});
		this.addToggleSetting('enableHoverPDFInternalLink', () => this.events.trigger('update'))
			.setName(t('setting.enable-hover-pdf-internal-link', `Show a popover preview of PDF internal links by hover(+${modKey})`, { modKey }));
		this.showConditionally(
			this.addRequireModKeyOnHoverSetting(PDFInternalLinkPostProcessor.HOVER_LINK_SOURCE_ID),
			() => this.plugin.settings.enableHoverPDFInternalLink
		);
		this.addToggleSetting('recordPDFInternalLinkHistory')
			.setName(t('setting.record-pdf-internal-link-history', 'Enable history navigation for PDF internal links'))
			.setDesc(t('desc.record-pdf-internal-link-history', 'When enabled, clicking the "navigate back" (left arrow) button will take you back to the page you were originally viewing before clicking on an internal link in the PDF file.'));
		this.addSetting()
			.setName(t('setting.copy-pdf-link-as-obsidian-link', 'Copy PDF link as Obsidian link'))
			.setDesc(t('desc.copy-pdf-link-as-obsidian-link', '(Requires custom context menu enabled) In the PDF viewer, right-click a PDF-embedded link and then click "Copy PDF link as Obsidian link". It will copy the PDF link as an Obsidian link that you can paste into markdown files. Clicking the pasted link will take you to the same destination as the original PDF link.'));
		this.addSetting()
			.setName(t('setting.copy-link-to-page-view-command', '"Copy link to current page view" command'))
			.setDesc(t('desc.copy-link-to-page-view-command', 'Running this command while viewing a PDF file will copy a link, clicking which will open the PDF file at the current scroll position and zoom level.'));
		this.addSetting()
			.setName(t('setting.paste-copied-link-to-selection', 'Paste copied link to a text selection in a PDF file'))
			.setDesc(t('desc.paste-copied-link-to-selection', '(Requires custom context menu & PDF editing enabled) After copying a link by the above actions, you can "paste" it to a selection in PDF to create a PDF internal link. To do this, right-click the selection and click "Paste copied link to selection".'));
		if (this.plugin.settings.replaceContextMenu && this.plugin.settings.enablePDFEdit) {
			this.addToggleSetting('pdfLinkBorder', () => this.redisplay())
				.setName(t('setting.pdf-link-border', 'Draw borders around internal links'))
				.setDesc(t('desc.pdf-link-border', 'Specify whether PDF internal links that you create by "Paste copied link to selection" should be surrounded by borders.'));
			if (this.plugin.settings.pdfLinkBorder) {
				this.addColorPickerSetting('pdfLinkColor')
					.setName(t('setting.pdf-link-color', 'Border color of internal links'))
					.setDesc(t('desc.pdf-link-color', 'Specify the border color of PDF internal links that you create by "Paste copied link to selection".'));
			}
		}


		this.addHeading(t('heading.citation', 'Citations in PDF (experimental)'), 'citation', 'lucide-graduation-cap')
			.then((setting) => {
				this.renderMarkdown([
					'Enjoy supercharged experiences of working with citations in PDF files, just like in [Google Scholar\'s PDF viewer](https://scholar.googleblog.com/2024/03/supercharge-your-pdf-reading-follow.html).',
					'',
					'The current implementation is based on some pretty primitive hand-crafted rules, and there is a lot of room for improvement. Code contribution is much appreciated!'
				], setting.descEl);
			});
		{
			this.addDropdownSetting('actionOnCitationHover', ACTION_ON_CITATION_HOVER, () => this.events.trigger('update'))
				.setName(t('setting.action-on-citation-hover', `Hover(+${modKey}) on a citation link to show...`, { modKey }))
				.then((setting) => {
					this.renderMarkdown([
						`- **${ACTION_ON_CITATION_HOVER['pdf-plus-bib-popover']}**: ` + ' Recommended. It works without any additional stuff, but you can further boost the visibility by installing [AnyStyle](https://github.com/inukshuk/anystyle) (desktop only).',
						`- **${ACTION_ON_CITATION_HOVER['google-scholar-popover']}**: ` + ' Requires [Surfing](obsidian://show-plugin?id=surfing) ver. 0.9.9 or higher enabled. Be careful not to exceed the rate limit of Google Scholar.',
					], setting.descEl);
				});
			this.showConditionally(
				this.addRequireModKeyOnHoverSetting(BibliographyManager.HOVER_LINK_SOURCE_ID),
				() => this.plugin.settings.actionOnCitationHover !== 'none'
			);
			this.showConditionally(
				this.addSetting('anystylePath')
					.setName(t('setting.anystyle-path', 'AnyStyle path'))
					.addText((text) => {
						text.setPlaceholder('anystyle')
							.setValue(this.plugin.settings.anystylePath)
							.onChange((value) => {
								this.plugin.settings.anystylePath = value;
								this.plugin.saveLocalStorage('anystylePath', value);
							});
					})
					.then((setting) => {
						(setting.components[0] as TextComponent).inputEl.size = 35;
						this.renderMarkdown([
							'The path to the [AnyStyle](https://github.com/inukshuk/anystyle) executable. ',
							'',
							'PDF++ extracts the bibliography text from the PDF file for each citation link and uses AnyStyle to convert the extracted text into a structured metadata.',
							'It works just fine without AnyStyle, but you can further boost the visibility by installing it and providing its path here.',
							'',
							'Note: This setting is saved in the [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) instead of `data.json` in the plugin folder.'
						], setting.descEl);
					}),
				() => Platform.isDesktopApp && this.plugin.settings.actionOnCitationHover === 'pdf-plus-bib-popover'
			);

			this.showConditionally(
				this.addTextAreaSetting('citationIdPatterns', undefined, () => this.plugin.setCitationIdRegex())
					.setName(t('setting.citation-id-patterns', 'Citation ID patterns'))
					.setDesc(t('desc.citation-id-patterns', 'You don\'t need to care about this option in most use cases - just leave it to the default value. For advanced users: most internal links in PDF files use so-called destination names to specify the target location. This option allows you to specify the regular expressions (separated by line breaks) that determine whether a given internal link is a citation link based on the dsetination name.')),
				() => this.plugin.settings.actionOnCitationHover !== 'none'
			);

			this.showConditionally(
				[
					this.addDesc('Try turning off the following options if you experience performance issues.'),
					this.addToggleSetting('enableBibInEmbed')
						.setName(t('setting.enable-bib-in-embed', 'Enable bibliography extraction in PDF embeds')),
					this.addToggleSetting('enableBibInCanvas')
						.setName(t('setting.enable-bib-in-canvas', 'Enable bibliography extraction in Canvas')),
					this.addToggleSetting('enableBibInHoverPopover')
						.setName(t('setting.enable-bib-in-hover-popover', 'Enable bibliography extraction in hover popover previews')),
				],
				() => this.plugin.settings.actionOnCitationHover !== 'none',
			);
		}


		this.addHeading(t('heading.pdf-external-link', 'External links in PDF'), 'pdf-external-link', 'external-link')
			.setDesc(t('desc.pdf-external-link', 'Make it easier to work with external links embedded in PDF files.'));
		this.addToggleSetting('popoverPreviewOnExternalLinkHover')
			.setName(t('setting.popover-preview-on-external-link-hover', `Show a popover preview of external links by hover(+${modKey})`, { modKey }))
			.then((setting) => {
				this.renderMarkdown([
					'Requires [Surfing](obsidian://show-plugin?id=surfing) ver. 0.9.9 or higher enabled.',
				], setting.descEl);
			});
		this.showConditionally(
			this.addRequireModKeyOnHoverSetting(PDFExternalLinkPostProcessor.HOVER_LINK_SOURCE_ID),
			() => this.plugin.settings.popoverPreviewOnExternalLinkHover
		);

		this.addHeading(t('heading.sidebar', 'PDF sidebar'), 'sidebar', 'sidebar-left')
			.setDesc(t('desc.sidebar', 'General settings for the PDF sidebar. The options specific to the outline and thumbnails are located in the corresponding sections below.'));
		this.addToggleSetting('autoHidePDFSidebar')
			.setName(t('setting.auto-hide-pdf-sidebar', 'Click on PDF content to hide sidebar'))
			.setDesc(t('desc.auto-hide-pdf-sidebar', 'Requires reopening the tabs after changing this option.'));
		this.addEnumDropdownSetting('defaultSidebarView', {
			[SidebarView.THUMBS]: 'Thumbnails',
			[SidebarView.OUTLINE]: 'Outline',
		})
			.setName(t('setting.default-sidebar-view', 'Default sidebar view'))
			.setDesc(t('desc.default-sidebar-view', 'Reopen PDFs after changing this option.'));

		this.addHeading(t('heading.outline', 'PDF outline (table of contents)'), 'outline', 'lucide-list')
			.setDesc(t('desc.outline', 'Power up the outline view of the built-in PDF viewer: add, rename, or delete items via the right-click menu and the "Add to outline" command, drag & drop items to insert a section link, and more.'));
		this.addToggleSetting('clickOutlineItemWithModifierKey')
			.then((setting) => {
				this.renderMarkdown(
					'Click PDF outline with [modifier keys](https://help.obsidian.md/User+interface/Tabs#Open+a+link) to open target section in various ways',
					setting.nameEl
				);
			})
			.then((setting) => {
				if (this.plugin.requireModKeyForLinkHover(PDFOutlineItemPostProcessor.HOVER_LINK_SOURCE_ID)) setting.setDesc(t('desc.avoid-conflicts-with-hover', `You may want to turn this off to avoid conflicts with hover+{modKey}.`, { modKey }));
				setting.descEl.appendText(t('desc.reopen-tabs-after-changing', 'Reopen tabs or reload the app after changing this option.'));
			});
		this.addToggleSetting('popoverPreviewOnOutlineHover', () => this.events.trigger('update'))
			.setName(t('setting.popover-preview-on-outline-hover', `Show popover preview by hover(+${modKey})`, { modKey }))
			.setDesc(t('desc.popover-preview-on-outline-hover', 'Reopen tabs or reload the app after changing this option.'));
		this.showConditionally(
			this.addRequireModKeyOnHoverSetting(PDFOutlineItemPostProcessor.HOVER_LINK_SOURCE_ID),
			() => this.plugin.settings.popoverPreviewOnOutlineHover
		);
		this.addToggleSetting('recordHistoryOnOutlineClick')
			.setName(t('setting.record-history-on-outline-click', 'Record to history when clicking an outline item'))
			.setDesc(t('desc.record-history-on-outline-click', 'Reopen tabs or reload the app after changing this option.'));
		this.addToggleSetting('outlineContextMenu')
			.setName(t('setting.outline-context-menu', 'Replace the built-in context menu in the outline with a custom one'))
			.setDesc(t('desc.outline-context-menu', 'This enables you to insert a section link with a custom format by right-clicking an item in the outline. Moreover, you will be able to add, rename, or delete outline items if PDF modification is enabled.'));
		this.addToggleSetting('outlineDrag')
			.setName(t('setting.outline-drag', 'Drag & drop outline item to insert link to section'))
			.setDesc(t('desc.outline-drag', 'Grab an item in the outline and drop it to a markdown file to insert a section link. Changing this option requires reopening the tabs or reloading the app.'));
		if (this.plugin.settings.outlineContextMenu || this.plugin.settings.outlineDrag) {
			this.addTextSetting('outlineLinkDisplayTextFormat')
				.setName(t('setting.outline-link-display-text-format', 'Display text format'))
				.then((setting) => {
					const text = setting.components[0] as TextComponent;
					text.inputEl.size = 30;
				});
			this.addTextAreaSetting('outlineLinkCopyFormat')
				.setName(t('setting.outline-link-copy-format', 'Copy format'))
				.then((setting) => {
					const textarea = setting.components[0] as TextAreaComponent;
					textarea.inputEl.rows = 3;
					textarea.inputEl.cols = 30;
				});
		}
		this.addHeading(t('heading.outline-copy', 'Copy outline as markdown'), 'outline-copy')
			.setDesc(t('desc.copy-outline-as-markdown', 'You can copy PDF outline as a markdown list or headings using the commands "Copy outline as markdown list" and "Copy outline as markdown headings".'));
		this.addTextSetting('copyOutlineAsListDisplayTextFormat')
			.setName(t('setting.copy-outline-as-list-display-text-format', 'List: display text format'))
			.then((setting) => {
				const text = setting.components[0] as TextComponent;
				text.inputEl.size = 30;
			});
		this.addTextAreaSetting('copyOutlineAsListFormat')
			.setName(t('setting.copy-outline-as-list-format', 'List: copy format'))
			.setDesc(t('desc.copy-outline-as-list-format', 'You don\'t need to include leading hyphens in the template.'))
			.then((setting) => {
				const textarea = setting.components[0] as TextAreaComponent;
				textarea.inputEl.rows = 3;
				textarea.inputEl.cols = 30;
			});
		this.addTextSetting('copyOutlineAsHeadingsDisplayTextFormat')
			.setName(t('setting.copy-outline-as-headings-display-text-format', 'Headings: display text format'))
			.then((setting) => {
				const text = setting.components[0] as TextComponent;
				text.inputEl.size = 30;
			});
		this.addTextAreaSetting('copyOutlineAsHeadingsFormat')
			.setName(t('setting.copy-outline-as-headings-format', 'Headings: copy format'))
			.setDesc(t('desc.copy-outline-as-headings-format', 'You don\'t need to include leading hashes in the template.'))
			.then((setting) => {
				const textarea = setting.components[0] as TextAreaComponent;
				textarea.inputEl.rows = 3;
				textarea.inputEl.cols = 30;
			});
		this.addSliderSetting('copyOutlineAsHeadingsMinLevel', 1, 6, 1)
			.setName(t('setting.copy-outline-as-headings-min-level', 'Headings: minimum level'))
			.setDesc(t('desc.copy-outline-as-headings-min-level', 'The copied headings will start at this level.'));


		this.addHeading(t('heading.thumbnail', 'PDF thumbnails'), 'thumbnail', 'lucide-gallery-thumbnails');
		this.addToggleSetting('clickThumbnailWithModifierKey')
			.then((setting) => {
				this.renderMarkdown(
					'Click PDF thumbnails with [modifier keys](https://help.obsidian.md/User+interface/Tabs#Open+a+link) to open target page in various ways',
					setting.nameEl
				);
			})
			.then((setting) => {
				if (this.plugin.requireModKeyForLinkHover(PDFThumbnailItemPostProcessor.HOVER_LINK_SOURCE_ID)) setting.setDesc(t('desc.avoid-conflicts-with-hover', `You may want to turn this off to avoid conflicts with hover+{modKey}.`, { modKey }));
				setting.descEl.appendText(t('desc.reopen-tabs-after-changing', 'Reopen tabs or reload the app after changing this option.'));
			});
		this.addToggleSetting('popoverPreviewOnThumbnailHover', () => this.events.trigger('update'))
			.setName(t('setting.popover-preview-on-thumbnail-hover', `Show popover preview by hover(+${modKey})`, { modKey }))
			.setDesc(t('desc.popover-preview-on-thumbnail-hover', 'Reopen tabs or reload the app after changing this option.'));
		this.showConditionally(
			this.addRequireModKeyOnHoverSetting(PDFThumbnailItemPostProcessor.HOVER_LINK_SOURCE_ID),
			() => this.plugin.settings.popoverPreviewOnThumbnailHover
		);
		this.addToggleSetting('recordHistoryOnThumbnailClick')
			.setName(t('setting.record-history-on-thumbnail-click', 'Record to history when clicking a thumbnail'))
			.setDesc(t('desc.record-history-on-thumbnail-click', 'Reopen tabs or reload the app after changing this option.'));
		this.addToggleSetting('thumbnailContextMenu')
			.setName(t('setting.thumbnail-context-menu', 'Replace the built-in context menu in thumbnails with a custom one'))
			.setDesc(t('desc.thumbnail-context-menu', 'This enables you to copy a page link with a custom display text format specified in the PDF toolbar by right-clicking a thumbnail. Moreover, you will be able to insert, delete, extract pages if PDF modification is enabled.'));
		this.addToggleSetting('thumbnailDrag')
			.setName(t('setting.thumbnail-drag', 'Drag & drop PDF thumbnail to insert link to page'))
			.then((setting) => {
				this.renderMarkdown([
					t('desc.thumbnail-drag', 'Grab a thumbnail image and drop it to a markdown file to insert a page link. Changing this option requires reopening the tabs or reloading the app.'),
					'',
					t('desc.thumbnail-drag-note', 'Note: When disabled, drag-and-drop will cause the thumbnail image to be paste as a data url, which is seemingly Obsidian\'s bug.')
				], setting.descEl);
			});
		if (this.plugin.settings.thumbnailContextMenu || this.plugin.settings.thumbnailDrag) {
			this.addTextSetting('thumbnailLinkDisplayTextFormat')
				.setName(t('setting.thumbnail-link-display-text-format', 'Display text format'))
				.then((setting) => {
					const text = setting.components[0] as TextComponent;
					text.inputEl.size = 30;
				});
			this.addTextAreaSetting('thumbnailLinkCopyFormat')
				.setName(t('setting.thumbnail-link-copy-format', 'Copy format'))
				.then((setting) => {
					const textarea = setting.components[0] as TextAreaComponent;
					textarea.inputEl.rows = 3;
					textarea.inputEl.cols = 30;
				});
		}


		this.addHeading(t('heading.composer', 'PDF page composer (experimental)'), 'composer', 'lucide-blocks')
			.then((setting) => {
				this.renderMarkdown([
					t('desc.composer', `Add, insert, delete or extract PDF pages via commands and **automatically update all the related links in the entire vault**. The "Editing PDF files directly" option has to be enabled to use these features.`)
				], setting.descEl);
			});
		this.addToggleSetting('warnEveryPageDelete', () => this.redisplay())
			.setName(t('setting.warn-every-page-delete', 'Always warn when deleting a page'));
		if (!this.plugin.settings.warnEveryPageDelete) {
			this.addToggleSetting('warnBacklinkedPageDelete')
				.setName(t('setting.warn-backlinked-page-delete', 'Warn when deleting a page with backlinks'));
		}
		this.addToggleSetting('extractPageInPlace')
			.setName(t('setting.extract-page-in-place', 'Remove the extracted pages from the original PDF by default'));
		this.addToggleSetting('askExtractPageInPlace')
			.setName(t('setting.ask-extract-page-in-place', 'Ask whether to remove the extracted pages from the original PDF before extracting'));
		this.addToggleSetting('openAfterExtractPages', () => this.redisplay())
			.setName(t('setting.open-after-extract-pages', 'Open extracted PDF file'))
			.setDesc(t('desc.open-after-extract-pages', 'If enabled, the newly created PDF file will be opened after running the commands "Extract this page to a new file" or "Divide this PDF into two files at this page".'));
		if (this.plugin.settings.openAfterExtractPages) {
			this.addDropdownSetting('howToOpenExtractedPDF', PANE_TYPE)
				.setName(t('setting.how-to-open-extracted-pdf', 'How to open'));
		}

		this.addHeading(t('heading.page-label', 'Page labels'), 'page-label')
			.then((setting) => {
				this.renderMarkdown([
					t('desc.page-label-intro', 'Each page in a PDF document can be assigned a ***page label***, which can be different from the page indices.'),
					t('desc.page-label-example', 'For example, a book might have a preface numbered as "i", "ii", "iii", ... and the main content numbered as "1", "2", "3", ...'),
					'',
					t('desc.page-label-learn', 'PDF++ allows you to choose whether page labels should be kept unchanged or updated when inserting/removing/extracting pages. [Learn more](https://github.com/RyotaUshio/obsidian-pdf-plus/wiki/Page-labels)'),
					'',
					t('desc.page-label-edit', 'You can also modify page labels directly using the command "Edit page labels".')
				], setting.descEl);
			});
		this.addDropdownSetting('pageLabelUpdateWhenInsertPage', PAGE_LABEL_UPDATE_METHODS)
			.setName(t('setting.page-label-update-when-insert-page', 'Insert: default page label processing'))
			.setDesc(t('desc.page-label-update-when-insert-page', 'Applies to the commands "Insert page before/after this page".'));
		this.addToggleSetting('askPageLabelUpdateWhenInsertPage')
			.setName(t('setting.ask-page-label-update-when-insert-page', 'Insert: ask whether to update'));
		this.addDropdownSetting('pageLabelUpdateWhenDeletePage', PAGE_LABEL_UPDATE_METHODS)
			.setName(t('setting.page-label-update-when-delete-page', 'Delete: default page label processing'))
			.setDesc(t('desc.page-label-update-when-delete-page', 'Applies to the command "Delete this page".'));
		this.addToggleSetting('askPageLabelUpdateWhenDeletePage')
			.setName(t('setting.ask-page-label-update-when-delete-page', 'Delete: ask whether to update'));
		this.addDropdownSetting('pageLabelUpdateWhenExtractPage', PAGE_LABEL_UPDATE_METHODS)
			.setName(t('setting.page-label-update-when-extract-page', 'Extract: default page label processing'))
			.setDesc(t('desc.page-label-update-when-extract-page', 'Applies to the commands "Extract this page to a new file" and "Divide this PDF into two files at this page".'));
		this.addToggleSetting('askPageLabelUpdateWhenExtractPage')
			.setName(t('setting.ask-page-label-update-when-extract-page', 'Extract: ask whether to update'));


		// this.addHeading('Canvas', 'canvas', 'lucide-layout-dashboard')
		// 	.setDesc('Embed PDF files in Canvas and create a card from text selection or annotation using the "Create canvas card from selection or annotation" command.')
		// this.addToggleSetting('canvasContextMenu')
		// 	.setName('Show "Create Canvas card from ..." in the right-click menu in Canvas')
		// 	.setDesc('Turn this off if you don\'t want to clutter the right-click menu. You can always use the "Create canvas card from selection or annotation" command via a hotkey.');


		this.addHeading(t('heading.open-link', 'Opening links to PDF files'), 'open-link', 'lucide-book-open');
		this.addToggleSetting('alwaysRecordHistory')
			.setName(t('setting.always-record-history', 'Always record to history when opening PDF links'))
			.setDesc(t('desc.always-record-history', 'By default, the history is recorded only when you open a link to a different PDF file. If enabled, the history will be recorded even when you open a link to the same PDF file as the current one, and you will be able to go back and forth the history by clicking the left/right arrow buttons even within a single PDF file.'));
		this.addToggleSetting('singleTabForSinglePDF', () => this.redisplay())
			.setName(t('setting.single-tab-for-single-pdf', 'Don\'t open a single PDF file in multiple tabs'))
			.then((setting) => this.renderMarkdown(
				t('desc.single-tab-for-single-pdf', `When opening a link to a PDF file without pressing any [modifier keys](https://help.obsidian.md/User+interface/Use+tabs+in+Obsidian#Open+a+link), a new tab will not be opened if the same file has already been already opened in another tab. Useful for annotating PDFs using a side-by-side view ("Split right"), displaying a PDF in one side and a markdown file in another.`),
				setting.descEl
			));
		if (this.plugin.settings.singleTabForSinglePDF) {
			this.addToggleSetting('dontActivateAfterOpenPDF')
				.setName(t('setting.dont-activate-after-open-pdf', 'Don\'t move focus to PDF viewer after opening a PDF link'))
				.setDesc(t('desc.dont-activate-after-open-pdf', 'This option will be ignored when you open a PDF link in a tab in the same split as the PDF viewer.'));
			this.addToggleSetting('highlightExistingTab', () => this.redisplay())
				.setName(t('setting.highlight-existing-tab', 'When opening a link to an already opened PDF file, highlight the tab'));
			if (this.plugin.settings.highlightExistingTab) {
				this.addSliderSetting('existingTabHighlightOpacity', 0, 1, 0.01)
					.setName(t('setting.existing-tab-highlight-opacity', 'Highlight opacity of an existing tab'));
				this.addSliderSetting('existingTabHighlightDuration', 0.1, 10, 0.05)
					.setName(t('setting.existing-tab-highlight-duration', 'Highlight duration of an existing tab (sec)'));
			}
			this.addToggleSetting('dontFitWidthWhenOpenPDFLink', () => this.events.trigger('update'))
				.setName(t('setting.dont-fit-width-when-open-pdf-link', 'Preserve the current zoom level when opening a link to an already opened PDF file'))
				.setDesc(t('desc.dont-fit-width-when-open-pdf-link', 'When you open a link to a PDF file that\'s already opened, Obsidian\'s default behavior causes the zoom level to be reset to fit the width of the PDF file to the viewer. If enabled, the current zoom level will be preserved. This option will be ignored in PDF embeds.'));
			this.showConditionally(
				this.addToggleSetting('preserveCurrentLeftOffsetWhenOpenPDFLink')
					.setName(t('setting.preserve-current-left-offset-when-open-pdf-link', 'Preserve the current horizontal scroll position'))
					.setDesc(t('desc.preserve-current-left-offset', 'This option will be ignored in PDF embeds.')),
				() => this.plugin.settings.dontFitWidthWhenOpenPDFLink
			);
		}
		this.addDropdownSetting('paneTypeForFirstPDFLeaf', PANE_TYPE)
			.setName(t('setting.pane-type-for-first-pdf-leaf', `How to open PDF links when there is no open PDF file`))
			.then((setting) => {
				this.renderMarkdown(
					t('desc.pane-type-for-first-pdf-leaf', 'This option will be ignored when you press [modifier keys](https://help.obsidian.md/User+interface/Use+tabs+in+Obsidian#Open+a+link) to explicitly specify how to open the link.'),
					setting.descEl
				);
			});
		this.addToggleSetting('openLinkNextToExistingPDFTab')
			.setName(t('setting.open-link-next-to-existing-pdf-tab', 'Open PDF links next to an existing PDF tab'))
			.then((setting) => this.renderMarkdown(
				t('desc.open-link-next-to-existing-pdf-tab', 'If there is a PDF file opened in a tab, clicking a PDF link will first create a new tab next to it and then open the target PDF file in the created tab. This is especially useful when you are spliting the workspace vertically or horizontally and want PDF files to be always opened in one side. This option will be ignored when you press [modifier keys](https://help.obsidian.md/User+interface/Use+tabs+in+Obsidian#Open+a+link) to explicitly specify how to open the link.'),
				setting.descEl
			));
		this.addToggleSetting('hoverPDFLinkToOpen')
			.setName(t('setting.hover-pdf-link-to-open', 'Open PDF link instead of showing popover preview when target PDF is already opened'))
			.setDesc(t('desc.hover-pdf-link-to-open', `Press ${getModifierNameInPlatform('Mod').toLowerCase()} while hovering a PDF link to actually open it if the target PDF is already opened in another tab.`, { modKey: getModifierNameInPlatform('Mod').toLowerCase() }));
		this.addSetting()
			.setName(t('setting.open-pdf-links-with-external-app', 'Open PDF links with an external app'))
			.setDesc(createFragment((el) => {
				el.appendText(t('desc.open-pdf-links-with-external-app-see', 'See the '));
				el.appendChild(this.createLinkToHeading('external-app'));
				el.appendText(t('desc.open-pdf-links-with-external-app-section', ' section for the details.'));
			}));


		this.addSetting()
			.setName(t('setting.clear-highlights', 'Clear highlights after a certain amount of time'))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.highlightDuration > 0)
					.onChange(async (value) => {
						this.plugin.settings.highlightDuration = value
							? (this.plugin.settings.highlightDuration > 0
								? this.plugin.settings.highlightDuration
								: 1)
							: 0;
						await this.plugin.saveSettings();
						this.redisplay();
					});
			});
		if (this.plugin.settings.highlightDuration > 0) {
			this.addSliderSetting('highlightDuration', 0.1, 10, 0.05)
				.setName(t('setting.highlight-duration', 'Highlight duration (sec)'));
		}
		this.addToggleSetting('ignoreHeightParamInPopoverPreview')
			.setName(t('setting.ignore-height-param-in-popover-preview', 'Ignore "height" parameter in popover preview'))
			.setDesc(t('desc.ignore-height-param-in-popover-preview', 'Obsidian lets you specify the height of a PDF embed by appending "&height=..." to a link, and this also applies to popover previews. Enable this option if you want to ignore the height parameter in popover previews.'));


		this.addHeading(t('heading.embed', 'Embedding PDF files'), 'embed', 'picture-in-picture-2');
		this.addToggleSetting('dblclickEmbedToOpenLink', () => this.plugin.loadStyle())
			.setName(t('setting.dblclick-embed-to-open-link', 'Double click PDF embeds to open links'))
			.setDesc(t('desc.dblclick-embed-to-open-link', 'Double-clicking a PDF embed will open the embedded file.'));
		this.addToggleSetting('trimSelectionEmbed', () => this.redisplay())
			.setName(t('setting.trim-selection-embed', 'Trim selection/annotation embeds'))
			.then((setting) => {
				this.renderMarkdown([
					t('desc.trim-selection-embed-deprecated', '<span style="color: var(--text-warning);">(Deprecated in favor of the <a href="https://ryotaushio.github.io/obsidian-pdf-plus/embedding-rectangular-selections.html" class="external-link" target="_blank" rel="noopener">rectangular selection embed feature</a> introduced in PDF++ 0.36.0)</span>'),
					t('desc.trim-selection-embed', 'When embedding a selection or an annotation from a PDF file, only the target selection/annotation and its surroundings are displayed rather than the entire page.')
				], setting.descEl);
			});
		if (this.plugin.settings.trimSelectionEmbed) {
			this.addSliderSetting('embedMargin', 0, 200, 1)
				.setName(t('setting.embed-margin', 'Selection/annotation embeds margin (px)'));
		}
		this.addToggleSetting('noSidebarInEmbed')
			.setName(t('setting.no-sidebar-in-embed', 'Hide sidebar in PDF embeds or PDF popover previews by default'));
		this.addToggleSetting('noSpreadModeInEmbed')
			.setName(t('setting.no-spread-mode-in-embed', 'Don\'t display PDF embeds or PDF popover previews in "two page" layout'))
			.setDesc(t('desc.no-spread-mode-in-embed', 'Regardless of the "two page" layout setting in existing PDF viewer, PDF embeds and PDF popover previews will be always displayed in "single page" layout. You can still turn it on for each embed by clicking the "two page" button in the toolbar, if shown.'));
		this.addToggleSetting('noTextHighlightsInEmbed')
			.setName(t('setting.no-text-highlights-in-embed', 'Don\'t highlight text in text selection embeds'));
		this.addToggleSetting('noAnnotationHighlightsInEmbed')
			.setName(t('setting.no-annotation-highlights-in-embed', 'Don\'t highlight annotations in annotation embeds'));
		this.addToggleSetting('persistentTextHighlightsInEmbed')
			.setName(t('setting.persistent-text-highlights-in-embed', 'Don\'t clear highlights in text selection embeds'));
		this.addToggleSetting('persistentAnnotationHighlightsInEmbed')
			.setName(t('setting.persistent-annotation-highlights-in-embed', 'Don\'t clear highlights in annotation embeds'));
		this.addToggleSetting('embedUnscrollable')
			.setName(t('setting.embed-unscrollable', 'Make PDF embeds with a page specified unscrollable'))
			.setDesc(t('desc.embed-unscrollable', 'After changing this option, you need to reopen tabs or reload the app.'));


		this.addHeading(t('heading.backlink-view', 'Backlinks pane for PDF files'), 'backlink-view', 'links-coming-in')
			.then((setting) => this.renderMarkdown(
				t('desc.backlink-view', `Improve the built-in [backlinks pane](https://help.obsidian.md/Plugins/Backlinks) for better PDF experience.`),
				setting.descEl
			));
		this.addToggleSetting('filterBacklinksByPageDefault')
			.setName(t('setting.filter-backlinks-by-page-default', 'Filter backlinks by page by default'))
			.setDesc(t('desc.filter-backlinks-by-page-default', 'You can toggle this on and off with the "Show only backlinks in the current page" button at the top right of the backlinks pane.'));
		this.addToggleSetting('showBacklinkToPage')
			.setName(t('setting.show-backlink-to-page', 'Show backlinks to the entire page'))
			.setDesc(t('desc.show-backlink-to-page', 'If turned off, only backlinks to specific text selections, annotations or locations will be shown when filtering the backlinks page by page.'));
		this.addToggleSetting('highlightBacklinksPane')
			.setName(t('setting.highlight-backlinks-pane', 'Hover sync (PDF viewer → Backlinks pane)'))
			.setDesc(t('desc.highlight-backlinks-pane', 'Hovering your mouse over highlighted text or annotation will also highlight the corresponding item in the backlink pane.'));
		this.addToggleSetting('highlightOnHoverBacklinkPane')
			.setName(t('setting.highlight-on-hover-backlink-pane', 'Hover sync (Backlinks pane → PDF viewer)'))
			.setDesc(t('desc.highlight-on-hover-backlink-pane', 'In the backlinks pane, hover your mouse over an backlink item to highlight the corresponding text or annotation in the PDF viewer. This option requires reopening or switching tabs to take effect.'));
		if (this.plugin.settings.highlightOnHoverBacklinkPane) {
			this.addDropdownSetting(
				'backlinkHoverColor',
				['', ...Object.keys(this.plugin.settings.colors)],
				(option) => option || 'PDF++ default',
				() => this.plugin.loadStyle()
			)
				.setName(t('setting.backlink-hover-color', 'Highlight color for hover sync (Backlinks pane → PDF viewer)'))
				.setDesc(t('desc.backlink-hover-color', 'To add a new color, click the "+" button in the "highlight colors" setting above.'));
		}


		this.addHeading(t('heading.search-link', 'Search from links'), 'search-link', 'lucide-search')
			.then((setting) => {
				this.renderMarkdown([
					t('desc.search-link', 'You can trigger full-text search by opening a link to a PDF file with a search query appended, e.g. `[[file.pdf#search=keyword]]`.'),
				], setting.descEl);
			});
		this.addHeading(t('heading.search-option', 'Search options'), 'search-option')
			.then((setting) => {
				this.renderMarkdown([
					t('desc.search-option-intro', 'The behavior of the search links can be customized globally by the following settings. '),
					t('desc.search-option-alt', 'Alternatively, you can specify the behavior for each link by including the following query parameters in the link text: '),
					'',
					'- `&case-sensitive=true` or `&case-sensitive=false`',
					'- `&highlight-all=true` or `&highlight-all=false`',
					'- `&match-diacritics=true` or `&match-diacritics=false`',
					'- `&entire-word=true` or `&entire-word=false`',
				], setting.descEl);
			});
		const searchLinkDisplays = {
			'true': t('option.yes', 'Yes'),
			'false': t('option.no', 'No'),
			'default': t('option.follow-default-setting', 'Follow default setting'),
		};
		this.addDropdownSetting('searchLinkCaseSensitive', searchLinkDisplays)
			.setName(t('setting.search-link-case-sensitive', 'Case sensitive search'));
		this.addDropdownSetting('searchLinkHighlightAll', searchLinkDisplays)
			.setName(t('setting.search-link-highlight-all', 'Highlight all search results'));
		this.addDropdownSetting('searchLinkMatchDiacritics', searchLinkDisplays)
			.setName(t('setting.search-link-match-diacritics', 'Match diacritics'));
		this.addDropdownSetting('searchLinkEntireWord', searchLinkDisplays)
			.setName(t('setting.search-link-entire-word', 'Match whole word'));


		this.addHeading(t('heading.external-app', 'Integration with external apps (desktop-only)'), 'external-app', 'lucide-share');
		this.addToggleSetting('openPDFWithDefaultApp', () => this.redisplay())
			.setName(t('setting.open-pdf-with-default-app', 'Open PDF links with an external app'))
			.setDesc(t('desc.open-pdf-with-default-app', 'Open PDF links with the OS-defined default application for PDF files.'));
		if (this.plugin.settings.openPDFWithDefaultApp) {
			this.addToggleSetting('openPDFWithDefaultAppAndObsidian')
				.setName(t('setting.open-pdf-with-default-app-and-obsidian', 'Open PDF links in Obsidian as well'))
				.setDesc(t('desc.open-pdf-with-default-app-and-obsidian', 'Open the same PDF file both in the default app and Obsidian at the same time.'));
		}
		this.addToggleSetting('syncWithDefaultApp')
			.setName(t('setting.sync-with-default-app', 'Sync the external app with Obsidian'))
			.setDesc(t('desc.sync-with-default-app', 'When you focus on a PDF file in Obsidian, the external app will also focus on the same file.'));
		this.addToggleSetting('focusObsidianAfterOpenPDFWithDefaultApp')
			.setName(t('setting.focus-obsidian-after-open-pdf-with-default-app', 'Focus Obsidian after opening a PDF file with an external app'))
			.setDesc(t('desc.focus-obsidian-after-open-pdf-with-default-app', 'Otherwise, the focus will be moved to the external app.'));


		this.addHeading(t('heading.view-sync', 'View Sync'), 'view-sync', 'lucide-eye')
			.then((setting) => {
				this.renderMarkdown([
					t('desc.view-sync', 'Integrate more seamlessly with the [View Sync](https://github.com/RyotaUshio/obsidian-view-sync) plugin.')
				], setting.descEl);
			});
		this.addToggleSetting('viewSyncFollowPageNumber', () => this.redisplay())
			.setName(t('setting.view-sync-follow-page-number', 'Sync page number'));
		if (this.plugin.settings.viewSyncFollowPageNumber) {
			this.addSliderSetting('viewSyncPageDebounceInterval', 0.1, 1, 0.05)
				.setName(t('setting.view-sync-page-debounce-interval', 'Minimum update interval of the View Sync file (sec)'));
		}


		this.addHeading(t('heading.dummy', 'Dummy PDFs for external files'), 'dummy', 'lucide-file-symlink')
			.then((setting) => {
				this.renderMarkdown([
					t('desc.dummy', 'Using dummy PDF files,  you can seamlessly integrate PDF files located outside your vault as if they were inside. Note that this is an experimental feature.'),
					t('desc.dummy-learn', '[Learn more](https://ryotaushio.github.io/obsidian-pdf-plus/external-pdf-files.html)')
				], setting.descEl);
			});
		this.addAttachmentLocationSetting('dummyFileFolderPath', 'Dummy PDFs', (locationSetting, folderPathSetting, subfolderSetting) => {
			locationSetting
				.setName(t('setting.dummy-file-default-location', 'Default location for new dummy PDF files'))
				.setDesc(t('desc.dummy-file-folder-location', `Where newly created dummy PDF files are placed. If set to "${NEW_ATTACHMENT_LOCATIONS.obsidian}", dummy files will be saved in the folder specified in Obsidian settings > Files and links > Default location for new attachments.`));
			folderPathSetting
				.setName(t('setting.dummy-file-folder-path', 'Dummy file folder path'))
				.setDesc(t('desc.dummy-file-folder-path', 'Place newly created dummy PDF files in this folder.'));
			subfolderSetting
				.setName(t('setting.dummy-file-subfolder-name', 'Subfolder name'))
				.setDesc(t('desc.dummy-file-subfolder-name', 'If your file is under "vault/folder", and you set subfolder name to "attachments", dummy PDF files will be saved to "vault/folder/attachments".'));
		});
		this.addSetting('modifierToDropExternalPDFToCreateDummy')
			.setName(t('setting.modifier-to-drop-external-pdf-to-create-dummy', 'Modifier key to create a dummy PDF file on drag & drop'))
			.setDesc(t('desc.modifier-to-drop-external-pdf', 'After dragging an external PDF file, drop it on the editor while pressing this modifier key to create a dummy file and insert a link to it. You can drag a URL to a PDF file on the web from within your browser (link, URL bar, bookmark, etc.) or a PDF file on your desktop machine from your file manager (' + (Platform.isMacOS ? 'Finder' : 'File Explorer') + ' etc.). Note that on mobile, you might need to start pressing the modifier key before starting the drag operation.', { finder: Platform.isMacOS ? 'Finder' : 'File Explorer' }))
			.addDropdown((dropdown) => {
				const altOrCtrl = (Platform.isMacOS || Platform.isIosApp) ? 'Alt' : 'Ctrl';
				for (const keys of [[], ['Shift'], [altOrCtrl], [altOrCtrl, 'Shift']]) {
					dropdown.addOption(
						keys.join('+'),
						keys.length
							? (keys as Modifier[]).map(getModifierNameInPlatform).join('+')
							: 'None'
					);
				}
				dropdown
					.setValue(this.plugin.settings.modifierToDropExternalPDFToCreateDummy.join('+'))
					.onChange(async (value) => {
						this.plugin.settings.modifierToDropExternalPDFToCreateDummy = value.split('+') as Modifier[];
						await this.plugin.saveSettings();
					});
			});

		this.addSetting('externalURIPatterns')
			.setName(t('setting.external-uri-patterns', 'URI patterns for PDF files'))
			.setDesc(t('desc.external-uri-patterns', 'Specify the URI pattens for PDFs in regular expressions. When dragging and dropping a URI/URL from your browser to Obsidian\'s editor, it will be used to check if the destination file is a PDF file. If you need multiple patterns, separate them with a new line.'))
			.addTextArea((text) => {
				text.inputEl.rows = 8;
				text.inputEl.cols = 30;

				text.setValue(this.plugin.settings.externalURIPatterns.join('\n'));

				this.component.registerDomEvent(text.inputEl, 'focusout', async () => {
					const value = text.inputEl.value;
					this.plugin.settings.externalURIPatterns = value.split('\n').map((line) => line.trim()).filter((line) => line);
					await this.plugin.saveSettings();
				});
			});


		this.addHeading(t('heading.vim', 'Vim keybindings'), 'vim', 'vim')
			.then((setting) =>
				this.renderMarkdown(
					t('desc.vim', 'Tracked at [this GitHub issue](https://github.com/RyotaUshio/obsidian-pdf-plus/issues/119).'),
					setting.descEl
				)
			);

		this.addSetting()
			.then((setting) => {
				const copyCommandName = this.plugin.lib.commands.stripCommandNamePrefix(this.plugin.lib.commands.getCommand('copy-link-to-selection').name);
				this.renderMarkdown(
					t('desc.vim-default-keybindings', [
						'The default keybindings are as follows. You can customize them be creating a "vimrc" file and providing its path in the setting below.',
						'',
						'- `j`/`k`/`h`/`l`: Scroll down/up/left/right',
						'- `J`: Go to next page',
						'- `K`: Go to previous page',
						'- `gg`: Go to first page',
						'- `G`: Go to last page',
						'- `0`/`^`/`H`: Go to top of current page',
						'- `$`/`L`: Go to bottom of current page',
						'- `<C-f>`/`<C-b>`: Scroll down/up as much as the viewer height (`C`=`Ctrl`)',
						'- `<C-d>`/`<C-u>`: Scroll down/up half as much as the viewer height',
						'- `/`/`?`: Search forward/backward',
						'- `n`/`N`: Go to next/previous match',
						'- `gn`/`gN`: Select search result',
						'- `+`/`zi`: Zoom in',
						'- `-`/`zo`: Zoom out',
						'- `=`/`z0`: Reset zoom',
						'- `r`: Rotate pages clockwise',
						'- `R`: Rotate pages counterclockwise',
						'- `y`: Yank (copy) selected text',
						'- `c`: Run the "{commandName}" command',
						'- `C`: Show context menu at text selection',
						'- `o`: Swap the start and end of the selection',
						'- `:`: Enter command-line mode (experimental)',
						'- `<Tab>`: Toggle outline (table of contents)',
						'- `<S-Tab>`: Toggle thumbnails (`S`=`Shift`)',
						'- `f`: Enter hint mode by running `:hint` (experimental)',
						'- `<Esc>`: Go back to normal mode, abort search, etc',
						'',
						'Many of the commands above can be combined with counts. For example:',
						'- `2j` scrolls down the page twice as much as `j`.',
						'- `2J` advances two pages.',
						'- `10G` takes you to page 10.',
						'- `150=` sets the zoom level to 150%.'
					].join('\n'), { commandName: copyCommandName })
					.split('\n'),
					setting.descEl
				);
			});
		this.addToggleSetting('vim', () => this.events.trigger('update'))
			.setName(t('setting.vim-enable', 'Enable'))
			.setDesc(t('desc.vim-enable', 'Reopen the PDF viewers after changing this option.'));
		this.showConditionally([
			this.addTextSetting('vimrcPath', undefined, () => this.plugin.vimrc = null)
				.setName(t('setting.vimrc-path', 'Vimrc file path (optional)'))
				.then(async (setting) => {
					await this.renderMarkdown(
						t('desc.vimrc-path', [
							'Only the [Ex commands supported by PDF++](https://github.com/RyotaUshio/obsidian-pdf-plus/blob/main/src/vim/ex-commands.ts) are allowed.',
							'',
							'Example (not necessarily recommendations):',
							'```',
							'" Use j/k, instead of J/K, to go to the next page',
							'map j J',
							'map k K',
							'',
							'" JavaScript commands',
							'" - Hit Ctrl-h in Normal mode to show a message',
							'nmap <C-h> :js alert("Hello, world!")',
							'" - Hit Ctrl-h in Visual mode to run a .js file',
							'vmap <C-h> :jsfile filename.js',
							'',
							'" Obsidian commands',
							'" - Open the current PDF in the OS-default app by hitting d, e, and then f',
							'map def :obcommand open-with-default-app:open',
							'" - Go back and forth the history with Ctrl-o and Ctrl-i',
							'map <C-o> :obcommand app:go-back',
							'map <C-i> :obcommand app:go-forward',
							'```',
							'',
							'After changing the path or the file content, you need to reopen the PDF viewer. If the vimrc file is a hidden file or is under a hidden folder, you need to reload PDF++ or the app.',
						].join('\n'))
						.split('\n'),
						setting.descEl
					);

					const inputEl = (setting.components[0] as TextComponent).inputEl;
					new FuzzyFileSuggest(this.app, inputEl)
						.onSelect(({ item: file }) => {
							this.plugin.settings.vimrcPath = file.path;
							this.plugin.saveSettings();
						});
				}),
			this.addHeading(t('heading.vim-visual', 'Visual mode'), 'vim-visual'),
			this.addToggleSetting('vimVisualMotion')
				.setName(t('setting.vim-visual-motion', 'Use motion keys to adjust text selection'))
				.then((setting) => {
					this.renderMarkdown(
						t('desc.vim-visual-motion', [
							'When some text is selected, you can modify the range of selection using the `j,` `k`, `h`, `l`, `w`, `e`, `b`, `0`, `^`, `$`, `H`, and `L` keys, similarly to Vim\'s visual mode (`H`/`L` are mapped to `^`/`$` by default). If disabled, you can use `j`/`k`/`h`/`l`/`0`/`^`/`$`/`H`/`L` keys to scroll the page regardless of text selection. Reload the viewer or the app after changing this option.',
							'',
							'Tips:',
							'- You can use `o` to swap the start and end of the selection.',
							'- As you know, `/` and `?` keys initiate search. Pressing `gn`/`gN` after the search will select the search result. You can also use search to extend the current selection to the search result.',
							'',
							'Note: On mobile, word-wise motions (`w`/`e`/`b`) might not work as expected around punctuations. Contributions to fix this are welcome!',
						].join('\n'))
						.split('\n'),
						setting.descEl
					);
				}),
			this.addHeading(t('heading.vim-outline', 'Outline mode'), 'vim-outline'),
			this.addToggleSetting('enableVimOutlineMode')
				.setName(t('setting.enable-vim-outline-mode', 'Enter outline mode when opening PDF outline view'))
				.then((setting) => {
					this.renderMarkdown(
						t('desc.enable-vim-outline-mode', [
							'If enabled, you will enter the outline mode by opening the PDF outline view (from the icon in the toolbar or by `<Tab>`), and you can use the following keybindings, similarly to [Zathura](https://pwmt.org/projects/zathura/)\'s index mode.',
							'',
							'- `j`: Move down',
							'- `k`: Move up',
							'- `h`: Collapse & move to parent entry',
							'- `l`: Expand entry & move to child entry',
							'- `H`: Collapse all entries',
							'- `L`: Expand all entries',
							'- `<CR>/<Space>`: Open the selected entry (`<CR>`=`Enter`)',
							'- `<Esc>`: Close sidebar and go back to normal mode',
							'',
							'If disabled, you can use j/k/h/l/H/L keys to scroll the page whether the outline view is opened or not. ',
							'This option requires reload to take effect.'
						].join('\n'))
						.split('\n'),
						setting.descEl
					);
				}),
			this.addToggleSetting('vimSmoothOutlineMode')
				.setName(t('setting.vim-smooth-outline-mode', 'Smooth motion in outline mode')),
			this.addHeading(t('heading.vim-command-line', 'Command-line mode (experimental)'), 'vim-command-line'),
			this.addSetting()
				.then((setting) => {
					this.renderMarkdown(
						t('desc.vim-command-line', [
							'By pressing `:`, you can enter the command-line mode, where you can execute various commands called "Ex commands"',
							'',
							'- You can always go back to normal mode by `<Esc>`.',
							'- For some commands, you can run `:help :<command>` or `:h :<command>` to see the help message.',
							'- Use `<Tab>` and `<S-Tab>` to navigate through the suggestions (`S`=`Shift`).',
							'- Use arrow down/up keys to go back and forth the command history.',
							'- `<C-u>` clears the command line, and `<C-w>` deletes the last word (`C`=`Ctrl`).',
							'- `:<page number>` will take you to the <page number>-th page, where the page number always starts from 1. To go to the page with the page label <page label> (e.g. "i, ii, ..., x, 1, 2, ..."), use `:gotopage <page label>` (or `:go <page label>`/`:goto <page label>` in short).',
							'- `:!<command>` runs the shell command (not supported on mobile). By default, Obsidian does not know the value of the "PATH" environment variable, so you might need to explicitly provide it in the setting below (in the "Misc" section) to run some commands.',
						].join('\n'))
						.split('\n'),
						setting.descEl
					);
				}),
			this.addHeading(t('heading.vim-hint', 'Hint mode (experimental)'), 'vim-hint'),
			this.addSetting()
				.then((setting) => {
					this.renderMarkdown(
						t('desc.vim-hint', [
							'Hitting `f` will enter the hint mode, where you can perform certain actions on links, annotations, and backlink highlighting in the PDF page without using the mouse.',
							'For example, first press `f` to enter the hint mode, and if the link you want to open gets marked with "HK", then hit `h` and then `k` (without `Shift`) to open it.',
							'',
							'This is inspired by [Tridactyl](https://github.com/tridactyl/tridactyl)\'s hint mode.',
							'',
							'Also check out Style Settings > PDF++ > Vim keybindings > Hint mode.'
						].join('\n'))
						.split('\n'),
						setting.descEl
					);
				}),
			this.addTextSetting('vimHintChars')
				.setName(t('setting.vim-hint-chars', 'Characters to use in hint mode'))
				.setDesc(t('desc.vim-hint-chars', 'They are used preferentially from left to right, so you might want to put the easier-to-reach keys first. This is the same as Tridactyl\'s "hintchars" option.')),
			this.addTextSetting('vimHintArgs')
				.setName(t('setting.vim-hint-args', 'Default arguments for the ":hint" Ex command'))
				.setDesc(t('desc.vim-hint-args', 'Space-separated list of "link"/"annot"/"backlink" or "all". Run ":help :hint" for the details.')),
			this.addHeading(t('heading.vim-context-menu', 'Context menu'), 'vim-context-menu'),
			this.addToggleSetting('enableVimInContextMenu')
				.setName(t('setting.enable-vim-in-context-menu', 'Enable Vim keys in PDF context menus'))
				.setDesc(t('desc.enable-vim-in-context-menu', 'If enabled, you can use j/k/h/l keys, instead of the arrow keys, to navigate through context menu items in the PDF viewer.')),
			this.addHeading(t('heading.vim-scroll', 'Scrolling'), 'vim-scroll'),
			this.addSliderSetting('vimScrollSize', 5, 500, 5)
				.setName(t('setting.vim-scroll-size', 'Scroll size (px) of the jkhl keys'))
				.setDesc(t('desc.vim-scroll-size', 'The size of scroll when one of the jkhl keys is pressed once.')),
			this.addToggleSetting('vimLargerScrollSizeWhenZoomIn')
				.setName(t('setting.vim-larger-scroll-size-when-zoom-in', 'Increase scroll size when zoomed in')),
			this.addSliderSetting('vimContinuousScrollSpeed', 0.1, 5, 0.1)
				.setName(t('setting.vim-continuous-scroll-speed', 'Speed of continuous scroll (px per ms)'))
				.setDesc(t('desc.vim-continuous-scroll-speed', 'The speed of scroll when pressing and holding down the jkhl keys.')),
			this.addToggleSetting('vimSmoothScroll')
				.setName(t('setting.vim-smooth-scroll', 'Smooth scroll')),
			this.addHeading(t('heading.vim-search', 'Search'), 'vim-search'),
			this.addToggleSetting('vimHlsearch')
				.setName(t('setting.vim-hlsearch', 'hlsearch'))
				.setDesc(t('desc.vim-hlsearch', 'If enabled, all matches will be highlighted.')),
			this.addToggleSetting('vimIncsearch')
				.setName(t('setting.vim-incsearch', 'incsearch'))
				.setDesc(t('desc.vim-incsearch', 'Incremental search: while typing the search query, update the search results after every keystroke. If disabled, the results will be shown only after pressing Enter.'))
		],
			() => this.plugin.settings.vim
		);


		this.addHeading(t('heading.misc', 'Misc'), 'misc', 'lucide-more-horizontal');
		this.addToggleSetting('autoCheckForUpdates', () => this.plugin.checkForUpdatesIfNeeded())
			.setName(t('setting.auto-check-for-updates', 'Automatically check for updates'))
			.setDesc(t('desc.auto-check-for-updates', 'If enabled, PDF++ will automatically check for updates every 24 hours and notify you if a new version is available.'));
		this.addToggleSetting('fixObsidianTextSelectionBug')
			.setName(t('setting.fix-obsidian-text-selection-bug', `Fix Obsidian 1.9's text selection bug`))
			.then((setting) => {
				this.renderMarkdown(
					t('desc.fix-obsidian-text-selection-bug', [
						`As of June 10, 2025, Obsidian 1.9 has a bug related to PDF text selection that prevents Obsidian from recognizing text selection ranges properly (see [here](https://github.com/RyotaUshio/obsidian-pdf-plus/discussions/450) for more details). `,
						`This option adds a experimental workaround to mitigate the issue.`,
					].join('\n'))
					.split('\n'),
					setting.descEl
				);
			});
		this.addToggleSetting('showStatusInToolbar')
			.setName(t('setting.show-status-in-toolbar', 'Show status in PDF toolbar'))
			.setDesc(t('desc.show-status-in-toolbar', 'For example, when you copy a link to a text selection in a PDF file, the status "Link copied" will be displayed in the PDF toolbar.'));
		this.addFileLocationSetting(
			'newPDFLocation', (setting) => setting
				.setName(t('setting.new-pdf-location', 'Default location for new PDFs'))
				.setDesc(t('desc.new-pdf-location', 'The "Create new PDF" command will create a new PDF file in the location specified here.')),
			'newPDFFolderPath', (setting) => setting
				.setName(t('setting.new-pdf-folder-path', 'Folder to create new PDFs in'))
				.setDesc(t('desc.new-pdf-folder-path', 'Newly created PDFs will appear under this folder.'))
		);
		this.addToggleSetting('hideReplyAnnotation')
			.setName(t('setting.hide-reply-annotation', 'Hide reply annotations'))
			.then((setting) => {
				this.renderMarkdown(
					t('desc.hide-reply-annotation', [
						'Hide annotations that are replies to other annotations in the PDF viewer.',
						'',
						'This is a temporary fix for the issue that PDF.js (the library Obsidian\'s PDF viewer is based on) does not fulfill the PDF specification in that it renders reply annotations as if a standalone annotation.',
					].join('\n'))
					.split('\n'),
					setting.descEl
				);
			});
		this.addToggleSetting('hideStampAnnotation')
			.setName(t('setting.hide-stamp-annotation', 'Disable popups for rubber stamp annotations'))
			.setDesc(t('desc.hide-stamp-annotation', 'A rubber stamp annotation is a type of annotation that displays text or graphics intended to look like a rubber stamp. However, some applications, including iOS/iPadOS\'s "Markup", use this type of annotation also for handwriting. Often, all pieces of handwriting in a single page are grouped into a single rubber stamp annotation, which tends to be so large that it covers the entire page. In this case, annotation popups can be annoying, so you can disable them here.'));
		this.addToggleSetting('removeWhitespaceBetweenCJChars')
			.setName(t('setting.remove-whitespace-between-cj-chars', 'Remove half-width whitespace between two Chinese/Japanese characters when copying text'))
			.setDesc(t('desc.remove-whitespace-between-cj-chars', 'Such whitespace can be introduced as a result of poor post-processing of OCR (optical character recognition). Enable this option to remove it when copying links to text selections.'));
		this.addToggleSetting('copyAsSingleLine')
			.setName(t('setting.copy-as-single-line', 'Override the default copy behavior in the PDF viewer'))
			.then((setting) => {
				const copyCommandName = this.plugin.lib.commands.stripCommandNamePrefix(this.plugin.lib.commands.getCommand('copy-link-to-selection').name);
				setting.descEl.appendText(t('desc.copy-as-single-line', 'If enabled, whenever you copy text from the PDF viewer (using Ctrl/Cmd+C or via context menu), the text will go through the same pre-processing as the "{commandName}" command before written to the clipboard. The pre-processing includes transforming multi-line text into a single line by removing line breaks (if a word is split across lines, it will be concatenated), which is useful because it prevents the copied text from being split into multiple lines unnaturally. If the previous option is enabled, the whitespace removal will also be applied.', { commandName: copyCommandName }));
				setting.descEl.appendText(t('desc.copy-as-single-line-note', ' Also note that on mobile devices, the action performed by "Copy" depends on the '));
				setting.descEl.appendChild(this.createLinkTo('mobileCopyAction'));
				setting.descEl.appendText(t('desc.copy-as-single-line-option', ' option.'));
			});
		if (Platform.isDesktopApp) {
			this.addTextAreaSetting('PATH')
				.then((setting) => {
					const component = setting.components[0];
					if (component instanceof TextAreaComponent) {
						component.inputEl.rows = 8;
						component.inputEl.cols = 30;
					}
				})
				.setName(t('setting.path-env', '"PATH" environment variable'))
				.setDesc(t('desc.path-env', 'Provide the "PATH" environment variable for PDF++ to run shell commands without the full paths specified. In MacOS and Linux, you can run "echo $PATH" in Terminal and then copy & paste the result here. Currently, it will be used only when you run ":!<command>" in Vim mode.'));
		}


		this.addHeading(t('heading.style-settings', 'Style settings'), 'style-settings', 'lucide-settings-2')
			.setDesc(t('desc.style-settings', 'You can find more options in Style Settings > PDF++.'))
			.addButton((button) => {
				button.setButtonText(t('button.open-style-settings', 'Open style settings'))
					.onClick(() => {
						const styleSettingsTab = this.app.setting.pluginTabs.find((tab) => tab.id === 'obsidian-style-settings');
						if (styleSettingsTab) {
							this.app.setting.openTab(styleSettingsTab);
						} else {
							open('obsidian://show-plugin?id=obsidian-style-settings');
						}
					});
			});


		this.addFundingButton();


		await Promise.all(this.promises);
	}

	async hide() {
		this.plugin.settings.colors = Object.fromEntries(
			Object.entries(this.plugin.settings.colors).filter(([name, color]) => name && isHexString(color))
		);
		if (this.plugin.settings.defaultColor && !(this.plugin.settings.defaultColor in this.plugin.settings.colors)) {
			this.plugin.settings.defaultColor = '';
		}
		if (this.plugin.settings.backlinkHoverColor && !(this.plugin.settings.backlinkHoverColor in this.plugin.settings.colors)) {
			this.plugin.settings.backlinkHoverColor = '';
		}

		this.plugin.settings.copyCommands = this.plugin.settings.copyCommands.filter((command) => command.name && command.template);
		this.plugin.settings.displayTextFormats = this.plugin.settings.displayTextFormats.filter((format) => format.name); // allow empty display text formats

		// avoid annotations to be not referneceable
		if (this.plugin.settings.enablePDFEdit && !this.plugin.settings.author) {
			this.plugin.settings.enablePDFEdit = false;
			new Notice(`${this.plugin.manifest.name}: Cannot enable writing highlights into PDF files because the "Annotation author" option is empty.`);
		}

		this.plugin.validateAutoFocusAndAutoPasteSettings();

		await this.plugin.saveSettings();

		this.plugin.loadStyle();

		this.promises = [];
		this.component.unload();
	}
}
