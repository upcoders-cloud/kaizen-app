import {getItem} from 'store/storage';
import {AUTH_BEARER_PREFIX, MMKV_AUTH_KEY} from 'constants/constans';

export const withAuthHeaders = (options = {}) => {
	const authData = getItem(MMKV_AUTH_KEY);
	const token = authData?.accessToken;
	if (!token) {
		return options;
	}
	return {
		...options,
		headers: {
			...(options.headers || {}),
			Authorization: `${AUTH_BEARER_PREFIX} ${token}`,
		},
	};
};
