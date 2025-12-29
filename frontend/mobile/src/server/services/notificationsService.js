import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/notifications');

const notificationsService = {
	list(params) {
		const options = withAuthHeaders({params});
		return httpClient.get(basePath, options);
	},
	unreadCount() {
		const options = withAuthHeaders();
		return httpClient.get(`${basePath}unread_count/`, options);
	},
	markRead(notificationId) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${notificationId}/mark_read/`, undefined, options);
	},
	markAllRead() {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}mark_all_read/`, undefined, options);
	},
};

export default notificationsService;
