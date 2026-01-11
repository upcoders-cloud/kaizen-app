import {StyleSheet, View} from 'react-native';
import Text from 'components/Text/Text';

const ExtraImagesBadge = ({count, style, textStyle}) => {
	if (!Number.isFinite(count) || count <= 0) return null;

	return (
		<View style={[styles.badge, style]}>
			<Text style={[styles.text, textStyle]}>+{count}</Text>
		</View>
	);
};

export default ExtraImagesBadge;

const styles = StyleSheet.create({
	badge: {
		position: 'absolute',
		top: 8,
		right: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: 'rgba(15, 23, 42, 0.75)',
	},
	text: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '700',
	},
});
