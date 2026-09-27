import {StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import {radius, shadows, spacing} from 'theme/theme';
import PressableScale from './PressableScale';

const Card = ({children, style, onPress, padded = true, elevated = false, ...props}) => {
	const cardStyle = [styles.base, padded && styles.padded, elevated && shadows.card, style];
	if (onPress) return <PressableScale onPress={onPress} style={cardStyle} {...props}>{children}</PressableScale>;
	return <View style={cardStyle} {...props}>{children}</View>;
};
export default Card;
const styles = StyleSheet.create({
	base: {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg},
	padded: {padding: spacing.lg},
});
