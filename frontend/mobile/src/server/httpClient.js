import {API_BASE_URL} from 'src/constants/api';
import {
	APPLICATION_JSON,
	CONTENT_TYPE,
	CONTENT_TYPE_SMALL_C,
	DELETE,
	GET,
	PATCH,
	POST,
	PUT,
	REQUEST_FAILED_WITH_STATUS,
} from '@constants/constans';

const STRING = 'string';

class HttpClient {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	buildUrl(path) {
		const base = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
		return new URL(path, base).toString();
	}

	async request(path, {method = GET, headers, body} = {}) {
		const url = this.buildUrl(path);
		const mergedHeaders = {
			Accept: APPLICATION_JSON,
			[CONTENT_TYPE]: APPLICATION_JSON,
			...headers,
		};

		const options = {method, headers: mergedHeaders};

		if (body !== undefined) {
			options.body = typeof body === STRING ? body : JSON.stringify(body);
		}

		const response = await fetch(url, options);
		const isJson = response.headers.get(CONTENT_TYPE_SMALL_C)?.includes(APPLICATION_JSON);
		const data = isJson ? await response.json() : await response.text();

		if (!response.ok) {
			const message = data?.detail || data?.message || response.statusText;
			throw new Error(message || `${REQUEST_FAILED_WITH_STATUS} ${response.status}`);
		}

		return data;
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

const httpClient = new HttpClient(API_BASE_URL);

export default httpClient;
