import {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const QUICK_VALUES = [0, 25, 50, 75, 100];

const ProgressUpdateModal = ({visible, onClose, initialProgress = 0, initialDeadline = '', onSubmit, loading = false}) => {
	const [progress, setProgress] = useState(String(initialProgress ?? 0));
	const [deadline, setDeadline] = useState(initialDeadline ?? '');
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!visible) return;
		setProgress(String(initialProgress ?? 0));
		setDeadline(initialDeadline ?? '');
		setError(null);
	}, [visible, initialProgress, initialDeadline]);

	const handleSubmit = () => {
		const parsed = Number(progress);
		if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
			setError('Postęp musi być w zakresie 0-100');
			return;
		}
		const payload = {progress_percent: Math.round(parsed)};
		if (deadline?.trim()) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
				setError('Termin musi być w formacie YYYY-MM-DD');
				return;
			}
			payload.deadline = deadline.trim();
		} else {
			payload.deadline = null;
		}
		onSubmit?.(payload);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
					<View style={styles.header}>
						<Text style={styles.title}>Aktualizuj postęp wdrożenia</Text>
						<Pressable onPress={onClose} hitSlop={8}>
							<Feather name="x" size={20} color={colors.muted} />
						</Pressable>
					</View>

					<View style={styles.section}>
						<Text style={styles.label}>Postęp (%)</Text>
						<Input
							value={progress}
							onChangeText={(value) => setProgress(value.replace(/[^0-9]/g, ''))}
							keyboardType="numeric"
							placeholder="0–100"
						/>
						<View style={styles.quickRow}>
							{QUICK_VALUES.map((value) => {
								const isActive = String(value) === String(progress);
								return (
									<Pressable
										key={value}
										onPress={() => setProgress(String(value))}
										style={[styles.quickPill, isActive ? styles.quickPillActive : null]}
									>
										<Text style={[styles.quickPillText, isActive ? styles.quickPillTextActive : null]}>
											{value}%
										</Text>
									</Pressable>
								);
							})}
						</View>
					</View>

					<View style={styles.section}>
						<Text style={styles.label}>Termin (YYYY-MM-DD)</Text>
						<Input
							value={deadline}
							onChangeText={setDeadline}
							placeholder="np. 2026-06-30"
							autoCapitalize="none"
						/>
					</View>

					{error ? <Text style={styles.error}>{error}</Text> : null}

					<View style={styles.actions}>
						<Button title="Anuluj" variant="outline" onPress={onClose} disabled={loading} style={styles.action} />
						<Button title="Zapisz" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.action} />
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default ProgressUpdateModal;

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.45)',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 18,
		padding: 18,
		gap: 14,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: {
		fontSize: 16,
		fontWeight: '800',
		color: colors.text,
	},
	section: {
		gap: 8,
	},
	label: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	quickRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	quickPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		backgroundColor: colors.surface,
	},
	quickPillActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	quickPillText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.text,
	},
	quickPillTextActive: {
		color: colors.surface,
	},
	error: {
		color: colors.danger,
		fontSize: 12,
		fontWeight: '600',
	},
	actions: {
		flexDirection: 'row',
		gap: 10,
	},
	action: {
		flex: 1,
	},
});
