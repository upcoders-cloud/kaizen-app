import {StyleSheet, View} from 'react-native';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const PostContent = ({content}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Opis</Text>
			<Text style={styles.content}>{content || 'Brak treści.'}</Text>
			<View style={styles.placeholder}>
				<Text style={styles.placeholderTitle}>Załączone obrazy</Text>
				<Text style={styles.placeholderText}>Wkrótce tutaj pojawi się galeria.</Text>
			</View>
		</View>
	);
};

export default PostContent;

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	content: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.text,
	},
	placeholder: {
		borderWidth: 1,
		borderColor: colors.border,
		borderStyle: 'dashed',
		borderRadius: 12,
		padding: 12,
		backgroundColor: colors.placeholderSurface,
		gap: 4,
	},
	placeholderTitle: {
		fontWeight: '700',
		color: colors.text,
	},
	placeholderText: {
		color: colors.muted,
		fontSize: 13,
	},
});
