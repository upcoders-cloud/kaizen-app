import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';
import {radius, typography} from 'theme/theme';

const VARIANTS = {
	primary: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
		textColor: colors.white,
	},
	secondary: {
		backgroundColor: colors.secondary,
		borderColor: colors.secondary,
		textColor: colors.text,
	},
	outline: {
		backgroundColor: 'transparent',
		borderColor: colors.primary,
		textColor: colors.primary,
	},
	ghost: {
		backgroundColor: 'transparent',
		borderColor: 'transparent',
		textColor: colors.primary,
	},
};

const DISABLED_STYLE = {
	backgroundColor: colors.borderMuted,
	borderColor: colors.border,
	textColor: colors.textSubtle,
};

const Button = ({
	title,
	onPress,
	loading = false,
	disabled = false,
	variant = 'primary',
	leftIcon,
	rightIcon,
	style,
	textStyle,
}) => {
	const variantStyle = VARIANTS[variant] || VARIANTS.primary;
	const isDisabled = disabled || loading;
	const colors = isDisabled ? DISABLED_STYLE : variantStyle;

	return (
		<Pressable
			onPress={onPress}
			disabled={isDisabled}
			style={({pressed}) => [
				styles.base,
				{backgroundColor: colors.backgroundColor, borderColor: colors.borderColor},
				pressed && !isDisabled ? styles.pressed : null,
				style,
			]}
		>
			<View style={styles.content}>
				{loading ? (
					<ActivityIndicator color={colors.textColor} size="small" style={styles.spinner} />
				) : (
					leftIcon
				)}
				<Text style={[styles.text, {color: colors.textColor}, textStyle]} numberOfLines={1}>
					{title}
				</Text>
				{!loading ? rightIcon : null}
			</View>
		</Pressable>
	);
};

export default Button;

const styles = StyleSheet.create({
	base: {
		minHeight: 50,
		paddingHorizontal: 14,
		borderRadius: radius.md,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	text: {
		...typography.subtitle,
	},
	pressed: {
		opacity: 0.85,
	},
	spinner: {
		paddingRight: 4,
	},
});
