import {Platform} from 'react-native';
import {
	DEFAULT_PORT,
	HOST_ANDROID_EMULATOR,
	HOST_LOCAL,
	PLATFORM_ANDROID,
	PLATFORM_IOS,
	PLATFORM_WEB,
	PROTOCOL_HTTP,
} from './constans';

const UNDEFINED = 'undefined'
const buildUrl = (host) => `${PROTOCOL_HTTP}://${host}:${DEFAULT_PORT}`;

const getBaseUrl = () => {
	if (Platform.OS === PLATFORM_ANDROID) {
		return buildUrl(HOST_ANDROID_EMULATOR);
	}

	if (Platform.OS === PLATFORM_IOS) {
		return buildUrl(HOST_LOCAL);
	}

	if (Platform.OS === PLATFORM_WEB) {
		// On web use current host (keeps same LAN/IP when sharing dev server)
		if (typeof window !== UNDEFINED && window.location?.hostname) {
			return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
		}
		return buildUrl(HOST_LOCAL);
	}

	return buildUrl(HOST_LOCAL);
};

export const API_BASE_URL = getBaseUrl();
