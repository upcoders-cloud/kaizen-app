import {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import postsService from 'src/server/services/postsService';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import ImagePicker from 'components/ImagePicker/ImagePicker';
import OptionPills from 'components/OptionPills/OptionPills';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_CREATE_POST, TITLE_IS_REQUIRED} from "constants/constans";

const CATEGORIES = [
	{label: 'BHP', value: 'BHP'},
	{label: 'Proces', value: 'PROCES'},
	{label: 'Jakość', value: 'JAKOSC'},
	{label: 'Inne', value: 'INNE'},
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
	const [category, setCategory] = useState(initialValues?.category ?? CATEGORIES[0].value);
	const [images, setImages] = useState(initialValues?.images ?? []);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [titleError, setTitleError] = useState(null);
	const [contentError, setContentError] = useState(null);

	const resetForm = () => {
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(initialValues?.category ?? CATEGORIES[0].value);
		setImages(initialValues?.images ?? []);
		setError(null);
		setTitleError(null);
		setContentError(null);
	};

	useEffect(() => {
		if (!initialValues) return;
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(initialValues?.category ?? CATEGORIES[0].value);
		setImages(initialValues?.images ?? []);
		setTitleError(null);
		setContentError(null);
	}, [initialValues?.title, initialValues?.content, initialValues?.category]);

	const handleSubmit = () => submitPost(
		{
			title, content, category, images,
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
				<OptionPills options={CATEGORIES} value={category} onChange={setCategory} />
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Załączniki</Text>
				<ImagePicker value={images} onChange={setImages} />
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
	multilineInput: {
		minHeight: 120,
	},
	submitButton: {
		marginTop: 4,
		alignSelf: 'stretch',
	},
});
