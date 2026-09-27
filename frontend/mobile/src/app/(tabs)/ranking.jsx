import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {useRouter} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {getJwtPayload} from 'utils/jwt';
import gamificationService from 'src/server/services/gamificationService';
import LevelProgress from 'components/Gamification/LevelProgress';
import LeaderboardList from 'components/Gamification/LeaderboardList';
import LeaderboardPodium from 'components/Gamification/LeaderboardPodium';
import BadgeGrid from 'components/Gamification/BadgeGrid';

const PERIODS = [
	{key: 'week', label: 'Tydzień'},
	{key: 'month', label: 'Miesiąc'},
	{key: 'quarter', label: 'Kwartał'},
	{key: 'all', label: 'Cały czas'},
];
const periodLabel = (key) => PERIODS.find((item) => item.key === key)?.label || 'Cały czas';
const SCOPES = [
	{key: 'users', label: 'Osoby'},
	{key: 'departments', label: 'Działy'},
	{key: 'categories', label: 'Kategorie'},
];
const asList = (value) => Array.isArray(value) ? value : value?.results ?? value?.rows ?? [];

const Segmented = ({options, value, onChange}) => (
	<View style={styles.segmented}>
		{options.map((option) => <Pressable key={option.key} onPress={() => onChange(option.key)} style={[styles.segment, value === option.key && styles.segmentActive]}><Text style={[styles.segmentText, value === option.key && styles.segmentTextActive]}>{option.label}</Text></Pressable>)}
	</View>
);

export default function Ranking() {
	const router = useRouter();
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = getJwtPayload(accessToken)?.user_id ?? null;
	const [period, setPeriod] = useState('month');
	const [scope, setScope] = useState('users');
	const [me, setMe] = useState(null);
	const [myRank, setMyRank] = useState(null);
	const [leaderboard, setLeaderboard] = useState([]);
	const [badges, setBadges] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);

	const load = useCallback(async ({refresh = false} = {}) => {
		refresh ? setRefreshing(true) : setLoading(true);
		setError(null);
		const [profile, ranking, badgeResult] = await Promise.allSettled([
			gamificationService.me(),
			gamificationService.leaderboard({scope, period}),
			gamificationService.badges(),
		]);
		if (profile.status === 'fulfilled') {
			setMe(profile.value);
			setBadges(profile.value?.badges || []);
		}
		if (ranking.status === 'fulfilled') {
			setLeaderboard(asList(ranking.value));
			setMyRank(ranking.value?.me ?? null);
		} else setError('Nie udało się pobrać rankingu. Przeciągnij w dół, aby spróbować ponownie.');
		if (badgeResult.status === 'fulfilled') setBadges(asList(badgeResult.value));
		setLoading(false);
		setRefreshing(false);
	}, [scope, period]);

	useFocusEffect(useCallback(() => { void load(); }, [load]));

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load({refresh: true})} tintColor={colors.primary} />}>
				<View style={styles.header}><View><Text style={styles.eyebrow}>SPOŁECZNOŚĆ KAIZEN</Text><Text style={styles.title}>Ranking</Text></View><Pressable onPress={() => router.push('/rewards')} style={styles.shopButton}><Feather name="gift" size={16} color={colors.primary} /><Text style={styles.shopText}>Nagrody</Text></Pressable></View>
				<LevelProgress me={me} />
				<View style={styles.section}><Text style={styles.sectionTitle}>Najbardziej aktywni</Text><Segmented options={SCOPES} value={scope} onChange={setScope} /><Segmented options={PERIODS} value={period} onChange={setPeriod} /></View>
				{myRank?.rank != null && scope === 'users' ? <View style={styles.myRank}><Feather name="user" size={16} color={colors.primary} /><Text style={styles.myRankLabel}>Twoja pozycja · {periodLabel(period)}</Text><Text style={styles.myRankValue}>#{myRank.rank} · {myRank.points} pkt</Text></View> : null}
				{loading ? <Text style={styles.message}>Ładowanie rankingu...</Text> : error ? <Text style={styles.message}>{error}</Text> : <><LeaderboardPodium rows={leaderboard.slice(0, 3)} scope={scope} /><LeaderboardList scope={scope} rows={leaderboard} currentUserId={currentUserId} /></>}
				<View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Odznaki</Text><Feather name="award" size={18} color={colors.primary} /></View><BadgeGrid badges={badges} /></View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {flex: 1, backgroundColor: colors.background},
	content: {padding: 18, gap: 18, paddingBottom: 38},
	header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
	eyebrow: {fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1},
	title: {fontSize: 27, fontWeight: '800', color: colors.text},
	shopButton: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
	shopText: {fontSize: 13, fontWeight: '700', color: colors.primary},
	section: {gap: 11},
	sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
	sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.text},
	segmented: {flexDirection: 'row', backgroundColor: colors.border, borderRadius: 12, padding: 3, gap: 3},
	segment: {flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 8, borderRadius: 10},
	segmentActive: {backgroundColor: colors.surface},
	segmentText: {fontSize: 11, fontWeight: '700', color: colors.muted, textAlign: 'center'},
	segmentTextActive: {color: colors.primary},
	myRank: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 14, backgroundColor: colors.badgeBackground},
	myRankLabel: {flex: 1, fontSize: 13, fontWeight: '700', color: colors.primary},
	myRankValue: {fontSize: 13, fontWeight: '800', color: colors.primary},
	message: {padding: 24, color: colors.muted, textAlign: 'center'},
});
