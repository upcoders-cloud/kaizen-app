import {Image, ScrollView, StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import {SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import {useAuthStore} from 'store/authStore';
import {SPACE} from "constants/constans";

const InfoRow = ({label, value}) => (
	<View style={styles.infoRow}>
		<Text style={styles.infoLabel}>{label}</Text>
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
				text1: 'Signed out',
				visibilityTime: 1500,
			});
		}
	};

	const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(SPACE).trim();
	const avatar = user?.image;
	const initials =
		(fullName && fullName.split(SPACE).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) ||
		(user?.username ? user.username[0]?.toUpperCase() : 'U');

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.decorativeBubble} />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Text style={styles.screenTitle}>Profil</Text>
					<Text style={styles.screenSubtitle}>Twoje dane i ustawienia konta</Text>
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
							<Text style={styles.name}>{fullName || user?.username || 'User'}</Text>
							<Text style={styles.subtext}>{user?.email || 'Brak emaila'}</Text>
							<Text style={styles.username}>@{user?.username || 'anonymous'}</Text>
						</View>
					</View>
					<View style={styles.badges}>
						<View style={styles.badge}>
							<Text style={styles.badgeText}>
								Status: {isAuthenticated ? 'Zalogowany' : 'Gość'}
							</Text>
						</View>
						{user?.id ? (
							<View style={styles.badgeMuted}>
								<Text style={styles.badgeTextMuted}>ID: {user.id}</Text>
							</View>
						) : null}
					</View>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Dane użytkownika</Text>
					<View style={styles.infoList}>
						<InfoRow label="Email" value={user?.email} />
						<InfoRow label="Login" value={user?.username} />
						<InfoRow label="Imię i nazwisko" value={fullName || '—'} />
						<InfoRow label="Płeć" value={user?.gender} />
					</View>
				</View>

				<Button
					title="Wyloguj"
					onPress={handleLogout}
					variant="primary"
					style={styles.logoutButton}
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
	screenSubtitle: {
		color: colors.muted,
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
	subtext: {
		color: colors.muted,
	},
	username: {
		color: colors.primary,
		fontWeight: '600',
	},
	badges: {
		flexDirection: 'row',
		gap: 8,
		flexWrap: 'wrap',
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#22c55e22',
		borderWidth: 1,
		borderColor: '#22c55e55',
	},
	badgeMuted: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#e2e8f0',
		borderWidth: 1,
		borderColor: colors.border,
	},
	badgeText: {
		color: '#166534',
		fontWeight: '600',
	},
	badgeTextMuted: {
		color: colors.text,
		fontWeight: '600',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	infoList: {
		gap: 12,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: 10,
	},
	infoLabel: {
		color: colors.muted,
		fontWeight: '600',
	},
	infoValue: {
		color: colors.text,
		fontWeight: '700',
		textAlign: 'right',
	},
	logoutButton: {
		marginTop: 4,
		minWidth: '100%',
	},
});
