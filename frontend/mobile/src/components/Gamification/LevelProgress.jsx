import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const LevelProgress = ({me}) => {
	if (!me) return null;
	const level = me.level;
	const next = me.next_level;
	const progress = Math.max(0, Math.min(1, me.level_progress ?? 0));
	const accent = level?.color || colors.primary;

	return (
		<View style={styles.card}>
			<View style={styles.topRow}>
				<View style={[styles.levelBadge, {backgroundColor: accent}]}>
					<Feather name={level?.icon || 'star'} size={18} color="#fff" />
				</View>
				<View style={{flex: 1}}>
					<Text style={styles.levelName}>{level?.name || 'Brak poziomu'}</Text>
					<Text style={styles.points}>{me.points} pkt · #{me.rank ?? '—'} w rankingu</Text>
				</View>
				<View style={styles.streakPill}>
					<Feather name="zap" size={13} color="#f59e0b" />
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
		</View>
	);
};

export default LevelProgress;

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 16,
		gap: 12,
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
		fontSize: 16,
		fontWeight: '800',
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
		backgroundColor: '#fff7ed',
	},
	streakText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#b45309',
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
