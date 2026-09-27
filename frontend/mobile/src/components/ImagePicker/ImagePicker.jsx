import {useCallback, useMemo, useState} from 'react';
import {Alert, Image, Modal, Platform, Pressable, StyleSheet, View} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import {Feather} from '@expo/vector-icons';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {radius, spacing} from 'theme/theme';
import {Chip} from 'components/ui';
import {EXPO_IMAGE_PICKER_STATUS_GRANTED} from "constants/constans";

const MAX_DEFAULT = 5;
const IMAGE_TYPES = [
	{value: 'GENERAL', label: 'Załącznik'},
	{value: 'BEFORE', label: 'Przed'},
	{value: 'AFTER', label: 'Po'},
];

const ImagePicker = ({value = [], onChange, maxCount = MAX_DEFAULT}) => {
	const remaining = Math.max(0, maxCount - value.length);
	const [previewId, setPreviewId] = useState(null);

	const requestLibraryPermission = useCallback(async () => {
		const {status} = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== EXPO_IMAGE_PICKER_STATUS_GRANTED) {
			Alert.alert('Brak dostępu', 'Zezwól na dostęp do zdjęć w ustawieniach urządzenia.');
			return false;
		}
		return true;
	}, []);

	const requestCameraPermission = useCallback(async () => {
		const {status} = await ExpoImagePicker.requestCameraPermissionsAsync();
		if (status !== EXPO_IMAGE_PICKER_STATUS_GRANTED) {
			Alert.alert('Brak dostępu', 'Zezwól na dostęp do aparatu w ustawieniach urządzenia.');
			return false;
		}
		return true;
	}, []);

	const normalizeAssets = (assets = []) =>
		assets
			.filter((asset) => asset?.uri)
			.map((asset, index) => ({
				id: asset.assetId || asset.fileName || asset.uri || `${Date.now()}-${index}`,
				uri: asset.uri,
				width: asset.width,
				height: asset.height,
				fileName: asset.fileName,
				mimeType: asset.mimeType || asset.type || 'image',
				fileSize: asset.fileSize,
				base64: asset.base64,
				type: 'GENERAL',
			}));

	const addImages = useCallback(
		(assets) => {
			if (!onChange) return;
			const normalized = normalizeAssets(assets);
			const ids = new Set(value.map((item) => String(item.id)));
			const unique = normalized.filter((item) => !ids.has(String(item.id)));
			const next = [...value, ...unique].slice(0, maxCount);
			onChange(next);
		},
		[value, maxCount, onChange]
	);

	const handlePickFromLibrary = useCallback(async () => {
		if (remaining <= 0) {
			Alert.alert('Limit zdjęć', `Możesz dodać maksymalnie ${maxCount} zdjęć.`);
			return;
		}
		if (!(await requestLibraryPermission())) return;

		const result = await ExpoImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: false,
			allowsMultipleSelection: true,
			selectionLimit: remaining,
			quality: 0.85,
			base64: true,
		});
		if (result?.canceled) return;
		const assets = result?.assets || [];
		addImages(assets);
	}, [addImages, maxCount, remaining, requestLibraryPermission]);

	const handleCapture = useCallback(async () => {
		if (remaining <= 0) {
			Alert.alert('Limit zdjęć', `Możesz dodać maksymalnie ${maxCount} zdjęć.`);
			return;
		}
		if (!(await requestCameraPermission())) return;

		const result = await ExpoImagePicker.launchCameraAsync({
			mediaTypes: ['images'],
			allowsEditing: false,
			quality: 0.85,
			base64: true,
		});

		if (result?.canceled) return;
		const assets = result?.assets || (result?.uri ? [result] : []);
		addImages(assets);
	}, [addImages, maxCount, remaining, requestCameraPermission]);

	const handleRemove = useCallback(
		(targetId) => {
			if (!onChange) return;
			onChange(value.filter((item) => item.id !== targetId));
		},
		[onChange, value]
	);

	const handleTypeChange = useCallback((targetId, type) => {
		if (!onChange) return;
		onChange(value.map((item) => item.id === targetId ? {...item, type} : item));
	}, [onChange, value]);

	const previewImage = useMemo(() => value.find((item) => item.id === previewId), [previewId, value]);
	const closePreview = () => setPreviewId(null);

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<Text style={styles.label}>Zdjęcia</Text>
				<Text style={styles.counter}>{value.length}/{maxCount}</Text>
			</View>
			<View style={styles.actions}>
				<Button
					title="Z galerii"
					variant="outline"
					onPress={handlePickFromLibrary}
					leftIcon={<Feather name="image" size={16} color={colors.primary} />}
					style={styles.actionButton}
				/>
				<Button
					title="Aparat"
					variant="outline"
					onPress={handleCapture}
					leftIcon={<Feather name="camera" size={16} color={colors.primary} />}
					style={styles.actionButton}
				/>
			</View>
			{value.length === 0 ? (
				<View style={styles.placeholder}>
					<Text style={styles.placeholderText}>
						Wybierz zdjęcia z galerii lub zrób nowe aparatem.
					</Text>
					{Platform.OS === 'android' ? (
						<Text style={styles.hint}>Na starszych urządzeniach Android wybór wielu zdjęć może być ograniczony.</Text>
					) : null}
				</View>
			) : (
				<View style={styles.previewGrid}>
					{value.map((item) => (
						<View key={item.id} style={styles.imageItem}>
							<Pressable style={styles.thumbWrapper} onPress={() => setPreviewId(item.id)} accessibilityRole="button" accessibilityLabel="Podgląd zdjęcia">
								<Image source={{uri: item.uri}} style={styles.thumb} />
								<Pressable
									style={styles.removeBadge}
									accessibilityRole="button"
									accessibilityLabel="Usuń zdjęcie"
									onPress={(e) => {
										e?.stopPropagation?.();
										handleRemove(item.id);
									}}
								>
									<Feather name="x" size={14} color={colors.surface} />
								</Pressable>
							</Pressable>
							<View style={styles.typeColumn}>
								<Text style={styles.typeLabel}>Typ zdjęcia</Text>
								<View style={styles.typeOptions}>
									{IMAGE_TYPES.map((option) => (
										<Chip
											key={option.value}
											label={option.label}
											selected={(item.type || (item.isExisting ? null : 'GENERAL')) === option.value}
											onPress={item.isExisting ? undefined : () => handleTypeChange(item.id, option.value)}
											accessibilityLabel={`Typ zdjęcia: ${option.label}`}
										/>
									))}
								</View>
								{item.isExisting ? <Text style={styles.savedHint}>Zapisane zdjęcie</Text> : null}
							</View>
						</View>
					))}
				</View>
			)}
			<Modal
				transparent
				visible={Boolean(previewId && previewImage)}
				animationType="fade"
				onRequestClose={closePreview}
			>
				<Pressable style={styles.previewOverlay} onPress={closePreview}>
					<View style={styles.previewCard} pointerEvents="box-none">
						{previewImage ? (
							<Image source={{uri: previewImage.uri}} style={styles.previewImage} resizeMode="contain" />
						) : null}
						<Pressable style={styles.previewClose} onPress={closePreview}>
							<Feather name="x" size={18} color={colors.surface} />
						</Pressable>
					</View>
				</Pressable>
			</Modal>
		</View>
	);
};

