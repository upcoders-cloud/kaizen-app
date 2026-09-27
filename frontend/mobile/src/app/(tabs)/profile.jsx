import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import colors from 'theme/colors';
import {SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import {useAuthStore} from 'store/authStore';
import {SPACE} from 'constants/constans';
import usersService from 'src/server/services/usersService';
import gamificationService from 'src/server/services/gamificationService';
import LevelProgress from 'components/Gamification/LevelProgress';
import BadgeGrid from 'components/Gamification/BadgeGrid';
import {getJwtPayload} from 'utils/jwt';
import {Avatar, Card, SectionHeader} from 'components/ui';

const ROLE_CONFIG = {
	TEAM_LEAD: {label: 'Lider zespołu', icon: 'users', bg: colors.roleLeadSurface, border: colors.roleLeadBorder, color: colors.roleLeadText},
	MANAGER: {label: 'Kierownik', icon: 'shield', bg: colors.roleManagerSurface, border: colors.roleManagerBorder, color: colors.roleManagerText},
	DIRECTOR: {label: 'Dyrektor', icon: 'briefcase', bg: colors.roleDirectorSurface, border: colors.roleDirectorBorder, color: colors.roleDirectorText},
	EMPLOYEE: {label: 'Pracownik', icon: 'user', bg: colors.roleEmployeeSurface, border: colors.roleEmployeeBorder, color: colors.roleEmployeeText},
};

const InfoRow = ({label, value, icon}) => (
	<View style={styles.infoRow}>
		<View style={styles.infoLeft}>
			{icon ? <Feather name={icon} size={14} color={colors.muted} /> : null}
			<Text style={styles.infoLabel}>{label}</Text>
		</View>
		<Text style={styles.infoValue}>{value || '-'}</Text>
	</View>
);

const Profile = () => {
	const {logout, user, isAuthenticated, accessToken} = useAuthStore();
	const router = useRouter();
	const userId = user?.id ?? getJwtPayload(accessToken)?.user_id;
	const [publicProfile, setPublicProfile] = useState(null);
	const [gamification, setGamification] = useState(null);
	useFocusEffect(useCallback(() => {
		let active = true;
		const load = async () => {
			const [profileResult, gameResult] = await Promise.allSettled([
				userId ? usersService.get(userId) : usersService.me(),
				gamificationService.me(),
			]);
			if (!active) return;
			if (profileResult.status === 'fulfilled') setPublicProfile(profileResult.value);
			if (gameResult.status === 'fulfilled') setGamification(gameResult.value);
		};
		void load();
		return () => { active = false; };
	}, [userId]));

	const handleLogout = () => {
		const result = logout();
		if (result?.success) {
			Toast.show({
				type: 'success',
				text1: 'Wylogowano',
				visibilityTime: 1500,
			});
		}
	};

	const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(SPACE).trim();
	const avatar = user?.avatar_url || user?.image;
	const initials =
		(fullName && fullName.split(SPACE).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) ||
		(user?.username ? user.username[0]?.toUpperCase() : 'U');
	const role = ROLE_CONFIG[user?.role] || ROLE_CONFIG.EMPLOYEE;
	const stats = publicProfile?.stats || {};
	const statItems = [
		{label: 'Pomysły', value: stats.ideas ?? 0, icon: 'file-text'},
		{label: 'Wdrożone', value: stats.implemented ?? 0, icon: 'check-circle'},
		{label: 'Polubienia', value: stats.likes_received ?? 0, icon: 'thumbs-up'},
		{label: 'Oszczędności', value: `${Number(stats.savings ?? 0).toLocaleString('pl-PL')} zł`, icon: 'trending-up'},
	];

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.decorativeBubble} />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Text style={styles.screenTitle}>Profil</Text>
					<Pressable onPress={() => router.push('/profile-edit')} style={styles.editButton}>
						<Feather name="edit-2" size={14} color={colors.primary} />
						<Text style={styles.editButtonText}>Edytuj</Text>
					</Pressable>
				</View>

				<Card style={styles.card} padded={false} elevated>
					<View style={styles.profileRow}>
						<Avatar name={fullName || user?.username || initials} uri={avatar} size={72} />
						<View style={styles.headerText}>
							<Text style={styles.name}>{fullName || user?.username || 'Użytkownik'}</Text>
							{user?.nickname ? (
								<Text style={styles.nickname}>@{user.nickname}</Text>
							) : null}
						</View>
					</View>
					<View style={styles.badges}>
						<View style={[styles.roleBadge, {backgroundColor: role.bg, borderColor: role.border}]}>
							<Feather name={role.icon} size={13} color={role.color} />
							<Text style={[styles.roleBadgeText, {color: role.color}]}>{role.label}</Text>
						</View>
						{isAuthenticated ? (
							<View style={styles.statusBadge}>
								<View style={styles.statusDot} />
								<Text style={styles.statusBadgeText}>Aktywny</Text>
							</View>
						) : null}
					</View>
				</Card>

				<LevelProgress me={gamification} />
				<View style={styles.statsGrid}>
					{statItems.map((item) => <Card key={item.label} style={styles.statCard} padded={false}><Feather name={item.icon} size={16} color={colors.primary} /><Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text></Card>)}
				</View>
				<Card style={styles.card} padded={false}>
					<SectionHeader title="Moje odznaki" action={<Pressable onPress={() => router.push('/ranking')}><Text style={styles.sectionLink}>Zobacz ranking</Text></Pressable>} />
					<BadgeGrid badges={gamification?.badges?.filter((item) => item.earned).slice(0, 4) || []} />
				</Card>

				<Card style={styles.card} padded={false}>
					<Text style={styles.sectionTitle}>Dane konta</Text>
					<View style={styles.infoList}>
						<InfoRow icon="mail" label="Email" value={user?.email} />
						<InfoRow icon="at-sign" label="Login" value={user?.username} />
						<InfoRow icon="user" label="Imię i nazwisko" value={fullName || '-'} />
						<InfoRow icon="grid" label="Dział" value={publicProfile?.department_name || user?.department_name} />
						<InfoRow icon="users" label="Płeć" value={user?.gender} />
					</View>
				</Card>

				<Button
					title="Wyloguj się"
					onPress={handleLogout}
					variant="outline"
					leftIcon={<Feather name="log-out" size={16} color={colors.danger} />}
					style={styles.logoutButton}
					textStyle={styles.logoutText}
				/>
			</ScrollView>
		</SafeAreaView>
	);
};

