import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import TextBase from 'components/Text/Text';
import {useEffect, useRef, useState} from 'react';
import ConfettiCannon from 'react-native-confetti-cannon';

const SurveyResults = () => {
	const router = useRouter();
	const {id, hours, savings} = useLocalSearchParams();

	const parsedHours = Number(hours);
	const parsedSavings = Number(savings);
	const hoursLabel = Number.isFinite(parsedHours) ? parsedHours.toFixed(2) : '0.00';
	const savingsLabel = Number.isFinite(parsedSavings)
		? parsedSavings.toLocaleString('pl-PL', {minimumFractionDigits: 2, maximumFractionDigits: 2})
		: '0.00';

	const [showConfetti, setShowConfetti] = useState(false);
	const hasFiredRef = useRef(false);

	useEffect(() => {
		if (hasFiredRef.current) return;
		hasFiredRef.current = true;
		setShowConfetti(true);
	}, []);

	const handleClose = () => {
		if (id) {
			router.replace(`/post/${id}`);
			return;
		}
		router.back();
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Podsumowanie',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
					presentation: 'modal',
					headerBackVisible: false,
					headerLeft: () => null,
					headerRight: () => (
						<Pressable onPress={handleClose} style={styles.headerClose}>
							<Feather name="x" size={18} color={colors.primary} />
						</Pressable>
					),
				}}
			/>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
					<View style={styles.content}>
						{/* Summary hero */}
						<View style={styles.hero}>
							<View style={styles.heroIcon}>
								<Feather name="check-circle" size={20} color={colors.primary} />
							</View>
							<View style={styles.heroText}>
								<TextBase style={styles.title}>Przewidywane usprawnienia</TextBase>
								<TextBase style={styles.subtitle}>Podsumowanie potencjalnych korzyści</TextBase>
							</View>
						</View>

						{/* Results */}
						<View style={styles.results}>
							<View style={styles.resultBlock}>
								<TextBase style={styles.resultValue}>{hoursLabel} h</TextBase>
								<TextBase style={styles.resultLabel}>Szacowany czas oszczędności</TextBase>
							</View>
							<View style={styles.resultDivider} />
							<View style={styles.resultBlock}>
								<TextBase style={styles.resultValue}>{savingsLabel} PLN</TextBase>
								<TextBase style={styles.resultLabel}>Szacowane oszczędności finansowe</TextBase>
							</View>
						</View>
					</View>

					<Pressable style={styles.closeButton} onPress={handleClose}>
						<TextBase style={styles.closeText}>Zamknij</TextBase>
					</Pressable>
				</ScrollView>
				{showConfetti ? (
					<View pointerEvents="none" style={styles.confettiLayer}>
						<ConfettiCannon
							count={60}
							origin={{x: 0, y: 0}}
							fadeOut
							explosionSpeed={220}
							fallSpeed={1800}
							recycle={false}
							onAnimationEnd={() => setShowConfetti(false)}
						/>
					</View>
				) : null}
			</SafeAreaView>
		</>
	);
};

export default SurveyResults;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	container: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 24,
		flexGrow: 1,
		justifyContent: 'space-between',
		gap: 20,
	},
	content: {
		gap: 20,
	},
	hero: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	heroIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e8efff',
		borderWidth: 1,
		borderColor: '#d7e3ff',
	},
	heroText: {
		gap: 4,
		flex: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.text,
	},
	subtitle: {
		color: colors.muted,
	},
	results: {
		borderRadius: 12,
		padding: 16,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 16,
	},
	resultBlock: {
		gap: 6,
	},
	resultValue: {
		fontSize: 26,
		fontWeight: '700',
		color: colors.text,
	},
	resultLabel: {
		color: colors.muted,
	},
	resultDivider: {
		height: 1,
		backgroundColor: colors.border,
	},
	closeButton: {
		alignSelf: 'center',
		paddingVertical: 12,
		paddingHorizontal: 28,
		borderRadius: 10,
		backgroundColor: colors.primary,
	},
	closeText: {
		color: colors.surface,
		fontWeight: '700',
	},
	headerClose: {
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	confettiLayer: {
		...StyleSheet.absoluteFillObject,
	},
});
