import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import colors from 'theme/colors';
import postsService from 'src/server/services/postsService';
import categoriesService from 'src/server/services/categoriesService';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import ImagePicker from 'components/ImagePicker/ImagePicker';
import OptionPills from 'components/OptionPills/OptionPills';
import ManagerPicker from 'components/ManagerPicker/ManagerPicker';
import Toast from 'react-native-toast-message';
import {Card} from 'components/ui';
import {radius, shadows, spacing, typography} from 'theme/theme';
import {
	CATEGORY_IS_REQUIRED,
	CONTENT_IS_REQUIRED,
	EMPTY_STRING,
	FAILED_TO_CREATE_POST,
	MANAGER_IS_REQUIRED,
	TITLE_IS_REQUIRED,
} from 'constants/constans';

const STEP_ICONS = [
	{icon: 'file-text'},
	{icon: 'tag'},
	{icon: 'user-check'},
	{icon: 'image'},
];

const CreatePost = ({
	onSubmitSuccess,
	onSubmitFail,
	initialValues,
	postId,
	mode = 'create',
	submitLabel = 'Dodaj zgłoszenie',
}) => {
	const [title, setTitle] = useState(initialValues?.title ?? EMPTY_STRING);
	const [content, setContent] = useState(initialValues?.content ?? EMPTY_STRING);
	const [category, setCategory] = useState(initialValues?.category ?? null);
	const [assignedManager, setAssignedManager] = useState(initialValues?.assigned_manager ?? null);
	const [images, setImages] = useState(initialValues?.images ?? []);
	const [removedImageIds, setRemovedImageIds] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [titleError, setTitleError] = useState(null);
	const [contentError, setContentError] = useState(null);
	const [categoryError, setCategoryError] = useState(null);
	const [managerError, setManagerError] = useState(null);
	const [categories, setCategories] = useState([]);
	const [categoriesLoading, setCategoriesLoading] = useState(false);
	const [categoriesError, setCategoriesError] = useState(null);
	const scrollRef = useRef(null);

	const categoryOptions = useMemo(
		() =>
			categories.map((categoryItem) => ({
				label: categoryItem.name,
				value: categoryItem.id,
			})),
		[categories]
	);

	const resetForm = () => {
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(initialValues?.category ?? null);
		setAssignedManager(initialValues?.assigned_manager ?? null);
		setImages(initialValues?.images ?? []);
		setRemovedImageIds([]);
		setError(null);
		setTitleError(null);
		setContentError(null);
		setCategoryError(null);
		setManagerError(null);
	};

	useFocusEffect(
		useCallback(() => {
			let isActive = true;
			const fetchCategories = async () => {
				setCategoriesLoading(true);
				setCategoriesError(null);
				try {
					const data = await categoriesService.list();
					const resolved = Array.isArray(data) ? data : data?.results ?? [];
					if (!isActive) return;
					setCategories(resolved);
				} catch (err) {
					if (!isActive) return;
					setCategoriesError(err?.message || 'Nie udało się pobrać kategorii');
				} finally {
					if (isActive) {
						setCategoriesLoading(false);
					}
				}
			};

			void fetchCategories();
			return () => {
				isActive = false;
			};
		}, [])
	);

	useEffect(() => {
		if (!initialValues) return;
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(initialValues?.category ?? null);
		setAssignedManager(initialValues?.assigned_manager ?? null);
		setImages(initialValues?.images ?? []);
		setRemovedImageIds([]);
		setTitleError(null);
		setContentError(null);
		setCategoryError(null);
		setManagerError(null);
	}, [initialValues?.title, initialValues?.content, initialValues?.category, initialValues?.assigned_manager]);

	const handleImagesChange = useCallback((nextImages = []) => {
		setImages((prevImages) => {
			const previous = Array.isArray(prevImages) ? prevImages : [];
			const next = Array.isArray(nextImages) ? nextImages : [];
			const removedExistingIds = previous
				.filter((item) => item?.isExisting)
				.filter((item) => !next.some((nextItem) => String(nextItem?.id) === String(item?.id)))
				.map((item) => Number(item.id))
				.filter((id) => Number.isFinite(id));

			if (removedExistingIds.length) {
				setRemovedImageIds((current) => {
					const merged = new Set(current.map((id) => Number(id)));
					removedExistingIds.forEach((id) => merged.add(id));
					return Array.from(merged);
				});
			}

			return next;
		});
	}, []);

	const handleCategoryChange = (value) => {
		setCategory(value);
		if (categoryError) setCategoryError(null);
	};

	const handleManagerChange = (value) => {
		setAssignedManager(value);
		if (managerError) setManagerError(null);
	};

	const handleSubmit = () => submitPost({
		title, content, category, assignedManager, images, removedImageIds,
		onSubmitSuccess, onSubmitFail,
		setLoading, setError, resetForm,
		setTitleError, setContentError, setCategoryError, setManagerError,
		scrollRef,
		mode, postId,
	});

	const completedSteps = [
		Boolean(title.trim() && content.trim()),
		Boolean(category),
		Boolean(assignedManager),
		images.length > 0,
	];

	const isEdit = mode === 'edit';
	const headerTitle = isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie';
	const headerSubtitle = isEdit
		? 'Popraw treść i zapisz zmiany.'
		: 'Opisz problem i dodaj szczegóły.';

	return (
		<ScrollView
			ref={scrollRef}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.header}>
				<Text style={styles.eyebrow}>POMYSŁ KAIZEN</Text>
				<Text style={styles.heading}>{headerTitle}</Text>
				<Text style={styles.subheading}>{headerSubtitle}</Text>
				<Text style={styles.progressLabel}>{completedSteps.filter(Boolean).length} z 4 sekcji uzupełnionych</Text>
			</View>

			<View style={styles.stepper}>
				{STEP_ICONS.map((step, i) => {
					const done = completedSteps[i];
					const isLast = i === STEP_ICONS.length - 1;
					return (
						<View key={i} style={styles.stepItem}>
							<View style={[styles.stepCircle, done ? styles.stepCircleDone : null]}>
								<Feather
									name={done ? 'check' : step.icon}
									size={14}
									color={done ? colors.white : colors.textMuted}
								/>
							</View>
							{!isLast ? (
								<View style={[styles.stepLine, done && completedSteps[i + 1] ? styles.stepLineDone : null]} />
							) : null}
						</View>
					);
				})}
			</View>

			<Section icon="file-text" title="Podstawowe informacje">
				<Input
					label="Tytuł"
					placeholder="Krótki, konkretny tytuł"
					value={title}
					onChangeText={(value) => {
						setTitle(value);
						if (titleError) setTitleError(null);
					}}
					autoCapitalize="sentences"
					error={titleError}
				/>
				<Input
					label="Opis"
					placeholder="Opisz sytuację i oczekiwane usprawnienie"
					value={content}
					onChangeText={(value) => {
						setContent(value);
						if (contentError) setContentError(null);
					}}
					multiline
					numberOfLines={4}
					textAlignVertical="top"
					style={styles.multilineInput}
					error={contentError}
				/>
			</Section>

			<Section icon="tag" title="Kategoria" error={categoryError}>
				{categoriesLoading ? (
					<ActivityIndicator size="small" color={colors.primary} />
				) : categoriesError ? (
					<Text style={styles.errorText}>{categoriesError}</Text>
				) : categoryOptions.length ? (
					<OptionPills options={categoryOptions} value={category} onChange={handleCategoryChange} />
				) : (
					<Text style={styles.muted}>Brak dostępnych kategorii.</Text>
				)}
			</Section>

			<Section icon="user-check" title="Kierownik" error={managerError}>
				<ManagerPicker value={assignedManager} onChange={handleManagerChange} />
				<Text style={styles.hintText}>
					Kierownik przy akceptacji zgłoszenia ustali koszt i termin wdrożenia. Powyżej 10 000 zł wymagana będzie dodatkowo akceptacja dyrektora.
				</Text>
			</Section>

			<Section icon="image" title="Załączniki" optional>
				<ImagePicker value={images} onChange={handleImagesChange} />
			</Section>

			{error ? (
				<View style={styles.errorBanner}>
					<Feather name="alert-circle" size={16} color={colors.danger} />
					<Text style={styles.errorBannerText}>{error}</Text>
				</View>
			) : null}

			<Button
				title={submitLabel}
				onPress={handleSubmit}
				loading={loading}
				leftIcon={<Feather name={isEdit ? 'save' : 'send'} size={16} color={colors.white} />}
				style={styles.submitButton}
			/>
		</ScrollView>
	);
};

