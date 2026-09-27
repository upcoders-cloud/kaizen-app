import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/gamification');

const gamificationService = {
	me() {
		return httpClient.get(`${basePath}me/`, withAuthHeaders());
	},
	leaderboard({scope = 'users', period = 'all', limit = 20, department} = {}) {
		return httpClient.get(`${basePath}leaderboard/`, withAuthHeaders({params: {scope, period, limit, department}}));
	},
	badges() {
		return httpClient.get(`${basePath}badges/`, withAuthHeaders());
	},
	user(userId) {
		return httpClient.get(`${basePath}users/${userId}/`, withAuthHeaders());
	},
	rewards() {
		return httpClient.get(`${basePath}rewards/`, withAuthHeaders());
	},
	myRedemptions() {
		return httpClient.get(`${basePath}rewards/my-redemptions/`, withAuthHeaders());
	},
	redeem(rewardId) {
		return httpClient.post(`${basePath}rewards/${rewardId}/redeem/`, undefined, withAuthHeaders());
	},
	transactions() {
		return httpClient.get(`${basePath}transactions/`, withAuthHeaders());
	},
};

export default gamificationService;
