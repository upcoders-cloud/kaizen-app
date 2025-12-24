import {NativeModules, Platform} from 'react-native';
import Constants from 'expo-constants';
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

const parseHost = (value) => {
	if (!value) return null;
	const cleaned = value.replace(/^.*:\/\//, '').split('/')[0];
	return cleaned.split(':')[0];
};

const getHostFromScriptUrl = () => {
	const scriptUrl = NativeModules?.SourceCode?.scriptURL;
	console.log('[apiConfig] Script URL:', scriptUrl);
	if (!scriptUrl) return null;
	try {
		return new URL(scriptUrl).hostname;
	} catch (error) {
		return parseHost(scriptUrl);
	}
};

const getHostFromExpo = () => {
	const hostUri =
		Constants.expoConfig?.hostUri ||
		Constants.manifest?.hostUri ||
		Constants.manifest2?.extra?.expoClient?.hostUri ||
		Constants.expoConfig?.extra?.expoClient?.hostUri ||
		Constants.manifest?.debuggerHost ||
		Constants.manifest2?.extra?.expoClient?.debuggerHost ||
		Constants.manifest?.bundleUrl ||
		Constants.expoConfig?.bundleUrl;
	const manifestHost = parseHost(hostUri);
	return manifestHost || getHostFromScriptUrl();
};

const getPlatformBaseUrl = (expoHost) => {
	if (Platform.OS === PLATFORM_ANDROID) {
		if (expoHost) {
			return buildUrl(expoHost);
		}
		return buildUrl(HOST_ANDROID_EMULATOR);
	}
	if (Platform.OS === PLATFORM_IOS) {
		if (expoHost) {
			return buildUrl(expoHost);
		}
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
	const expoHost = getHostFromExpo();
	console.log('[apiConfig] EXPO_PUBLIC_API_BASE_URL:', envBaseUrl);
	console.log('[apiConfig] Expo host:', expoHost);
	if (envBaseUrl) {
		try {
			const parsed = new URL(envBaseUrl);
			if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && expoHost) {
				return buildUrl(expoHost);
			}
		} catch (error) {
			// fall through to computed base URL
		}
		return envBaseUrl;
	}
	return getPlatformBaseUrl(expoHost);
};

export const API_BASE_URL = getBaseUrl();
console.log('[apiConfig] API_BASE_URL:', API_BASE_URL);
