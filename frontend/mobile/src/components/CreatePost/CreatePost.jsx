import {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import colors from 'theme/colors';
import postsService from 'src/server/services/postsService';
import categoriesService from 'src/server/services/categoriesService';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import ImagePicker from 'components/ImagePicker/ImagePicker';
import OptionPills from 'components/OptionPills/OptionPills';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_CREATE_POST, TITLE_IS_REQUIRED} from "constants/constans";

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
	const [images, setImages] = useState(initialValues?.images ?? []);
	const [removedImageIds, setRemovedImageIds] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [titleError, setTitleError] = useState(null);
	const [contentError, setContentError] = useState(null);
	const [categories, setCategories] = useState([]);
	const [categoriesLoading, setCategoriesLoading] = useState(false);
	const [categoriesError, setCategoriesError] = useState(null);

	const categoryOptions = useMemo(
		() =>
			categories.map((categoryItem) => ({
				label: categoryItem.name,
				value: categoryItem.id,
			})),
		[categories]
	);

	const resolveDefaultCategory = () => initialValues?.category ?? categoryOptions[0]?.value ?? null;

	const resetForm = () => {
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(resolveDefaultCategory());
		setImages(initialValues?.images ?? []);
		setRemovedImageIds([]);
		setError(null);
		setTitleError(null);
		setContentError(null);
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
		setImages(initialValues?.images ?? []);
		setRemovedImageIds([]);
		setTitleError(null);
		setContentError(null);
	}, [initialValues?.title, initialValues?.content, initialValues?.category]);

	useEffect(() => {
		if (mode === 'edit') return;
		if (!categoryOptions.length) return;
		const hasMatch = categoryOptions.some((option) => String(option.value) === String(category));
		if (!hasMatch) {
			setCategory(categoryOptions[0].value);
		}
	}, [categoryOptions, category, mode]);

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

	const handleSubmit = () => submitPost(
		{
			title, content, category, images, removedImageIds,
			onSubmitSuccess, onSubmitFail,
			setLoading, setError, resetForm,
			setTitleError, setContentError,
			mode, postId
		});

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<View style={styles.header}>
				<Text style={styles.heading}>Nowe zgłoszenie</Text>
				<Text style={styles.subheading}>Opisz problem i dodaj materiały pomocnicze.</Text>
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Podstawowe informacje</Text>
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
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Kategoria</Text>
				{categoriesLoading ? (
					<ActivityIndicator size="small" color={colors.primary} />
				) : categoriesError ? (
					<Text style={styles.error}>{categoriesError}</Text>
				) : categoryOptions.length ? (
					<OptionPills options={categoryOptions} value={category} onChange={setCategory} />
				) : (
					<Text style={styles.muted}>Brak dostępnych kategorii.</Text>
				)}
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Załączniki</Text>
				<ImagePicker value={images} onChange={handleImagesChange} />
			</View>

			<Button title={submitLabel} onPress={handleSubmit} loading={loading} style={styles.submitButton} />
		</ScrollView>
	);
};

export default CreatePost;

async function submitPost({
	title,
	content,
	category,
	images,
	removedImageIds,
	onSubmitSuccess,
	onSubmitFail,
	setLoading,
	setError,
	resetForm,
	setTitleError,
	setContentError,
	mode,
	postId
}) {
	if (!title.trim()) {
		setTitleError?.(TITLE_IS_REQUIRED);
		onSubmitFail?.(TITLE_IS_REQUIRED);
		return;
	}
	if (!content.trim()) {
		setContentError?.(CONTENT_IS_REQUIRED);
		onSubmitFail?.(CONTENT_IS_REQUIRED);
		return;
	}

	setLoading(true);
	setError(null);
	setTitleError?.(null);
	setContentError?.(null);

	try {
		const normalizedImages = normalizeImagesForUpload(images);

		const payload = {
			title: title.trim(),
			content: content.trim(),
			category,
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

const normalizeImagesForUpload = (images = []) =>
	images
		?.map(({base64, mimeType}) => {
			if (!base64) return null;
			const safeMimeType = mimeType?.includes('/') ? mimeType : 'image/jpeg';
			return `data:${safeMimeType};base64,${base64}`;
		})
		.filter(Boolean);

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 18,
	},
	header: {
		gap: 6,
	},
	heading: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.text,
	},
	subheading: {
		color: colors.muted,
	},
	sectionCard: {
		gap: 12,
		padding: 14,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	muted: {
		color: colors.muted,
	},
	error: {
		color: colors.danger,
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
