import {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import ManagerPicker from 'components/ManagerPicker/ManagerPicker';
import colors from 'theme/colors';

// Próg powyżej którego wymagana jest dodatkowa akceptacja dyrektora.
// Musi pozostać zsynchronizowany z `COST_THRESHOLD_DIRECTOR` po stronie backendu.
export const COST_THRESHOLD_DIRECTOR = 10000;

const ApproveDecisionModal = ({
	visible,
	onClose,
	onSubmit,
	loading = false,
	initialCost = '',
	initialDeadline = '',
	initialDirector = null,
}) => {
	const [cost, setCost] = useState(initialCost ? String(initialCost) : '');
	const [deadline, setDeadline] = useState(initialDeadline || '');
	const [director, setDirector] = useState(initialDirector ?? null);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!visible) return;
		setCost(initialCost != null && initialCost !== '' ? String(initialCost) : '');
		setDeadline(initialDeadline || '');
		setDirector(initialDirector ?? null);
		setError(null);
	}, [visible, initialCost, initialDeadline, initialDirector]);

	const numericCost = useMemo(() => {
		const parsed = Number(String(cost).replace(',', '.'));
		return Number.isFinite(parsed) ? parsed : null;
	}, [cost]);

	const directorRequired = numericCost != null && numericCost > COST_THRESHOLD_DIRECTOR;

	const handleSubmit = () => {
		if (numericCost == null || numericCost < 0) {
			setError('Podaj szacowany koszt wdrożenia (zł).');
			return;
		}
		if (directorRequired && !director) {
			setError(`Dla kosztu powyżej ${COST_THRESHOLD_DIRECTOR.toLocaleString('pl-PL')} zł wybierz dyrektora.`);
			return;
		}
		const payload = {
			estimated_cost: numericCost,
		};
		const trimmedDeadline = String(deadline || '').trim();
		if (trimmedDeadline) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDeadline)) {
				setError('Termin musi być w formacie YYYY-MM-DD.');
				return;
			}
			payload.deadline = trimmedDeadline;
		} else {
			payload.deadline = null;
		}
		if (directorRequired || director) {
			payload.assigned_director = director;
		}
		setError(null);
		onSubmit?.(payload);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
					<View style={styles.header}>
						<Text style={styles.title}>Zatwierdź zgłoszenie</Text>
						<Pressable onPress={onClose} hitSlop={8}>
							<Feather name="x" size={20} color={colors.muted} />
						</Pressable>
					</View>
					<Text style={styles.hint}>
						Uzupełnij dane potrzebne do wdrożenia. Powyżej {COST_THRESHOLD_DIRECTOR.toLocaleString('pl-PL')} zł
						wymagana jest akceptacja dyrektora.
					</Text>

					<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
						<View style={styles.section}>
							<Text style={styles.label}>Szacowany koszt wdrożenia (zł)</Text>
							<Input
								value={cost}
								onChangeText={(value) => setCost(value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
								keyboardType="numeric"
								placeholder="np. 2500"
							/>
						</View>

						<View style={styles.section}>
							<Text style={styles.label}>Termin wdrożenia</Text>
							<Input
								value={deadline}
								onChangeText={setDeadline}
								placeholder="YYYY-MM-DD"
								autoCapitalize="none"
							/>
						</View>

						{directorRequired ? (
							<View style={styles.section}>
								<View style={styles.labelRow}>
									<Text style={styles.label}>Dyrektor do akceptacji</Text>
									<View style={styles.requiredBadge}>
										<Text style={styles.requiredBadgeText}>wymagane</Text>
									</View>
								</View>
								<ManagerPicker
									value={director}
									onChange={setDirector}
									role="DIRECTOR"
								/>
							</View>
						) : null}

						{error ? <Text style={styles.error}>{error}</Text> : null}
					</ScrollView>

					<View style={styles.actions}>
						<Button title="Anuluj" variant="outline" onPress={onClose} disabled={loading} style={styles.action} />
						<Button title="Zatwierdź" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.action} />
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default ApproveDecisionModal;

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
		maxHeight: '85%',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: {
		fontSize: 18,
		fontWeight: '800',
		color: colors.text,
	},
	hint: {
		fontSize: 12,
		color: colors.muted,
		lineHeight: 16,
	},
	scroll: {
		gap: 12,
	},
	section: {
		gap: 8,
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	label: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	requiredBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		backgroundColor: '#fee2e2',
	},
	requiredBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.danger,
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	error: {
		color: colors.danger,
		fontSize: 13,
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
