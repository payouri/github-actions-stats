import chalk, { type ForegroundColorName } from "chalk";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const THRESHOLDS_MAP = {
	low: 100,
	medium: 500,
	high: 3000,
	too_high: 5000,
} as const;

const COLOR_MAP: Record<keyof typeof THRESHOLDS_MAP, ForegroundColorName> = {
	low: "green",
	medium: "yellow",
	high: "red",
	too_high: "redBright",
};

const colorize = (ms: number, msString?: string): string => {
	if (ms < THRESHOLDS_MAP.low) {
		return chalk[COLOR_MAP.low](msString || ms);
	}
	if (ms < THRESHOLDS_MAP.medium) {
		return chalk[COLOR_MAP.medium](msString || ms);
	}
	if (ms < THRESHOLDS_MAP.high) {
		return chalk[COLOR_MAP.high](msString || ms);
	}
	return chalk[COLOR_MAP.too_high](msString || ms);
};

export function formatMs(
	ms: number,
	options?: {
		convertToSeconds?: boolean;
		convertToSecondsThreshold?: number;
		decimalCount?: number;
		colorize?: boolean;
	},
): string {
	const {
		convertToSeconds = false,
		convertToSecondsThreshold = 1000,
		decimalCount = 2,
		colorize: colorizeOption = true,
	} = options ?? {};
	const zeros = `.${"0".repeat(decimalCount)}`;

	if (convertToSeconds && ms >= convertToSecondsThreshold) {
		const fixedSeconds = colorizeOption
			? colorize(ms, (ms / 1000).toFixed(decimalCount))
			: (ms / 1000).toFixed(decimalCount);
		return `${fixedSeconds.replace(zeros, "")}s`;
	}

	const fixedMs = colorizeOption
		? colorize(ms, ms.toFixed(decimalCount))
		: ms.toFixed(decimalCount);
	return `${fixedMs.replace(zeros, "")}ms`;
}
