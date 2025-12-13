import {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import postsService from 'src/server/services/postsService';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import ImagePicker from 'components/ImagePicker/ImagePicker';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_CREATE_POST} from "constants/constans";

const CATEGORIES = ['Idea', 'Bug', 'Improvement', 'Question'];

const CreatePost = ({onSubmitSuccess, onSubmitFail}) => {
	const [title, setTitle] = useState(EMPTY_STRING);
	const [content, setContent] = useState(EMPTY_STRING);
	const [category, setCategory] = useState(CATEGORIES[0]);
	const [images, setImages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = () => submitPost(
		{
			title, content, category, images,
			onSubmitSuccess, onSubmitFail,
			setLoading, setError
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
							key={cat}
							title={cat}
							variant={cat === category ? 'primary' : 'outline'}
							onPress={() => setCategory(cat)}
							style={[
								styles.categoryButton,
								cat === category && {borderColor: colors.primary},
							]}
							textStyle={cat === category ? styles.categoryButtonTextActive : styles.categoryButtonText}
						/>
					))}
				</View>
			</View>
			<ImagePicker value={images} onChange={setImages} />
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Button title="Submit Post" onPress={handleSubmit} loading={loading} style={styles.submitButton} />
		</ScrollView>
	);
};

export default CreatePost;

async function submitPost({ title, content, category, images, onSubmitSuccess, onSubmitFail, setLoading, setError }) {
	if (!content.trim()) {
		setError(CONTENT_IS_REQUIRED);
		onSubmitFail?.(CONTENT_IS_REQUIRED);
		return;
	}

	setLoading(true);
	setError(null);

	try {
		// if (__DEV__) {
		// 	console.log(
		// 		'ImagePicker: normalized assets sample',
		// 		images.map((item) => ({
		// 			id: item.id,
		// 			fileName: item.fileName,
		// 			mimeType: item.mimeType,
		// 			base64Length: item.base64?.length,
		// 			base64Preview: item.base64 ? `${item.base64.slice(0, 30)}...` : undefined,
		// 		}))
		// 	);
		// }
		// await postsService.create({
		// 	title: title.trim() || undefined,
		// 	content: content.trim(),
		// 	category,
		// 	images: images?.map(({uri, fileName, mimeType}) => ({uri, fileName, mimeType})),
		// });

		// onSubmitSuccess?.();
	} catch (err) {
		const message = err?.message || FAILED_TO_CREATE_POST;
		setError(message);
		onSubmitFail?.(message);
	} finally {
		setLoading(false);
	}
}

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
