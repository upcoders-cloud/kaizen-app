import {Image, Modal, Pressable, StyleSheet, View} from 'react-native';
import {useMemo, useState} from 'react';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const PostContent = ({content, images = []}) => {
	const [previewUri, setPreviewUri] = useState(null);
	const validImages = useMemo(
		() => (Array.isArray(images) ? images.filter(Boolean) : []),
		[images]
	);
	const closePreview = () => setPreviewUri(null);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Opis</Text>
			<Text style={styles.content}>{content || 'Brak treści.'}</Text>
			<View style={styles.attachments}>
				<Text style={styles.attachmentsTitle}>Załączone obrazy</Text>
				{validImages.length === 0 ? (
					<Text style={styles.placeholderText}>Brak załączników.</Text>
				) : (
					<View style={styles.gallery}>
						{validImages.map((uri, index) => (
							<Pressable
								key={`${uri}-${index}`}
								style={styles.thumbWrapper}
								onPress={() => setPreviewUri(uri)}
							>
								<Image source={{uri}} style={styles.thumb} />
							</Pressable>
						))}
					</View>
				)}
			</View>
			<Modal
				transparent
				visible={Boolean(previewUri)}
				animationType="fade"
				onRequestClose={closePreview}
			>
				<Pressable style={styles.previewOverlay} onPress={closePreview}>
					<View style={styles.previewCard} pointerEvents="box-none">
						{previewUri ? (
							<Image source={{uri: previewUri}} style={styles.previewImage} resizeMode="contain" />
						) : null}
					</View>
				</Pressable>
			</Modal>
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
	attachments: {
		gap: 8,
	},
	attachmentsTitle: {
		fontWeight: '700',
		color: colors.text,
	},
	placeholderText: {
		color: colors.muted,
		fontSize: 13,
	},
	gallery: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	thumbWrapper: {
		width: 90,
		height: 90,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	thumb: {
		width: '100%',
		height: '100%',
	},
	previewOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.65)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	previewCard: {
		width: '92%',
		height: '82%',
	},
	previewImage: {
		flex: 1,
		borderRadius: 14,
	},
});
