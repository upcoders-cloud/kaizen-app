const MENTION_REGEX = /@([A-Za-z0-9_-]{2,50})/g;

/**
 * Rozbija tekst na segmenty `[{type: 'text'|'mention', value, nickname?}]`,
 * używane przez UI do renderowania @wzmianek na niebiesko.
 */
export const splitMentions = (text) => {
	if (!text) return [];
	const segments = [];
	let lastIndex = 0;
	const regex = new RegExp(MENTION_REGEX);
	let match;
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({type: 'text', value: text.slice(lastIndex, match.index)});
		}
		segments.push({type: 'mention', value: match[0], nickname: match[1]});
		lastIndex = regex.lastIndex;
	}
	if (lastIndex < text.length) {
		segments.push({type: 'text', value: text.slice(lastIndex)});
	}
	return segments;
};