const Section = ({icon, title, optional, error, children}) => (
	<Card elevated style={[styles.sectionCard, error ? styles.sectionCardError : null]}>
		<View style={styles.sectionHeader}>
			<View style={[styles.sectionIconCircle, error ? styles.sectionIconCircleError : null]}>
				<Feather name={icon} size={14} color={error ? colors.danger : colors.primary} />
			</View>
			<Text style={styles.sectionTitle}>{title}</Text>
			{optional ? <Text style={styles.optionalTag}>Opcjonalne</Text> : null}
		</View>
		{children}
		{error ? (
			<Text style={styles.sectionError}>{error}</Text>
		) : null}
	</Card>
);

export default CreatePost;

async function submitPost({
	title,
	content,
	category,
	assignedManager,
	images,
	removedImageIds,
	onSubmitSuccess,
	onSubmitFail,
	setLoading,
	setError,
	resetForm,
	setTitleError,
	setContentError,
	setCategoryError,
	setManagerError,
	scrollRef,
	mode,
	postId,
}) {
	let hasError = false;

	if (!title.trim()) {
		setTitleError?.(TITLE_IS_REQUIRED);
		hasError = true;
	}
	if (!content.trim()) {
		setContentError?.(CONTENT_IS_REQUIRED);
		hasError = true;
	}
	if (!category) {
		setCategoryError?.(CATEGORY_IS_REQUIRED);
		hasError = true;
	}
	if (!assignedManager) {
		setManagerError?.(MANAGER_IS_REQUIRED);
		hasError = true;
	}

	if (hasError) {
		scrollRef?.current?.scrollTo({y: 0, animated: true});
		Toast.show({
			type: 'error',
			text1: 'Uzupełnij wymagane pola',
			text2: 'Sprawdź oznaczone sekcje formularza',
			visibilityTime: 2500,
		});
		onSubmitFail?.('Uzupełnij wymagane pola');
		return;
	}

	setLoading(true);
	setError(null);
	setTitleError?.(null);
	setContentError?.(null);
	setCategoryError?.(null);
	setManagerError?.(null);

	try {
		const normalizedImages = normalizeImagesForUpload(images);

		const payload = {
			title: title.trim(),
			content: content.trim(),
			category,
			assigned_manager: assignedManager,
			images: normalizedImages,
		};

		if (mode === 'edit') {
			if (!postId) {
				throw new Error(FAILED_TO_CREATE_POST);
			}
			if (removedImageIds?.length) {
				payload.remove_images = removedImageIds;
			}
			const updated = await postsService.update(postId, payload);
			onSubmitSuccess?.(updated);
		} else {
			const created = await postsService.create(payload);
			onSubmitSuccess?.(created);
		}

		resetForm?.();
	} catch (err) {
		const message = err?.message || FAILED_TO_CREATE_POST;
		setError(message);
		onSubmitFail?.(message);
	} finally {
		setLoading(false);
	}
}

