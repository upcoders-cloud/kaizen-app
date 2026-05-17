import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const MEDALS = ['#f59e0b', '#94a3b8', '#b45309'];

const Row = ({rank, title, subtitle, points, highlight}) => {
	const medalColor = rank <= 3 ? MEDALS[rank - 1] : null;
	return (
		<View style={[styles.row, highlight ? styles.rowHighlight : null]}>
			<View style={[styles.rankCircle, medalColor ? {backgroundColor: medalColor} : null]}>
				<Text style={[styles.rankText, medalColor ? styles.rankTextMedal : null]}>{rank}</Text>
			</View>
			<View style={{flex: 1}}>
				<Text style={styles.title} numberOfLines={1}>{title}</Text>
				{subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
			</View>
			<View style={styles.pointsPill}>
				<Feather name="star" size={12} color={colors.primary} />
				<Text style={styles.points}>{points}</Text>
			</View>
		</View>
	);
};

const LeaderboardList = ({scope, rows = [], currentUserId}) => {
	if (!rows.length) {
		return <Text style={styles.empty}>Brak danych w tym okresie.</Text>;
	}
	return (
		<View style={styles.list}>
			{rows.map((r, i) => {
				if (scope === 'categories') {
					return (
						<Row
							key={`cat-${i}-${r.category ?? ''}`}
							rank={i + 1}
							title={r.category}
							points={r.points}
						/>
					);
				}
				if (scope === 'departments') {
					return (
						<Row
							key={`dep-${i}-${r.department_id ?? ''}`}
							rank={i + 1}
							title={r.department}
							points={r.points}
						/>
					);
				}
				const u = r.user || {};
				const name =
					[u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
					u.nickname || u.username || 'Użytkownik';
				return (
					<Row
						key={`usr-${i}-${u.id ?? ''}`}
						rank={i + 1}
						title={name}
						subtitle={r.level?.name ? `${r.level.name}` : (u.nickname ? `@${u.nickname}` : null)}
						points={r.points}
						highlight={currentUserId != null && String(u.id) === String(currentUserId)}
					/>
				);
			})}
		</View>
	);
};

export default LeaderboardList;

const styles = StyleSheet.create({
	list: {gap: 8},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	rowHighlight: {
		borderColor: colors.primary,
		backgroundColor: '#eef2ff',
	},
	rankCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.placeholderSurface,
	},
	rankText: {fontSize: 13, fontWeight: '800', color: colors.muted},
	rankTextMedal: {color: '#fff'},
	title: {fontSize: 14, fontWeight: '700', color: colors.text},
	subtitle: {fontSize: 12, color: colors.muted, marginTop: 1},
	pointsPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		backgroundColor: '#eef2ff',
	},
	points: {fontSize: 13, fontWeight: '800', color: colors.primary},
	empty: {color: colors.muted, textAlign: 'center', paddingVertical: 24},
});
