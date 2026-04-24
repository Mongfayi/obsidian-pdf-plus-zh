import { moment } from 'obsidian';

type TranslationParams = Record<string, string | number>;
type TranslationDict = Record<string, string>;

const translations: Record<string, TranslationDict> = {};
let currentLocale = 'en';

function detectLocale(): string {
	const locale = moment.locale();
	if (locale.startsWith('zh')) return 'zh-cn';
	if (locale.startsWith('ja')) return 'ja';
	if (locale.startsWith('ko')) return 'ko';
	return locale;
}

export function initI18n(): void {
	currentLocale = detectLocale();
}

export function registerTranslation(locale: string, dict: TranslationDict): void {
	translations[locale] = dict;
}

export function t(key: string, fallback?: string, params?: TranslationParams): string {
	const dict = translations[currentLocale];
	let text: string | undefined;

	if (dict) {
		text = dict[key];
	}

	if (text === undefined) {
		text = fallback ?? key;
	}

	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
		}
	}

	return text;
}

export function tn(key: string, fallback: string, count: number, params?: TranslationParams): string {
	const actualKey = count === 1 ? `${key}_one` : `${key}_other`;
	return t(actualKey, fallback, { count, ...params });
}

export { currentLocale };
