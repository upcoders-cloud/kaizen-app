import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {Card} from 'components/ui';
import {radius, spacing, typography} from 'theme/theme';

const LevelProgress = ({me}) => {
	if (!me) return null;
	const level = me.level;
	const next = me.next_level;
	const progress = Math.max(0, Math.min(1, me.level_progress ?? 0));
	const accent = level?.color || colors.primary;

	return (
		<Card style={styles.card} padded={false}>
			<View style={styles.topRow}>
				<View style={[styles.levelBadge, {backgroundColor: accent}]}>
					<Feather name={level?.icon || 'star'} size={18} color={colors.white} />
				</View>
				<View style={{flex: 1}}>
					<Text style={styles.levelName}>{level?.name || 'Brak poziomu'}</Text>
					<Text style={styles.points}>{me.points} pkt łącznie · #{me.rank ?? '-'} w rankingu ogólnym</Text>
				</View>
				<View style={styles.streakPill}>
					<Feather name="zap" size={13} color={colors.warning} />
					<Text style={styles.streakText}>{me.current_streak ?? 0} dni</Text>
				</View>
			</View>

			<View style={styles.barTrack}>
				<View style={[styles.barFill, {width: `${progress * 100}%`, backgroundColor: accent}]} />
			</View>
			<Text style={styles.nextText}>
				{next
					? `Do „${next.name}" brakuje ${me.points_to_next} pkt`
					: 'Najwyższy poziom osiągnięty 🎉'}
			</Text>
		</Card>
	);
};

export default LevelProgress;

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.lg,
		gap: spacing.md,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	levelBadge: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	levelName: {
		...typography.subtitle,
		color: colors.text,
	},
	points: {
		fontSize: 13,
		color: colors.muted,
		marginTop: 2,
	},
	streakPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: colors.warningSoft,
	},
	streakText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.medalBronze,
	},
	barTrack: {
		height: 10,
		borderRadius: 5,
		backgroundColor: colors.placeholderSurface,
		overflow: 'hidden',
	},
	barFill: {
		height: '100%',
		borderRadius: 5,
	},
	nextText: {
		fontSize: 12,
		color: colors.muted,
	},
});
