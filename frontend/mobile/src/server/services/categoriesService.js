import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/categories');

const categoriesService = {
	list(params) {
		const options = withAuthHeaders({params});
		return httpClient.get(basePath, options);
	},
};

export default categoriesService;
