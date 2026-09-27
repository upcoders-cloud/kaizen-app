import colors from './colors';

export const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32};
export const radius = {sm: 8, md: 12, lg: 16, xl: 22, pill: 999};
export const typography = {
	caption: {fontSize: 12, lineHeight: 17, fontWeight: '500'},
	body: {fontSize: 14, lineHeight: 21, fontWeight: '400'},
	bodyStrong: {fontSize: 14, lineHeight: 21, fontWeight: '700'},
	subtitle: {fontSize: 16, lineHeight: 23, fontWeight: '700'},
	title: {fontSize: 22, lineHeight: 29, fontWeight: '800'},
	display: {fontSize: 30, lineHeight: 37, fontWeight: '800'},
};
export const shadows = {
	card: {shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: {width: 0, height: 5}, elevation: 2},
	floating: {shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: {width: 0, height: 8}, elevation: 8},
};
export const theme = {colors, spacing, radius, typography, shadows};
export default theme;
