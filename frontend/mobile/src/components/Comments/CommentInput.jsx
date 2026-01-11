import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import colors from 'theme/colors';

const CommentInput = ({value, onChangeText, onSubmit, loading = false, error, onFocus}) => {
	return (
		<View style={styles.container}>
			<Input
				label="Twój komentarz"
				value={value}
				onChangeText={onChangeText}
				multiline
				numberOfLines={3}
				placeholder="Podziel się opinią..."
				style={styles.inputWrapper}
				inputStyle={styles.input}
				error={error}
				onFocus={onFocus}
			/>
			<Button
				title="Dodaj komentarz"
				onPress={onSubmit}
				loading={loading}
				leftIcon={<Feather name="send" size={16} color="#fff" />}
				style={styles.button}
			/>
		</View>
	);
};

export default CommentInput;

const styles = StyleSheet.create({
	container: {
		gap: 12,
		paddingVertical: 8,
	},
	inputWrapper: {
		marginBottom: 0,
	},
	input: {
		minHeight: 80,
	},
	button: {
		alignSelf: 'flex-end',
		paddingHorizontal: 16,
	},
});
