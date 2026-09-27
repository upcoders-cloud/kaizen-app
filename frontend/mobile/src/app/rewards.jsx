import {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import Text from 'components/Text/Text';
import RewardCard from 'components/Gamification/RewardCard';
import BackButton from 'components/Navigation/BackButton';
import gamificationService from 'src/server/services/gamificationService';
import colors from 'theme/colors';
import {Card, EmptyState, ErrorState, SectionHeader} from 'components/ui';

const TABS = [
	{key: 'catalog', label: 'Katalog'},
	{key: 'history', label: 'Wymiany'},
	{key: 'points', label: 'Punkty'},
];
const STATUS = {
	PENDING: 'Oczekuje',
	APPROVED: 'Zatwierdzona',
	DELIVERED: 'Wydana',
	REJECTED: 'Odrzucona',
};
const formatDate = (date) => date
	? new Date(date).toLocaleDateString('pl-PL', {day: 'numeric', month: 'short', year: 'numeric'})
	: '';
const asList = (value) => Array.isArray(value) ? value : value?.results ?? [];

export default function Rewards() {
	const router = useRouter();
	const [tab, setTab] = useState('catalog');
	const [me, setMe] = useState(null);
	const [rewards, setRewards] = useState([]);
	const [redemptions, setRedemptions] = useState([]);
	const [transactions, setTransactions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [redeemingId, setRedeemingId] = useState(null);
	const [error, setError] = useState(null);

	const load = useCallback(async ({refresh = false} = {}) => {
		refresh ? setRefreshing(true) : setLoading(true);
		setError(null);
		const results = await Promise.allSettled([
			gamificationService.me(),
			gamificationService.rewards(),
			gamificationService.myRedemptions(),
			gamificationService.transactions(),
		]);
		const [profile, catalog, history, ledger] = results;
		if (profile.status === 'fulfilled') setMe(profile.value);
		if (catalog.status === 'fulfilled') setRewards(asList(catalog.value));
		if (history.status === 'fulfilled') setRedemptions(asList(history.value));
		if (ledger.status === 'fulfilled') setTransactions(asList(ledger.value));
		if (results.every((result) => result.status === 'rejected')) {
			setError('Nie udało się pobrać sklepu nagród. Spróbuj ponownie.');
		}
		setLoading(false);
		setRefreshing(false);
	}, []);

	useFocusEffect(useCallback(() => { void load(); }, [load]));

	const confirmRedeem = (reward) => {
		Alert.alert(
			'Wymień punkty',
			`Wymienić ${reward.cost_points} pkt na „${reward.name}”?`,
			[
				{text: 'Anuluj', style: 'cancel'},
				{text: 'Wymień', onPress: () => void redeem(reward)},
			],
		);
	};
	const redeem = async (reward) => {
		setRedeemingId(reward.id);
		try {
			await gamificationService.redeem(reward.id);
			Toast.show({type: 'success', text1: 'Nagroda zamówiona', text2: 'Status sprawdzisz w historii wymian.'});
			await load({refresh: true});
		} catch (err) {
			Toast.show({type: 'error', text1: 'Nie udało się wymienić punktów', text2: err?.message});
		} finally {
			setRedeemingId(null);
		}
	};
	const availableCount = useMemo(() => rewards.filter((reward) => reward.affordable && reward.stock !== 0).length, [rewards]);

	return (
		<>
			<Stack.Screen options={{title: 'Sklep nagród', headerShown: true, headerLeft: () => <BackButton onPress={() => router.back()} />}} />
			<SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
				<ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load({refresh: true})} tintColor={colors.primary} />}>
					<Card style={styles.hero} padded={false} elevated>
						<View style={styles.heroIcon}><Feather name="gift" size={24} color={colors.primary} /></View>
						<Text style={styles.eyebrow}>TWOJE SALDO</Text>
						<Text style={styles.balance}>{me?.points ?? 0} <Text style={styles.balanceUnit}>pkt</Text></Text>
						<Text style={styles.heroHint}>Punkty zdobywasz za pomysły i aktywność. {availableCount ? `Możesz już wymienić ${availableCount} nagród.` : 'Zobacz dostępne nagrody.'}</Text>
					</Card>
					<View style={styles.tabs}>
						{TABS.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}><Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text></Pressable>)}
					</View>
					{loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : error ? <ErrorState description={error} onRetry={() => void load()} /> : tab === 'catalog' ? (
						<View style={styles.list}>
							<SectionHeader title="Nagrody do zdobycia" />
							{rewards.length ? rewards.map((reward) => <RewardCard key={reward.id} reward={reward} onRedeem={confirmRedeem} redeeming={redeemingId === reward.id} />) : <EmptyState icon="gift" title="Na razie bez nagród" description="Nagrody pojawią się tutaj wkrótce." />}
						</View>
					) : tab === 'history' ? (
						<View style={styles.list}>
							<SectionHeader title="Historia wymian" />
							{redemptions.length ? redemptions.map((item) => <View key={item.id} style={styles.historyCard}><View style={styles.historyIcon}><Feather name="gift" size={17} color={colors.primary} /></View><View style={styles.historyBody}><Text style={styles.itemTitle}>{item.reward?.name || 'Nagroda'}</Text><Text style={styles.itemMeta}>{formatDate(item.created_at)} · {item.points_spent} pkt</Text>{item.note ? <Text style={styles.itemMeta}>{item.note}</Text> : null}</View><Text style={styles.status}>{STATUS[item.status] || item.status}</Text></View>) : <EmptyState icon="inbox" title="Brak wymian" description="Gdy wymienisz punkty, historia pojawi się tutaj." />}
						</View>
					) : (
						<View style={styles.list}>
							<SectionHeader title="Historia punktów" />
							{transactions.length ? transactions.map((item) => <View key={item.id} style={styles.transaction}><View style={styles.transactionIcon}><Feather name={item.points >= 0 ? 'plus' : 'minus'} size={15} color={item.points >= 0 ? colors.primary : colors.danger} /></View><View style={styles.historyBody}><Text style={styles.itemTitle}>{item.action_display || item.action}</Text><Text style={styles.itemMeta}>{formatDate(item.created_at)}</Text></View><Text style={[styles.transactionPoints, item.points < 0 && styles.negative]}>{item.points > 0 ? '+' : ''}{item.points}</Text></View>) : <EmptyState icon="trending-up" title="Brak transakcji" description="Historia punktów pojawi się tutaj." />}
						</View>
					)}
				</ScrollView>
			</SafeAreaView>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {flex: 1, backgroundColor: colors.background},
	content: {padding: 18, gap: 18, paddingBottom: 36},
	hero: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 22, gap: 7},
	heroIcon: {width: 46, height: 46, borderRadius: 15, backgroundColor: colors.badgeBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 5},
	eyebrow: {fontSize: 11, color: colors.muted, fontWeight: '800', letterSpacing: 1.2},
	balance: {fontSize: 36, fontWeight: '800', color: colors.primary},
	balanceUnit: {fontSize: 19, color: colors.muted},
	heroHint: {fontSize: 13, color: colors.muted, lineHeight: 19},
	tabs: {flexDirection: 'row', backgroundColor: colors.border, borderRadius: 14, padding: 4},
	tab: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11},
	tabActive: {backgroundColor: colors.surface},
	tabText: {fontSize: 13, fontWeight: '700', color: colors.muted},
	tabTextActive: {color: colors.primary},
	loader: {marginTop: 40},
	list: {gap: 11},
	sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 2},
	empty: {padding: 25, color: colors.muted, textAlign: 'center', lineHeight: 20},
	historyCard: {flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 14},
	historyIcon: {width: 36, height: 36, borderRadius: 12, backgroundColor: colors.badgeBackground, alignItems: 'center', justifyContent: 'center'},
	historyBody: {flex: 1, gap: 3},
	itemTitle: {fontSize: 14, fontWeight: '700', color: colors.text},
	itemMeta: {fontSize: 12, color: colors.muted},
	status: {fontSize: 11, fontWeight: '700', color: colors.primary},
	transaction: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface},
	transactionIcon: {width: 30, height: 30, borderRadius: 10, backgroundColor: colors.badgeBackground, alignItems: 'center', justifyContent: 'center'},
	transactionPoints: {fontSize: 16, fontWeight: '800', color: colors.primary},
	negative: {color: colors.danger},
});
