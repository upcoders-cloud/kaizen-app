import {SLASH} from 'constants/constans';

export const navigateBack = (router, fallback = SLASH) => {
	if (!router) return;
	if (router.canGoBack()) {
		router.back();
	} else {
		router.replace(fallback);
	}
};
