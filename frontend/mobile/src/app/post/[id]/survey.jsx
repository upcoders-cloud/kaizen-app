import {Pressable, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useState} from 'react';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import TextBase from 'components/Text/Text';
import postsService from 'src/server/services/postsService';

const UNITS = [
	{label: 'Dzień', value: 'DAY'},
	{label: 'Tydzień', value: 'WEEK'},
	{label: 'Miesiąc', value: 'MONTH'},
];

const SurveyScreen = () => {
	const router = useRouter();
	const {id} = useLocalSearchParams();
	const [frequencyValue, setFrequencyValue] = useState('');
	const [frequencyUnit, setFrequencyUnit] = useState(UNITS[0].value);
	const [affectedPeople, setAffectedPeople] = useState('');
	const [timeLostMinutes, setTimeLostMinutes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleClose = () => {
		if (id) {
			router.replace(`/post/${id}`);
			return;
		}
		router.back();
	};

	const handleSubmit = async () => {
		if (!id) return;
		setError(null);

		const payload = {
			frequency_value: Number(frequencyValue),
			frequency_unit: frequencyUnit,
			affected_people: Number(affectedPeople),
			time_lost_minutes: Number(timeLostMinutes),
		};

		if (
			Number.isNaN(payload.frequency_value) ||
			Number.isNaN(payload.affected_people) ||
			Number.isNaN(payload.time_lost_minutes)
		) {
			setError('Uzupełnij wszystkie pola liczbowe.');
			return;
		}

		setLoading(true);
		try {
			let response;
			try {
				response = await postsService.createSurvey(id, payload);
			} catch (err) {
				if (err?.status === 400 && `${err?.message}`.includes('Ankieta')) {
					response = await postsService.updateSurvey(id, payload);
				} else {
					throw err;
				}
			}

			router.replace({
				pathname: `/post/${id}/survey-results`,
				params: {
					hours: response?.estimated_time_savings_hours,
					savings: response?.estimated_financial_savings,
				},
			});
		} catch (err) {
			setError(err?.message || 'Nie udało się zapisać ankiety.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Ankieta',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
					headerLeft: () => (
						<Pressable onPress={handleClose} style={styles.backButton}>
							<Feather name="arrow-left" size={18} color={colors.primary} />
							<TextBase style={styles.backText}>Wróć</TextBase>
						</Pressable>
					),
					headerRight: () => (
						<Pressable onPress={handleClose} style={styles.deferButton}>
							<TextBase style={styles.deferText}>Zrobię to później</TextBase>
							<Feather name="x" size={18} color={colors.primary} />
						</Pressable>
					),
				}}
			/>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.container}>
					<TextBase style={styles.title}>Opcjonalna ankieta</TextBase>
					<TextBase style={styles.subtitle}>
						Wypełnij krótką ankietę, aby oszacować korzyści z usprawnienia.
					</TextBase>

					<Input
						label="Częstotliwość problemu"
						placeholder="np. 3"
						value={frequencyValue}
						onChangeText={setFrequencyValue}
						keyboardType="numeric"
					/>
					<View style={styles.unitRow}>
						{UNITS.map((unit) => (
							<Button
								key={unit.value}
								title={unit.label}
								variant={frequencyUnit === unit.value ? 'primary' : 'outline'}
								onPress={() => setFrequencyUnit(unit.value)}
								style={styles.unitButton}
								textStyle={frequencyUnit === unit.value ? styles.unitButtonTextActive : styles.unitButtonText}
							/>
						))}
					</View>
					<Input
						label="Liczba osób dotkniętych"
						placeholder="np. 5"
						value={affectedPeople}
						onChangeText={setAffectedPeople}
						keyboardType="numeric"
					/>
					<Input
						label="Strata czasu na zdarzenie (min)"
						placeholder="np. 15"
						value={timeLostMinutes}
						onChangeText={setTimeLostMinutes}
						keyboardType="numeric"
					/>

					{error ? <TextBase style={styles.error}>{error}</TextBase> : null}
					<Button title="Przelicz" onPress={handleSubmit} loading={loading} />
				</View>
			</SafeAreaView>
		</>
	);
};

export default SurveyScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	container: {
		padding: 16,
		gap: 14,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.text,
	},
	subtitle: {
		color: colors.muted,
		marginBottom: 8,
	},
	unitRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	unitButton: {
		paddingHorizontal: 12,
		borderColor: colors.border,
	},
	unitButtonText: {
		color: colors.primary,
	},
	unitButtonTextActive: {
		color: colors.surface,
	},
	error: {
		color: colors.danger,
		fontWeight: '600',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
	},
	backText: {
		color: colors.primary,
		fontWeight: '600',
	},
	deferButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	deferText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
});
