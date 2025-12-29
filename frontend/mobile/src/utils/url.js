import {SLASH} from 'constants/constans';

// Używaj, gdy backend wymaga końcowego "/" na endpointach (np. Django REST); dla API bez trailing slashów pomiń ten helper.
export const ensureTrailingSlash = (path) => (path.endsWith(SLASH) ? path : `${path}${SLASH}`);