export default ImagePicker;

const styles = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		padding: spacing.md,
		backgroundColor: colors.surfaceAlt,
		gap: 10,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	label: {
		fontWeight: '700',
		color: colors.text,
	},
	counter: {
		color: colors.muted,
		fontWeight: '600',
	},
	actions: {
		flexDirection: 'row',
		gap: 10,
	},
	actionButton: {
		flex: 1,
		minHeight: 44,
	},
	placeholder: {
		paddingVertical: 6,
	},
	placeholderText: {
		color: colors.muted,
	},
	hint: {
		marginTop: 4,
		color: colors.mutedAlt,
		fontSize: 12,
	},
	previewGrid: {
		gap: spacing.sm,
	},
	imageItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
		padding: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
	},
	typeColumn: {
		flex: 1,
		gap: spacing.sm,
	},
	typeLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.textMuted,
	},
	typeOptions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	savedHint: {
		fontSize: 11,
		color: colors.textMuted,
	},
	thumbWrapper: {
		width: 90,
		height: 90,
		borderRadius: 10,
		overflow: 'hidden',
		position: 'relative',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	thumb: {
		width: '100%',
		height: '100%',
	},
	removeBadge: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(0,0,0,0.55)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	previewOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.65)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	previewCard: {
		width: '90%',
		height: '80%',
		position: 'relative',
	},
	previewImage: {
		flex: 1,
		borderRadius: 14,
	},
	previewClose: {
		position: 'absolute',
		top: 18,
		right: 18,
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(0,0,0,0.55)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
