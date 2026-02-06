const EMPTY_STRING = '';
const ACCESS_CODE_COMPACT_LENGTH = 8;
const ACCESS_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const normalizeAccessCode = (rawValue) =>
	String(rawValue ?? EMPTY_STRING)
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, EMPTY_STRING)
		.slice(0, ACCESS_CODE_COMPACT_LENGTH);

export const formatAccessCodeInput = (rawValue) => {
	const normalized = normalizeAccessCode(rawValue);
	if (normalized.length <= 4) {
		return normalized;
	}
	return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

export const isAccessCodeFormatValid = (formattedValue) =>
	ACCESS_CODE_PATTERN.test(String(formattedValue ?? EMPTY_STRING).toUpperCase());
