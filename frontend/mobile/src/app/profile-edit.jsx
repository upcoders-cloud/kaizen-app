import {useState} from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import * as ExpoImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import Button from 'components/Button/Button';
import Input from 'components/Input/Input';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import usersService from 'src/server/services/usersService';
import {useAuthStore} from 'store/authStore';
import {SPACE} from 'constants/constans';

const GENDER_OPTIONS = [
	{key: 'male', label: 'Mężczyzna'},
	{key: 'female', label: 'Kobieta'},
	{key: 'other', label: 'Inna'},
	{key: 'unspecified', label: 'Nie podano'},
];

const ProfileEdit = () => {
	const router = useRouter();
	const {user, updateUser} = useAuthStore();

	const [nickname, setNickname] = useState(user?.nickname ?? '');
	const [firstName, setFirstName] = useState(user?.first_name ?? '');
	const [lastName, setLastName] = useState(user?.last_name ?? '');
	const [gender, setGender] = useState(user?.gender ?? 'unspecified');
	const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ?? null);
	const [avatarBase64, setAvatarBase64] = useState(null);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState({});

	const fullName = [firstName, lastName].filter(Boolean).join(SPACE).trim();
	const initials =
		(fullName && fullName.split(SPACE).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) ||
		(user?.username ? user.username[0]?.toUpperCase() : 'U');

	const handlePickAvatar = async () => {
		const {status} = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Brak uprawnień', 'Aby wybrać zdjęcie potrzebny jest dostęp do galerii.');
			return;
		}
		const result = await ExpoImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.7,
			base64: true,
		});
		if (result?.canceled) return;
		const asset = result?.assets?.[0];
		if (!asset?.base64) return;
		setAvatarPreview(asset.uri);
		setAvatarBase64(asset.base64);
	};

	const handleRemoveAvatar = () => {
		setAvatarPreview(null);
		setAvatarBase64(null);
	};

	const handleSave = async () => {
		const trimmedNick = nickname.trim();
		if (!trimmedNick) {
			setErrors({nickname: 'Pseudonim jest wymagany'});
			return;
		}
		setErrors({});
		setSaving(true);
		try {
			const payload = {
				nickname: trimmedNick,
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				gender,
			};
			if (avatarBase64) {
				payload.avatar = avatarBase64;
			} else if (!avatarPreview && user?.avatar_url) {
				payload.avatar = null;
			}
			const response = await usersService.updateMe(payload);
			updateUser({
				nickname: response.nickname,
				first_name: response.first_name,
				last_name: response.last_name,
				gender: response.gender,
				avatar_url: response.avatar_url,
			});
			Toast.show({
				type: 'success',
				text1: 'Profil zaktualizowany',
				visibilityTime: 1800,
			});
			router.back();
		} catch (err) {
			const fieldErrors = err?.data && typeof err.data === 'object' ? err.data : null;
			if (fieldErrors) {
				const mapped = {};
				Object.keys(fieldErrors).forEach((key) => {
					const value = fieldErrors[key];
					mapped[key] = Array.isArray(value) ? value[0] : String(value);
				});
				setErrors(mapped);
			}
			Toast.show({
				type: 'error',
				text1: 'Nie udało się zapisać',
				text2: err?.message || 'Spróbuj ponownie',
				visibilityTime: 2400,
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<View style={styles.header}>
					<Pressable onPress={() => router.back()} style={styles.backButton}>
						<Feather name="chevron-left" size={20} color={colors.text} />
					</Pressable>
					<Text style={styles.title}>Edytuj profil</Text>
					<View style={styles.headerSpacer} />
				</View>

				<View style={styles.avatarSection}>
					<View style={styles.avatarWrapper}>
						{avatarPreview ? (
							<Image source={{uri: avatarPreview}} style={styles.avatar} />
						) : (
							<View style={styles.avatarPlaceholder}>
								<Text style={styles.avatarInitials}>{initials}</Text>
							</View>
						)}
					</View>
					<View style={styles.avatarActions}>
						<Pressable style={styles.avatarButton} onPress={handlePickAvatar}>
							<Feather name="camera" size={14} color={colors.primary} />
							<Text style={styles.avatarButtonText}>Zmień zdjęcie</Text>
						</Pressable>
						{avatarPreview ? (
							<Pressable style={[styles.avatarButton, styles.avatarButtonDanger]} onPress={handleRemoveAvatar}>
								<Feather name="trash-2" size={14} color={colors.danger} />
								<Text style={[styles.avatarButtonText, {color: colors.danger}]}>Usuń</Text>
							</Pressable>
						) : null}
					</View>
				</View>

				<View style={styles.card}>
					<Input
						label="Pseudonim"
						value={nickname}
						onChangeText={setNickname}
						error={errors.nickname}
						autoCapitalize="none"
					/>
					<Input
						label="Imię"
						value={firstName}
						onChangeText={setFirstName}
						error={errors.first_name}
					/>
					<Input
						label="Nazwisko"
						value={lastName}
						onChangeText={setLastName}
						error={errors.last_name}
					/>

					<Text style={styles.fieldLabel}>Płeć</Text>
					<View style={styles.genderRow}>
						{GENDER_OPTIONS.map((option) => {
							const isActive = gender === option.key;
							return (
								<Pressable
									key={option.key}
									style={[styles.genderPill, isActive ? styles.genderPillActive : null]}
									onPress={() => setGender(option.key)}
								>
									<Text
										style={[styles.genderPillText, isActive ? styles.genderPillTextActive : null]}
									>
										{option.label}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>

				<View style={styles.actions}>
					<Button
						title="Anuluj"
						variant="outline"
						onPress={() => router.back()}
						disabled={saving}
						style={styles.actionButton}
					/>
					<Button
						title="Zapisz"
						onPress={handleSave}
						loading={saving}
						disabled={saving}
						style={styles.actionButton}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default ProfileEdit;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	content: {
		padding: 20,
		gap: 20,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		padding: 8,
		borderRadius: 999,
	},
	headerSpacer: {
		width: 36,
	},
	title: {
		fontSize: 20,
		fontWeight: '800',
		color: colors.text,
	},
	avatarSection: {
		alignItems: 'center',
		gap: 12,
	},
	avatarWrapper: {
		width: 100,
		height: 100,
		borderRadius: 50,
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
		fontSize: 28,
		fontWeight: '800',
		color: colors.primary,
	},
	avatarActions: {
		flexDirection: 'row',
		gap: 10,
	},
	avatarButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.primary,
		backgroundColor: colors.surface,
	},
	avatarButtonDanger: {
		borderColor: colors.danger,
	},
	avatarButtonText: {
		color: colors.primary,
		fontWeight: '700',
		fontSize: 13,
	},
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 16,
		padding: 16,
		gap: 12,
	},
	fieldLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.muted,
		marginTop: 4,
	},
	genderRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	genderPill: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		backgroundColor: colors.surface,
	},
	genderPillActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	genderPillText: {
		color: colors.text,
		fontWeight: '600',
		fontSize: 13,
	},
	genderPillTextActive: {
		color: colors.surface,
	},
	actions: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 4,
	},
	actionButton: {
		flex: 1,
	},
});
