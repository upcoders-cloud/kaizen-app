import axios from 'axios';
import {API_BASE_URL} from 'src/constants/apiConfig';
import {
	APPLICATION_JSON,
	CONTENT_TYPE,
	DELETE,
	GET,
	PATCH,
	POST,
	PUT,
	REQUEST_FAILED_WITH_STATUS
} from 'src/constants/constans';

class HttpClient {
	constructor(client) {
		this.client = client;
	}

	async request(path, options = {}) {
		const {method = GET, headers, body, params, ...rest} = options;
		try {
			const response = await this.client.request({
				url: path,
				method,
				headers,
				data: body,
				params,
			});
			return response.data;
		} catch (error) {
			const {response} = error || {};
			const message =
				response?.data?.detail ||
				response?.data?.message ||
				response?.statusText ||
				error?.message;
			throw new Error(message || REQUEST_FAILED_WITH_STATUS);
		}
	}

	get(path, options) {
		return this.request(path, {...options, method: GET});
	}

	post(path, body, options) {
		return this.request(path, {...options, method: POST, body});
	}

	put(path, body, options) {
		return this.request(path, {...options, method: PUT, body});
	}

	patch(path, body, options) {
		return this.request(path, {...options, method: PATCH, body});
	}

	delete(path, options) {
		return this.request(path, {...options, method: DELETE});
	}
}

const axiosInstance = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		Accept: APPLICATION_JSON,
		[CONTENT_TYPE]: APPLICATION_JSON,
	},
});

const httpClient = new HttpClient(axiosInstance);

export default httpClient;
