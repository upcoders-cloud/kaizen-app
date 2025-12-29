const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64DecodeFallback = (input) => {
	let output = '';
	let buffer = 0;
	let bitsCollected = 0;

	for (let i = 0; i < input.length; i += 1) {
		const ch = input.charAt(i);
		const idx = BASE64_ALPHABET.indexOf(ch);
		if (idx === -1) {
			continue;
		}

		buffer = (buffer << 6) | idx;
		bitsCollected += 6;
		if (bitsCollected >= 8) {
			bitsCollected -= 8;
			output += String.fromCharCode((buffer >> bitsCollected) & 0xff);
		}
	}

	return output;
};

const base64UrlDecode = (input) => {
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const padding = base64.length % 4;
	const padded = padding ? base64 + '='.repeat(4 - padding) : base64;

	if (typeof globalThis.atob === 'function') {
		return globalThis.atob(padded);
	}

	if (typeof globalThis.Buffer !== 'undefined') {
		return globalThis.Buffer.from(padded, 'base64').toString('utf8');
	}

	return base64DecodeFallback(padded);
};

export const getJwtPayload = (token) => {
	if (!token || typeof token !== 'string') {
		return null;
	}

	const parts = token.split('.');
	if (parts.length < 2) {
		return null;
	}

	try {
		const decoded = base64UrlDecode(parts[1]);
		return JSON.parse(decoded);
	} catch (error) {
		return null;
	}
};

export const getAccessTokenExpiration = (token, options = {}) => {
	const { skewMs = 0 } = options;
	const payload = getJwtPayload(token);
	const exp = payload?.exp;

	if (typeof exp !== 'number') {
		return null;
	}

	const expiresAtMs = exp * 1000;
	return Math.max(0, expiresAtMs - skewMs);
};
