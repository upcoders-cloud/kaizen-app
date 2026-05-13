import {Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import Toast from 'react-native-toast-message';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {SPACE} from 'constants/constans';

const ROLE_LABEL = {
	MANAGER: 'Kierownik',
	EMPLOYEE: 'Pracownik',
};

const MenuRow = ({icon, label, hint, onPress, danger = false, disabled = false}) => (
	<Pressable
		onPress={onPress}
		disabled={disabled}
		style={({pressed}) => [
			styles.row,
			pressed && !disabled ? styles.rowPressed : null,
			disabled ? styles.rowDisabled : null,
		]}
	>
		<View style={[styles.rowIcon, danger ? styles.rowIconDanger : null]}>
			<Feather name={icon} size={16} color={danger ? colors.danger : colors.primary} />
		</View>
		<View style={{flex: 1}}>
			<Text style={[styles.rowLabel, danger ? styles.rowLabelDanger : null]}>{label}</Text>
			{hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
		</View>
		{!danger ? <Feather name="chevron-right" size={18} color={colors.mutedAlt} /> : null}
	</Pressable>
);

const Menu = () => {
	const router = useRouter();
	const {user, logout} = useAuthStore();

	const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(SPACE).trim();
	const avatar = user?.avatar_url || user?.image;
	const initials =
		(fullName && fullName.split(SPACE).map((p) => p[0]).join('').slice(0, 2).toUpperCase()) ||
		(user?.username ? user.username[0]?.toUpperCase() : 'U');
	const roleLabel = ROLE_LABEL[user?.role] || ROLE_LABEL.EMPLOYEE;

	const handleLogout = () => {
		const result = logout();
		if (result?.success) {
			Toast.show({type: 'success', text1: 'Wylogowano', visibilityTime: 1500});
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Text style={styles.title}>Menu</Text>
				</View>

				<Pressable
					onPress={() => router.push('/profile')}
					style={({pressed}) => [styles.profileCard, pressed ? styles.profileCardPressed : null]}
				>
					<View style={styles.avatarWrapper}>
						{avatar ? (
							<Image source={{uri: avatar}} style={styles.avatar} />
						) : (
							<View style={styles.avatarPlaceholder}>
								<Text style={styles.avatarInitials}>{initials}</Text>
							</View>
						)}
					</View>
					<View style={{flex: 1, gap: 2}}>
						<Text style={styles.profileName} numberOfLines={1}>
							{fullName || user?.username || 'Użytkownik'}
						</Text>
						{user?.nickname ? (
							<Text style={styles.profileNick} numberOfLines={1}>@{user.nickname}</Text>
						) : null}
						<View style={styles.roleBadge}>
							<Text style={styles.roleBadgeText}>{roleLabel}</Text>
						</View>
					</View>
					<Feather name="chevron-right" size={20} color={colors.mutedAlt} />
				</Pressable>

				<View style={styles.section}>
					<MenuRow
						icon="user"
						label="Mój profil"
						hint="Dane konta i avatar"
						onPress={() => router.push('/profile')}
					/>
					<MenuRow
						icon="edit-2"
						label="Edytuj profil"
						hint="Zmień dane i zdjęcie"
						onPress={() => router.push('/profile-edit')}
					/>
					<MenuRow
						icon="bookmark"
						label="Zapisane pomysły"
						hint="Twoje zakładki"
						onPress={() => router.push('/bookmarks')}
					/>
					<MenuRow
						icon="bell"
						label="Powiadomienia"
						hint="Lista aktywności"
						onPress={() => router.push('/notifications')}
					/>
				</View>

				<Text style={styles.sectionLabel}>Aplikacja</Text>
				<View style={styles.section}>
					<MenuRow icon="settings" label="Ustawienia" hint="Wkrótce" disabled />
					<MenuRow icon="help-circle" label="Pomoc" hint="Wkrótce" disabled />
					<MenuRow icon="info" label="O aplikacji" hint="Wkrótce" disabled />
				</View>

				<View style={[styles.section, styles.sectionDanger]}>
					<MenuRow icon="log-out" label="Wyloguj się" onPress={handleLogout} danger />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default Menu;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	content: {
		padding: 20,
		gap: 16,
	},
	header: {
		gap: 4,
	},
	title: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.text,
	},
	profileCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		padding: 16,
		borderRadius: 18,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowOffset: {width: 0, height: 6},
		shadowRadius: 14,
		elevation: 2,
	},
	profileCardPressed: {
		opacity: 0.8,
	},
	avatarWrapper: {
		width: 56,
		height: 56,
		borderRadius: 28,
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
		fontSize: 18,
		fontWeight: '800',
		color: colors.primary,
	},
	profileName: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	profileNick: {
		fontSize: 13,
		color: colors.primary,
		fontWeight: '600',
	},
	roleBadge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 999,
		backgroundColor: '#eef2ff',
		marginTop: 2,
	},
	roleBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.primary,
		letterSpacing: 0.3,
	},
	sectionLabel: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.muted,
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		marginTop: 4,
		marginLeft: 4,
	},
	section: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	sectionDanger: {
		borderColor: colors.danger,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	rowPressed: {
		backgroundColor: colors.placeholderSurface,
	},
	rowDisabled: {
		opacity: 0.5,
	},
	rowIcon: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: '#eef2ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowIconDanger: {
		backgroundColor: '#fee2e2',
	},
	rowLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	rowLabelDanger: {
		color: colors.danger,
	},
	rowHint: {
		fontSize: 12,
		color: colors.muted,
		marginTop: 2,
	},
});
