import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

const VARIANTS = {
	primary: {
		backgroundColor: '#1d2b64',
		borderColor: '#1d2b64',
		textColor: '#ffffff',
	},
	secondary: {
		backgroundColor: '#36d1dc',
		borderColor: '#36d1dc',
		textColor: '#0f172a',
	},
	outline: {
		backgroundColor: 'transparent',
		borderColor: '#1d2b64',
		textColor: '#1d2b64',
	},
	ghost: {
		backgroundColor: 'transparent',
		borderColor: 'transparent',
		textColor: '#1d2b64',
	},
};

const DISABLED_STYLE = {
	backgroundColor: '#e5e7eb',
	borderColor: '#d1d5db',
	textColor: '#9ca3af',
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
		minHeight: 48,
		paddingHorizontal: 14,
		borderRadius: 12,
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
		fontWeight: '700',
		fontSize: 16,
	},
	pressed: {
		opacity: 0.85,
	},
	spinner: {
		paddingRight: 4,
	},
});
