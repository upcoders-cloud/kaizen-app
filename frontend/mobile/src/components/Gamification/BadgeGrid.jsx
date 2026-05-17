import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const TIER_COLOR = {
	BRONZE: '#b45309',
	SILVER: '#64748b',
	GOLD: '#f59e0b',
};

const BadgeCell = ({item}) => {
	const b = item.badge;
	const earned = item.earned;
	const tint = earned ? (TIER_COLOR[b.tier] || colors.primary) : colors.mutedAlt;
	return (
		<View style={[styles.cell, earned ? styles.cellEarned : styles.cellLocked]}>
			<View style={[styles.iconWrap, {backgroundColor: earned ? `${tint}22` : colors.placeholderSurface}]}>
				<Feather name={b.icon || 'award'} size={22} color={tint} />
			</View>
			<Text style={[styles.name, !earned && styles.nameLocked]} numberOfLines={2}>{b.name}</Text>
			{earned ? (
				<Text style={styles.earnedTag}>Zdobyta</Text>
			) : (
				<>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, {width: `${Math.round((item.progress || 0) * 100)}%`}]} />
					</View>
					<Text style={styles.progressText}>{item.value}/{item.threshold}</Text>
				</>
			)}
		</View>
	);
};

const BadgeGrid = ({badges = []}) => {
	if (!badges.length) {
		return <Text style={styles.empty}>Brak odznak do zdobycia.</Text>;
	}
	const earnedCount = badges.filter((b) => b.earned).length;
	return (
		<View style={styles.wrap}>
			<Text style={styles.summary}>Zdobyte: {earnedCount}/{badges.length}</Text>
			<View style={styles.grid}>
				{badges.map((item) => (
					<BadgeCell key={item.badge.id} item={item} />
				))}
			</View>
		</View>
	);
};

export default BadgeGrid;

const styles = StyleSheet.create({
	wrap: {gap: 12},
	summary: {fontSize: 13, fontWeight: '700', color: colors.muted},
	grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
	cell: {
		width: '47%',
		flexGrow: 1,
		borderRadius: 14,
		borderWidth: 1,
		padding: 14,
		alignItems: 'center',
		gap: 6,
	},
	cellEarned: {backgroundColor: colors.surface, borderColor: colors.border},
	cellLocked: {backgroundColor: colors.placeholderSurface, borderColor: colors.borderMuted},
	iconWrap: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	name: {fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center'},
	nameLocked: {color: colors.muted},
	earnedTag: {fontSize: 11, fontWeight: '700', color: '#16a34a'},
	progressTrack: {
		height: 6,
		width: '100%',
		borderRadius: 3,
		backgroundColor: colors.border,
		overflow: 'hidden',
	},
	progressFill: {height: '100%', backgroundColor: colors.secondary, borderRadius: 3},
	progressText: {fontSize: 11, color: colors.muted},
	empty: {color: colors.muted, textAlign: 'center', paddingVertical: 24},
});
