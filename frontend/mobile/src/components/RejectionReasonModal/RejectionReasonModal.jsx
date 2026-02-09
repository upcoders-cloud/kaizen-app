import {useState} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import Text from 'components/Text/Text';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import {REJECTION_REASON_REQUIRED} from 'constants/constans';

const RejectionReasonModal = ({visible, onClose, onSubmit, loading = false}) => {
	const [reason, setReason] = useState('');
	const [error, setError] = useState(null);

	const handleSubmit = () => {
		const trimmed = reason.trim();
		if (!trimmed) {
			setError(REJECTION_REASON_REQUIRED);
			return;
		}
		setError(null);
		onSubmit?.(trimmed);
	};

	const handleClose = () => {
		setReason('');
		setError(null);
		onClose?.();
	};

	return (
		<Modal
			transparent
			visible={visible}
			animationType="fade"
			onRequestClose={handleClose}
		>
			<Pressable style={styles.overlay} onPress={handleClose}>
				<Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
					<Text style={styles.title}>Odrzuć zgłoszenie</Text>
					<Text style={styles.subtitle}>
						Podaj powód odrzucenia, aby autor mógł poprawić zgłoszenie.
					</Text>
					<Input
						label="Powód odrzucenia"
						placeholder="Wpisz powód..."
						value={reason}
						onChangeText={(value) => {
							setReason(value);
							if (error) setError(null);
						}}
						multiline
						numberOfLines={3}
						error={error}
						style={styles.input}
					/>
					<View style={styles.actions}>
						<Button
							title="Anuluj"
							variant="ghost"
							onPress={handleClose}
							style={styles.cancelButton}
						/>
						<Button
							title="Odrzuć"
							onPress={handleSubmit}
							loading={loading}
							style={styles.rejectButton}
							textStyle={styles.rejectButtonText}
						/>
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default RejectionReasonModal;

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.3)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	card: {
		width: '100%',
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: 20,
		gap: 12,
		shadowColor: '#1d2b64',
		shadowOpacity: 0.14,
		shadowRadius: 14,
		shadowOffset: {width: 0, height: 8},
		elevation: 4,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	subtitle: {
		fontSize: 13,
		color: colors.muted,
		lineHeight: 19,
	},
	input: {
		marginTop: 4,
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 8,
	},
	cancelButton: {
		minHeight: 40,
	},
	rejectButton: {
		minHeight: 40,
		backgroundColor: colors.danger,
		borderColor: colors.danger,
	},
	rejectButtonText: {
		color: '#fff',
	},
});