export default Profile;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: 20,
		paddingVertical: 20,
		gap: 16,
	},
	decorativeBubble: {
		position: 'absolute',
		right: -60,
		top: -60,
		width: 180,
		height: 180,
		borderRadius: 90,
		backgroundColor: colors.accentWash,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	screenTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.text,
	},
	editButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.primary,
		backgroundColor: colors.surface,
	},
	editButtonText: {
		color: colors.primary,
		fontWeight: '700',
		fontSize: 13,
	},
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 16,
		padding: 18,
		gap: 14,
		shadowColor: colors.primary,
		shadowOpacity: 0.03,
		shadowOffset: {width: 0, height: 6},
		shadowRadius: 12,
		elevation: 2,
	},
	statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
	statCard: {width: '47%', flexGrow: 1, gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15},
	statValue: {fontSize: 19, fontWeight: '800', color: colors.text},
	statLabel: {fontSize: 12, fontWeight: '600', color: colors.muted},
	sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
	sectionLink: {fontSize: 12, fontWeight: '700', color: colors.primary},
	profileRow: {
		flexDirection: 'row',
		gap: 14,
		alignItems: 'center',
	},
	avatarWrapper: {
		width: 72,
		height: 72,
		borderRadius: 36,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: colors.primary,
		backgroundColor: colors.surface,
	},
	avatar: {
		width: '100%',
		height: '100%',
	},
	avatarPlaceholder: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.border,
	},
	avatarInitials: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.primary,
	},
	headerText: {
		flex: 1,
		gap: 4,
	},
	name: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.text,
	},
	nickname: {
		color: colors.primary,
		fontWeight: '600',
		fontSize: 14,
	},
	badges: {
		flexDirection: 'row',
		gap: 8,
		flexWrap: 'wrap',
	},
	roleBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
	},
	roleBadgeText: {
		fontSize: 13,
		fontWeight: '700',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: colors.successSoft,
		borderWidth: 1,
		borderColor: colors.success,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.success,
	},
	statusBadgeText: {
		color: colors.success,
		fontSize: 13,
		fontWeight: '600',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	infoList: {
		gap: 0,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	infoLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	infoLabel: {
		color: colors.muted,
		fontWeight: '600',
		fontSize: 14,
	},
	infoValue: {
		color: colors.text,
		fontWeight: '700',
		fontSize: 14,
		textAlign: 'right',
	},
	logoutButton: {
		marginTop: 4,
		borderColor: colors.danger,
	},
	logoutText: {
		color: colors.danger,
	},
});