const IMAGE_TYPES = new Set(['GENERAL', 'BEFORE', 'AFTER']);

const normalizeImagesForUpload = (images = []) =>
	(Array.isArray(images) ? images : [])
		.map((item) => {
			if (typeof item === 'string') return item;
			const encoded = item?.base64 || item?.image;
			if (!encoded || typeof encoded !== 'string') return null;
			const safeMimeType = item.mimeType?.includes('/') ? item.mimeType : 'image/jpeg';
			const image = encoded.startsWith('data:') ? encoded : `data:${safeMimeType};base64,${encoded}`;
			return {image, type: IMAGE_TYPES.has(item.type) ? item.type : 'GENERAL'};
		})
		.filter(Boolean);

const styles = StyleSheet.create({
	container: {
		padding: spacing.lg,
		paddingBottom: 120,
		gap: spacing.lg,
	},
	header: {
		gap: 4,
	},
	heading: {
		...typography.title,
		color: colors.text,
	},
	eyebrow: {...typography.caption, fontWeight: '800', letterSpacing: 1.2, color: colors.statusTextInProgress},
	progressLabel: {...typography.caption, color: colors.textMuted, marginTop: spacing.sm},
	subheading: {
		color: colors.textMuted,
		fontSize: 14,
	},
	stepper: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	stepItem: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	stepCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepCircleDone: {
		backgroundColor: colors.primary,
	},
	stepLine: {
		flex: 1,
		height: 2,
		backgroundColor: colors.borderMuted,
		marginHorizontal: 4,
	},
	stepLineDone: {
		backgroundColor: colors.primary,
	},
	sectionCard: {
		gap: 12,
		padding: spacing.lg,
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		...shadows.card,
	},
	sectionCardError: {
		borderColor: colors.danger,
		backgroundColor: colors.dangerSoft,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	sectionIconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sectionIconCircleError: {
		backgroundColor: colors.dangerSoft,
	},
	sectionTitle: {
		flex: 1,
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	optionalTag: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.muted,
		backgroundColor: colors.border,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		overflow: 'hidden',
	},
	sectionError: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.danger,
	},
	muted: {
		color: colors.muted,
	},
	hintText: {
		color: colors.muted,
		fontSize: 11,
		marginTop: 6,
		lineHeight: 16,
	},
	errorText: {
		color: colors.danger,
		fontWeight: '600',
	},
	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 10,
		backgroundColor: colors.dangerSoft,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	errorBannerText: {
		flex: 1,
		color: colors.danger,
		fontSize: 13,
		fontWeight: '600',
	},
	multilineInput: {
		minHeight: 120,
	},
	submitButton: {
		marginTop: 4,
		alignSelf: 'stretch',
	},
});
