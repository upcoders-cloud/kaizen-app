import {useCallback, useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	Modal,
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

const ManagerPicker = ({value, onChange, style}) => {
	const [visible, setVisible] = useState(false);
	const [managers, setManagers] = useState([]);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const debounceRef = useRef(null);
	const selectedManager = managers.find((m) => m.id === value) || null;

	const fetchManagers = useCallback(async (query = '') => {
		setLoading(true);
		setError(null);
		try {
			const params = query ? {search: query} : undefined;
			const data = await usersService.listManagers(params);
			const resolved = Array.isArray(data) ? data : data?.results ?? [];
			setManagers(resolved);
		} catch (err) {
			setError(err?.message || FAILED_TO_LOAD_MANAGERS);
		} finally {
			setLoading(false);
		}
	}, []);

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
					{item.nickname ? (
						<Text style={styles.managerNickname}>@{item.nickname}</Text>
					) : null}
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
					{selectedManager ? getDisplayName(selectedManager) : 'Wybierz kierownika'}
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
				animationType="slide"
				onRequestClose={handleClose}
			>
				<View style={styles.modalOverlay}>
					<Pressable style={styles.modalBackdrop} onPress={handleClose} />
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Wybierz kierownika</Text>
							<Pressable onPress={handleClose} hitSlop={8}>
								<Feather name="x" size={22} color={colors.text} />
							</Pressable>
						</View>
						<View style={styles.searchRow}>
							<Feather name="search" size={16} color={colors.muted} />
							<TextInput
								style={styles.searchInput}
								placeholder="Szukaj po imieniu..."
								placeholderTextColor={colors.muted}
								value={search}
								onChangeText={handleSearchChange}
								autoFocus
							/>
						</View>
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
								<Text style={styles.emptyText}>Brak kierowników do wyświetlenia.</Text>
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
				</View>
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
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(15, 23, 42, 0.3)',
	},
	modalBackdrop: {
		flex: 1,
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '70%',
		paddingBottom: 34,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 16,
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
		gap: 2,
	},
	managerName: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	managerNameActive: {
		color: colors.primary,
	},
	managerNickname: {
		fontSize: 12,
		color: colors.muted,
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
