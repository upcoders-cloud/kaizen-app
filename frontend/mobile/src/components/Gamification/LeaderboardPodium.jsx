import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const medalColors = [colors.medalGold, colors.medalSilver, colors.medalBronze];
const names = (row, scope) => {
	if (scope === 'departments') return row.department?.name || row.department || row.name || 'Dział';
	if (scope === 'categories') return row.category?.name || row.category || row.name || 'Kategoria';
	const person = row.user || row;
	return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.nickname || person.username || 'Użytkownik';
};

export default function LeaderboardPodium({rows = [], scope = 'users'}) {
	if (!rows.length) return null;
	const positions = [rows[1], rows[0], rows[2]];
	return (
		<View style={styles.podium}>
			{positions.map((row, index) => {
				const rank = row?.rank ?? [2, 1, 3][index];
				if (!row) return <View key={index} style={styles.slot} />;
				const name = names(row, scope);
				return (
					<View key={index} style={[styles.slot, rank === 1 && styles.winner]}>
						<View style={[styles.avatar, {backgroundColor: `${medalColors[rank - 1]}25`}]}>
							{rank === 1 ? <Feather name="award" size={21} color={medalColors[0]} /> : <Text style={[styles.initial, {color: medalColors[rank - 1]}]}>{String(name).charAt(0).toUpperCase()}</Text>}
						</View>
						<Text style={styles.name} numberOfLines={2}>{name}</Text>
						<Text style={styles.points}>{row.points ?? 0} pkt</Text>
						<View style={[styles.base, {backgroundColor: `${medalColors[rank - 1]}25`, height: rank === 1 ? 54 : rank === 2 ? 39 : 29}]}><Text style={[styles.rank, {color: medalColors[rank - 1]}]}>{rank}</Text></View>
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	podium: {flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 16},
	slot: {flex: 1, alignItems: 'center', gap: 5, minWidth: 0},
	winner: {flex: 1.1},
	avatar: {width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center'},
	initial: {fontSize: 18, fontWeight: '800'},
	name: {fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center', minHeight: 30},
	points: {fontSize: 12, fontWeight: '800', color: colors.primary},
	base: {width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', justifyContent: 'center'},
	rank: {fontSize: 21, fontWeight: '800'},
});
