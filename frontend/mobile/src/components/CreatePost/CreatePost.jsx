import {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import postsService from 'src/server/services/postsService';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import ImagePicker from 'components/ImagePicker/ImagePicker';
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
	submitLabel = 'Submit Post',
}) => {
	const [title, setTitle] = useState(initialValues?.title ?? EMPTY_STRING);
	const [content, setContent] = useState(initialValues?.content ?? EMPTY_STRING);
	const [category, setCategory] = useState(initialValues?.category ?? CATEGORIES[0].value);
	const [images, setImages] = useState(initialValues?.images ?? []);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const resetForm = () => {
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(initialValues?.category ?? CATEGORIES[0].value);
		setImages(initialValues?.images ?? []);
		setError(null);
	};

	useEffect(() => {
		if (!initialValues) return;
		setTitle(initialValues?.title ?? EMPTY_STRING);
		setContent(initialValues?.content ?? EMPTY_STRING);
		setCategory(initialValues?.category ?? CATEGORIES[0].value);
		setImages(initialValues?.images ?? []);
	}, [initialValues?.title, initialValues?.content, initialValues?.category]);

	const handleSubmit = () => submitPost(
		{
			title, content, category, images,
			onSubmitSuccess, onSubmitFail,
			setLoading, setError, resetForm,
			mode, postId
		});

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Input
				label="Title"
				placeholder="Optional title"
				value={title}
				onChangeText={setTitle}
				autoCapitalize="sentences"
			/>
			<Input
				label="Description"
				placeholder="Describe your idea"
				value={content}
				onChangeText={setContent}
				multiline
				numberOfLines={4}
				textAlignVertical="top"
				style={styles.multilineInput}
			/>
			<View style={styles.categorySection}>
				<Text style={styles.label}>Category</Text>
				<View style={styles.categoryRow}>
					{CATEGORIES.map((cat) => (
						<Button
							key={cat.value}
							title={cat.label}
							variant={cat.value === category ? 'primary' : 'outline'}
							onPress={() => setCategory(cat.value)}
							style={[
								styles.categoryButton,
								cat.value === category && {borderColor: colors.primary},
							]}
							textStyle={cat.value === category ? styles.categoryButtonTextActive : styles.categoryButtonText}
						/>
					))}
				</View>
			</View>
			<ImagePicker value={images} onChange={setImages} />
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Button title={submitLabel} onPress={handleSubmit} loading={loading} style={styles.submitButton} />
		</ScrollView>
	);
};

export default CreatePost;

async function submitPost({ title, content, category, images, onSubmitSuccess, onSubmitFail, setLoading, setError, resetForm, mode, postId }) {
	if (!title.trim()) {
		setError(TITLE_IS_REQUIRED);
		onSubmitFail?.(TITLE_IS_REQUIRED);
		return;
	}
	if (!content.trim()) {
		setError(CONTENT_IS_REQUIRED);
		onSubmitFail?.(CONTENT_IS_REQUIRED);
		return;
	}

	setLoading(true);
	setError(null);

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
			await postsService.update(postId, payload);
		} else {
			await postsService.create(payload);
		}

		resetForm?.();
		onSubmitSuccess?.();
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
		gap: 16,
	},
	multilineInput: {
		minHeight: 120,
	},
	categorySection: {
		gap: 8,
	},
	label: {
		fontWeight: '700',
		fontSize: 14,
		marginLeft: 4,
		color: colors.text,
	},
	categoryRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	categoryButton: {
		paddingHorizontal: 12,
		borderColor: colors.border,
	},
	categoryButtonText: {
		color: colors.primary,
	},
	categoryButtonTextActive: {
		color: colors.surface,
	},
	error: {
		color: colors.danger,
		fontWeight: '700',
	},
	submitButton: {
		marginTop: 8,
		marginLeft: "auto",
		marginRight: "auto",
		width: '50%',
	},
});
