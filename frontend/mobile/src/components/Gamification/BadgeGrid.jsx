import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {Card, EmptyState} from 'components/ui';

const TIER_COLOR = {
	BRONZE: colors.medalBronze,
	SILVER: colors.medalSilver,
	GOLD: colors.medalGold,
};

const BadgeCell = ({item}) => {
	const b = item.badge || item;
	const earned = item.earned;
	const tint = earned ? (TIER_COLOR[b.tier] || colors.primary) : colors.mutedAlt;
	const progress = Math.max(0, Math.min(1, item.progress || 0));
	return (
		<Card style={[styles.cell, earned ? styles.cellEarned : styles.cellLocked]} padded={false}>
			<View style={[styles.iconWrap, {backgroundColor: earned ? `${tint}22` : colors.placeholderSurface}]}>
				<Feather name={b.icon || 'award'} size={22} color={tint} />
			</View>
			<Text style={[styles.name, !earned && styles.nameLocked]} numberOfLines={2}>{b.name}</Text>
			{earned ? (
				<Text style={styles.earnedTag}>Zdobyta</Text>
			) : (
				<>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, {width: `${Math.round(progress * 100)}%`}]} />
					</View>
					<Text style={styles.progressText}>{item.value != null ? `${item.value}/${item.threshold}` : 'Do zdobycia'}</Text>
				</>
			)}
		</Card>
	);
};

const BadgeGrid = ({badges = []}) => {
	if (!badges.length) {
		return <EmptyState icon="award" title="Brak odznak" description="Odznaki pojawią się tutaj po pierwszych osiągnięciach." />;
	}
	const earnedCount = badges.filter((b) => b.earned).length;
	return (
		<View style={styles.wrap}>
			<Text style={styles.summary}>Zdobyte: {earnedCount}/{badges.length}</Text>
			<View style={styles.grid}>
				{badges.map((item) => (
					<BadgeCell key={(item.badge || item).id} item={item} />
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
	earnedTag: {fontSize: 11, fontWeight: '700', color: colors.success},
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
