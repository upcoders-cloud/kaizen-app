import {useCallback, useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import Text from 'components/Text/Text';
import usersService from 'src/server/services/usersService';
import {FAILED_TO_LOAD_MANAGERS} from 'constants/constans';

const DEBOUNCE_MS = 300;
const INITIAL_LIMIT = 3;

const getInitials = (manager) => {
	const first = manager?.first_name?.[0] || '';
	const last = manager?.last_name?.[0] || '';
	return (first + last).toUpperCase() || manager?.nickname?.[0]?.toUpperCase() || 'U';
};

const getDisplayName = (manager) => {
	if (!manager) return '';
	const full = [manager.first_name, manager.last_name].filter(Boolean).join(' ').trim();
	return full || manager.nickname || manager.username || 'Kierownik';
};

const ROLE_LABELS = {
	MANAGER: {placeholder: 'Wybierz kierownika', title: 'Wybierz kierownika', empty: 'Brak kierowników.'},
	TEAM_LEAD: {placeholder: 'Wybierz lidera zespołu', title: 'Wybierz lidera zespołu', empty: 'Brak liderów.'},
	DIRECTOR: {placeholder: 'Wybierz dyrektora', title: 'Wybierz dyrektora', empty: 'Brak dyrektorów.'},
};

const ManagerPicker = ({value, onChange, style, role = 'MANAGER'}) => {
	const [visible, setVisible] = useState(false);
	const [managers, setManagers] = useState([]);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const debounceRef = useRef(null);
	const selectedManager = managers.find((m) => m.id === value) || null;
	const labels = ROLE_LABELS[role] || ROLE_LABELS.MANAGER;

	const fetchManagers = useCallback(async (query = '') => {
		setLoading(true);
		setError(null);
		try {
			const params = {role, ...(query ? {search: query} : {})};
			const data = await usersService.listManagers(params);
			const resolved = Array.isArray(data) ? data : data?.results ?? [];
			if (!query) {
				setManagers(resolved.slice(0, INITIAL_LIMIT));
			} else {
				setManagers(resolved);
			}
		} catch (err) {
			setError(err?.message || FAILED_TO_LOAD_MANAGERS);
		} finally {
			setLoading(false);
		}
	}, [role]);

	useEffect(() => {
		if (!visible) return;
		void fetchManagers();
	}, [visible, fetchManagers]);

	const handleSearchChange = (text) => {
		setSearch(text);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void fetchManagers(text.trim());
		}, DEBOUNCE_MS);
	};

	const handleSelect = (manager) => {
		onChange?.(manager.id);
		setVisible(false);
		setSearch('');
	};

	const handleClear = (event) => {
		event.stopPropagation?.();
		onChange?.(null);
	};

	const handleOpen = () => setVisible(true);
	const handleClose = () => {
		setVisible(false);
		setSearch('');
	};

	const renderManagerItem = ({item}) => {
		const isSelected = item.id === value;
		return (
			<Pressable
				style={[styles.managerItem, isSelected ? styles.managerItemActive : null]}
				onPress={() => handleSelect(item)}
			>
				<View style={[styles.avatar, isSelected ? styles.avatarActive : null]}>
					<Text style={[styles.avatarText, isSelected ? styles.avatarTextActive : null]}>
						{getInitials(item)}
					</Text>
				</View>
				<View style={styles.managerInfo}>
					<Text style={[styles.managerName, isSelected ? styles.managerNameActive : null]}>
						{getDisplayName(item)}
					</Text>
				</View>
				{isSelected ? (
					<Feather name="check" size={18} color={colors.primary} />
				) : null}
			</Pressable>
		);
	};

	return (
		<>
			<Pressable style={[styles.trigger, style]} onPress={handleOpen}>
				<Feather name="user" size={16} color={selectedManager ? colors.text : colors.muted} />
				<Text
					style={[styles.triggerText, !selectedManager ? styles.triggerPlaceholder : null]}
					numberOfLines={1}
				>
					{selectedManager ? getDisplayName(selectedManager) : labels.placeholder}
				</Text>
				{selectedManager ? (
					<Pressable onPress={handleClear} hitSlop={8} style={styles.clearButton}>
						<Feather name="x" size={16} color={colors.muted} />
					</Pressable>
				) : (
					<Feather name="chevron-down" size={16} color={colors.muted} />
				)}
			</Pressable>

			<Modal
				transparent
				visible={visible}
				animationType="fade"
				onRequestClose={handleClose}
			>
				<KeyboardAvoidingView
					style={styles.modalOverlay}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{labels.title}</Text>
							<Pressable onPress={handleClose} hitSlop={8}>
								<Feather name="x" size={22} color={colors.text} />
							</Pressable>
						</View>
						<View style={styles.searchRow}>
							<Feather name="search" size={16} color={colors.muted} />
							<TextInput
								style={styles.searchInput}
								placeholder="Szukaj po imieniu lub nazwisku..."
								placeholderTextColor={colors.muted}
								value={search}
								onChangeText={handleSearchChange}
								autoFocus
							/>
						</View>
						{!search && !loading && !error && managers.length > 0 ? (
							<View style={styles.hintRow}>
								<Text style={styles.hintText}>Wpisz, aby wyszukać więcej</Text>
							</View>
						) : null}
						{loading ? (
							<View style={styles.centered}>
								<ActivityIndicator size="small" color={colors.primary} />
							</View>
						) : error ? (
							<View style={styles.centered}>
								<Text style={styles.error}>{error}</Text>
							</View>
						) : managers.length === 0 ? (
							<View style={styles.centered}>
								<Text style={styles.emptyText}>{labels.empty}</Text>
							</View>
						) : (
							<FlatList
								data={managers}
								keyExtractor={(item) => String(item.id)}
								renderItem={renderManagerItem}
								contentContainerStyle={styles.listContent}
								keyboardShouldPersistTaps="handled"
							/>
						)}
					</View>
					<Pressable style={styles.modalBackdrop} onPress={handleClose} />
				</KeyboardAvoidingView>
			</Modal>
		</>
	);
};

export default ManagerPicker;

const styles = StyleSheet.create({
	trigger: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		minHeight: 48,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: colors.surface,
	},
	triggerText: {
		flex: 1,
		fontSize: 15,
		color: colors.text,
	},
	triggerPlaceholder: {
		color: colors.muted,
	},
	clearButton: {
		padding: 2,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.3)',
	},
	modalBackdrop: {
		flex: 1,
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		maxHeight: '60%',
		paddingTop: 54,
		paddingBottom: 16,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 4},
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginHorizontal: 16,
		marginBottom: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		backgroundColor: colors.placeholderSurface,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		color: colors.text,
		padding: 0,
	},
	hintRow: {
		paddingHorizontal: 16,
		paddingBottom: 6,
	},
	hintText: {
		fontSize: 12,
		color: colors.muted,
	},
	listContent: {
		paddingHorizontal: 8,
		paddingBottom: 8,
	},
	managerItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
	},
	managerItemActive: {
		backgroundColor: colors.badgeBackground,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.border,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	avatarActive: {
		backgroundColor: colors.primary,
	},
	avatarText: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.primary,
	},
	avatarTextActive: {
		color: colors.surface,
	},
	managerInfo: {
		flex: 1,
	},
	managerName: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	managerNameActive: {
		color: colors.primary,
	},
	centered: {
		padding: 24,
		alignItems: 'center',
	},
	error: {
		color: colors.danger,
		fontWeight: '600',
	},
	emptyText: {
		color: colors.muted,
	},
});
