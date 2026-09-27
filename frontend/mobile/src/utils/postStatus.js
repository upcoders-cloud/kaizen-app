import colors from 'theme/colors';

const STATUS_MAP = {
	TO_VERIFY: {label: 'Do weryfikacji', color: colors.statusTextToVerify, backgroundColor: colors.statusToVerify},
	SUBMITTED: {label: 'Zgłoszony', color: colors.statusTextSubmitted, backgroundColor: colors.statusSubmitted},
	IN_PROGRESS: {label: 'W trakcie wdrożenia', color: colors.statusTextInProgress, backgroundColor: colors.statusInProgress},
	IMPLEMENTED: {label: 'Wdrożone', color: colors.statusTextImplemented, backgroundColor: colors.statusImplemented},
	CANCELLED: {label: 'Odrzucony', color: colors.statusTextCancelled, backgroundColor: colors.statusCancelled},
};

export const getPostStatusMeta = (status) => STATUS_MAP[status] || {
	label: status || 'Do weryfikacji',
	color: colors.textMuted,
	backgroundColor: colors.surfaceAlt,
};
