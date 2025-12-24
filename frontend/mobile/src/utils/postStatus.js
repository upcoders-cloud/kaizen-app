const STATUS_MAP = {
	TO_VERIFY: {
		label: 'Do weryfikacji',
		color: '#92400e',
		backgroundColor: '#fef3c7',
	},
	SUBMITTED: {
		label: 'Zgłoszony',
		color: '#1d4ed8',
		backgroundColor: '#dbeafe',
	},
	IN_PROGRESS: {
		label: 'W trakcie wdrożenia',
		color: '#0f5132',
		backgroundColor: '#d1e7dd',
	},
	IMPLEMENTED: {
		label: 'Wdrożone',
		color: '#065f46',
		backgroundColor: '#d1fae5',
	},
};

export const getPostStatusMeta = (status) =>
	STATUS_MAP[status] || {
		label: status || 'Do weryfikacji',
		color: '#374151',
		backgroundColor: '#e5e7eb',
	};
