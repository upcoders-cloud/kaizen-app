import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {getJwtPayload} from 'utils/jwt';
import gamificationService from 'src/server/services/gamificationService';
import LevelProgress from 'components/Gamification/LevelProgress';
import LeaderboardList from 'components/Gamification/LeaderboardList';
import BadgeGrid from 'components/Gamification/BadgeGrid';
import RewardCard from 'components/Gamification/RewardCard';

const TABS = [
	{key: 'ranking', label: 'Ranking'},
	{key: 'badges', label: 'Odznaki'},
	{key: 'rewards', label: 'Nagrody'},
];
const PERIODS = [
	{key: 'all', label: 'Cały czas'},
	{key: 'month', label: 'Miesiąc'},
	{key: 'week', label: 'Tydzień'},
];
const SCOPES = [
	{key: 'users', label: 'Osoby'},
	{key: 'categories', label: 'Kategorie'},
	{key: 'departments', label: 'Działy'},
];

const Segmented = ({options, value, onChange}) => (
	<View style={styles.segmented}>
		{options.map((opt) => {
			const active = opt.key === value;
			return (
				<Pressable
					key={opt.key}
					onPress={() => onChange(opt.key)}
					style={[styles.segment, active ? styles.segmentActive : null]}
				>
					<Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
						{opt.label}
					</Text>
				</Pressable>
			);
		})}
	</View>
);

const Ranking = () => {
	const accessToken = useAuthStore((s) => s.accessToken);
	const currentUserId = getJwtPayload(accessToken)?.user_id ?? null;

	const [tab, setTab] = useState('ranking');
	const [period, setPeriod] = useState('all');
	const [scope, setScope] = useState('users');
	const [me, setMe] = useState(null);
	const [leaderboard, setLeaderboard] = useState([]);
	const [rewards, setRewards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [redeemingId, setRedeemingId] = useState(null);

	const load = useCallback(
		async ({refresh = false} = {}) => {
			refresh ? setRefreshing(true) : setLoading(true);
			try {
				const [meData, lbData, rewardsData] = await Promise.all([
					gamificationService.me(),
					gamificationService.leaderboard({scope, period}),
					gamificationService.rewards(),
				]);
				setMe(meData);
				setLeaderboard(Array.isArray(lbData) ? lbData : lbData?.results ?? []);
				setRewards(Array.isArray(rewardsData) ? rewardsData : rewardsData?.results ?? []);
			} catch (err) {
				Toast.show({type: 'error', text1: 'Nie udało się pobrać danych', text2: err?.message});
			} finally {
				refresh ? setRefreshing(false) : setLoading(false);
			}
		},
		[scope, period]
	);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	const handleRedeem = async (reward) => {
		setRedeemingId(reward.id);
		try {
			await gamificationService.redeem(reward.id);
			Toast.show({type: 'success', text1: 'Nagroda zamówiona!', text2: 'Status sprawdzisz w historii.'});
			await load({refresh: true});
		} catch (err) {
			Toast.show({type: 'error', text1: 'Nie udało się wymienić', text2: err?.message});
		} finally {
			setRedeemingId(null);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => load({refresh: true})}
						tintColor={colors.primary}
					/>
				}
			>
				<Text style={styles.title}>Ranking</Text>

				<LevelProgress me={me} />

				<Segmented options={TABS} value={tab} onChange={setTab} />

				{tab === 'ranking' ? (
					<View style={styles.section}>
						<Segmented options={SCOPES} value={scope} onChange={setScope} />
						<Segmented options={PERIODS} value={period} onChange={setPeriod} />
						{loading ? (
							<Text style={styles.loading}>Ładowanie…</Text>
						) : (
							<LeaderboardList scope={scope} rows={leaderboard} currentUserId={currentUserId} />
						)}
					</View>
				) : null}

				{tab === 'badges' ? (
					<View style={styles.section}>
						<BadgeGrid badges={me?.badges || []} />
					</View>
				) : null}

				{tab === 'rewards' ? (
					<View style={styles.section}>
						<Text style={styles.balanceText}>
							Twoje saldo: <Text style={styles.balanceStrong}>{me?.points ?? 0} pkt</Text>
						</Text>
						{rewards.length ? (
							rewards.map((r) => (
								<RewardCard
									key={r.id}
									reward={r}
									onRedeem={handleRedeem}
									redeeming={redeemingId === r.id}
								/>
							))
						) : (
							<Text style={styles.loading}>Brak dostępnych nagród.</Text>
						)}
					</View>
				) : null}
			</ScrollView>
		</SafeAreaView>
	);
};

export default Ranking;

const styles = StyleSheet.create({
	safeArea: {flex: 1, backgroundColor: colors.background},
	content: {padding: 20, gap: 16},
	title: {fontSize: 24, fontWeight: '800', color: colors.text},
	segmented: {
		flexDirection: 'row',
		backgroundColor: colors.placeholderSurface,
		borderRadius: 12,
		padding: 4,
		gap: 4,
	},
	segment: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: 9,
		alignItems: 'center',
	},
	segmentActive: {
		backgroundColor: colors.surface,
		shadowColor: '#0f172a',
		shadowOpacity: 0.08,
		shadowRadius: 6,
		shadowOffset: {width: 0, height: 2},
		elevation: 2,
	},
	segmentText: {fontSize: 13, fontWeight: '600', color: colors.muted},
	segmentTextActive: {color: colors.primary, fontWeight: '800'},
	section: {gap: 12},
	loading: {color: colors.muted, textAlign: 'center', paddingVertical: 24},
	balanceText: {fontSize: 14, color: colors.muted},
	balanceStrong: {fontWeight: '800', color: colors.primary},
});
