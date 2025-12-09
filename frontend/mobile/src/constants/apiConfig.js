import {Platform} from 'react-native';
import {
	DEFAULT_PORT,
	HOST_ANDROID_EMULATOR,
	HOST_LOCAL,
	PLATFORM_ANDROID,
	PLATFORM_IOS,
	PLATFORM_WEB,
	PROTOCOL_HTTP,
	UNDEFINED
} from './constans';

const buildUrl = (host) => `${PROTOCOL_HTTP}://${host}:${DEFAULT_PORT}`;

const getPlatformBaseUrl = () => {
	if (Platform.OS === PLATFORM_ANDROID) {
		return buildUrl(HOST_ANDROID_EMULATOR);
	}
	if (Platform.OS === PLATFORM_IOS) {
		return buildUrl(HOST_LOCAL);
	}
	if (Platform.OS === PLATFORM_WEB) {
		if (typeof window !== UNDEFINED && window.location?.hostname) {
			return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
		}
		return buildUrl(HOST_LOCAL);
	}
	return buildUrl(HOST_LOCAL);
};

const getBaseUrl = () => {
	const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
	if (envBaseUrl) {
		return envBaseUrl;
	}
	return getPlatformBaseUrl();
};

export const API_BASE_URL = getBaseUrl();
