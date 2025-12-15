import {SLASH} from 'constants/constans';

export const ensureTrailingSlash = (path) => (path.endsWith(SLASH) ? path : `${path}${SLASH}`);
