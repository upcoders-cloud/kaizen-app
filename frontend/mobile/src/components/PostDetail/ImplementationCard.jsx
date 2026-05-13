import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const formatDate = (value) => {
	if (!value) return '—';
	try {
		return new Date(value).toLocaleDateString('pl-PL', {day: '2-digit', month: 'short', year: 'numeric'});
	} catch (err) {
		return String(value);
	}
};

const formatCost = (value) => {
	if (value == null || value === '') return '—';
	const number = Number(value);
	if (!Number.isFinite(number)) return String(value);
	return `${number.toLocaleString('pl-PL', {minimumFractionDigits: 0, maximumFractionDigits: 2})} zł`;
};

const daysUntil = (deadline) => {
	if (!deadline) return null;
	try {
		const target = new Date(deadline);
		const now = new Date();
		const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return diff;
	} catch (err) {
		return null;
	}
};

const deadlineMeta = (diff) => {
	if (diff == null) return {color: colors.muted, text: ''};
	if (diff < 0) return {color: colors.danger, text: `${Math.abs(diff)} dni po terminie`};
	if (diff === 0) return {color: colors.danger, text: 'Dziś'};
	if (diff <= 7) return {color: '#d97706', text: `Za ${diff} dni`};
	return {color: colors.muted, text: `Za ${diff} dni`};
};

const ImplementationCard = ({post, canManage = false, onUpdateProgress}) => {
	const cost = post?.estimated_cost;
	const deadline = post?.deadline;
	const progress = Math.max(0, Math.min(100, post?.progress_percent ?? 0));
	const showProgressBar = ['SUBMITTED', 'IN_PROGRESS', 'IMPLEMENTED'].includes(post?.status);
	const diff = daysUntil(deadline);
	const dMeta = deadlineMeta(diff);

	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				<View style={styles.titleRow}>
					<Feather name="trending-up" size={14} color={colors.primary} />
					<Text style={styles.title}>Wdrożenie</Text>
				</View>
				{canManage && onUpdateProgress ? (
					<Pressable
						onPress={onUpdateProgress}
						style={({pressed}) => [styles.editButton, pressed ? styles.editButtonPressed : null]}
						hitSlop={6}
					>
						<Feather name="edit-2" size={12} color={colors.primary} />
						<Text style={styles.editButtonText}>Aktualizuj</Text>
					</Pressable>
				) : null}
			</View>

			<View style={styles.row}>
				<View style={styles.cell}>
					<Text style={styles.label}>Koszt wdrożenia</Text>
					<Text style={styles.value}>{formatCost(cost)}</Text>
				</View>
				<View style={styles.cell}>
					<Text style={styles.label}>Termin</Text>
					<Text style={styles.value}>{formatDate(deadline)}</Text>
					{dMeta.text ? <Text style={[styles.hint, {color: dMeta.color}]}>{dMeta.text}</Text> : null}
				</View>
			</View>

			{showProgressBar ? (
				<View style={styles.progressWrapper}>
					<View style={styles.progressHeader}>
						<Text style={styles.label}>Postęp</Text>
						<Text style={styles.progressValue}>{progress}%</Text>
					</View>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, {width: `${progress}%`}]} />
					</View>
				</View>
			) : null}
		</View>
	);
};

export default ImplementationCard;

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 14,
		padding: 14,
		gap: 12,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	title: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	editButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	editButtonPressed: {
		opacity: 0.6,
	},
	editButtonText: {
		color: colors.primary,
		fontSize: 11,
		fontWeight: '700',
	},
	row: {
		flexDirection: 'row',
		gap: 12,
	},
	cell: {
		flex: 1,
		gap: 2,
	},
	label: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	value: {
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	hint: {
		fontSize: 11,
		fontWeight: '600',
		marginTop: 2,
	},
	progressWrapper: {
		gap: 6,
	},
	progressHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	progressValue: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.primary,
	},
	progressTrack: {
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.placeholderSurface,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: colors.primary,
		borderRadius: 4,
	},
});
