import {Image, ScrollView, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import {SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import {useAuthStore} from 'store/authStore';
import {SPACE} from 'constants/constans';

const ROLE_CONFIG = {
	MANAGER: {label: 'Kierownik', icon: 'shield', bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6'},
	EMPLOYEE: {label: 'Pracownik', icon: 'user', bg: '#dbeafe', border: '#93c5fd', color: '#1e40af'},
};

const InfoRow = ({label, value, icon}) => (
	<View style={styles.infoRow}>
		<View style={styles.infoLeft}>
			{icon ? <Feather name={icon} size={14} color={colors.muted} /> : null}
			<Text style={styles.infoLabel}>{label}</Text>
		</View>
		<Text style={styles.infoValue}>{value || '—'}</Text>
	</View>
);

const Profile = () => {
	const {logout, user, isAuthenticated} = useAuthStore();

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
	const avatar = user?.image;
	const initials =
		(fullName && fullName.split(SPACE).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) ||
		(user?.username ? user.username[0]?.toUpperCase() : 'U');
	const role = ROLE_CONFIG[user?.role] || ROLE_CONFIG.EMPLOYEE;

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.decorativeBubble} />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Text style={styles.screenTitle}>Profil</Text>
				</View>

				<View style={styles.card}>
					<View style={styles.profileRow}>
						<View style={styles.avatarWrapper}>
							{avatar ? (
								<Image source={{uri: avatar}} style={styles.avatar} />
							) : (
								<View style={styles.avatarPlaceholder}>
									<Text style={styles.avatarInitials}>{initials}</Text>
								</View>
							)}
						</View>
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
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Dane konta</Text>
					<View style={styles.infoList}>
						<InfoRow icon="mail" label="Email" value={user?.email} />
						<InfoRow icon="at-sign" label="Login" value={user?.username} />
						<InfoRow icon="user" label="Imię i nazwisko" value={fullName || '—'} />
						<InfoRow icon="users" label="Płeć" value={user?.gender} />
					</View>
				</View>

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
		backgroundColor: '#36d1dc22',
	},
	header: {
		gap: 4,
	},
	screenTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.text,
	},
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 16,
		padding: 18,
		gap: 14,
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowOffset: {width: 0, height: 6},
		shadowRadius: 12,
		elevation: 2,
	},
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
		backgroundColor: '#f0fdf4',
		borderWidth: 1,
		borderColor: '#bbf7d0',
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#22c55e',
	},
	statusBadgeText: {
		color: '#166534',
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
