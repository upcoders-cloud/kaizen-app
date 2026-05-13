import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const STAGE_LABEL = {
	TEAM_LEAD: 'Lider zespołu',
	MANAGER: 'Kierownik',
	DIRECTOR: 'Dyrektor',
};

const DECISION_META = {
	PENDING: {icon: 'clock', color: '#d97706', bg: '#fef3c7', text: 'Oczekuje'},
	APPROVED: {icon: 'check-circle', color: '#16a34a', bg: '#dcfce7', text: 'Zaakceptowane'},
	REJECTED: {icon: 'x-circle', color: '#dc2626', bg: '#fee2e2', text: 'Odrzucone'},
	SKIPPED: {icon: 'minus-circle', color: colors.muted, bg: colors.placeholderSurface, text: 'Pominięte'},
};

const ApprovalTimeline = ({approvals = []}) => {
	if (!approvals.length) return null;

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Ścieżka akceptacji</Text>
			<View style={styles.list}>
				{approvals.map((approval, idx) => {
					const meta = DECISION_META[approval.decision] || DECISION_META.PENDING;
					const approverName =
						[approval.approver?.first_name, approval.approver?.last_name].filter(Boolean).join(' ').trim() ||
						approval.approver?.nickname ||
						'Brak przypisanego';
					return (
						<View key={approval.id ?? idx} style={styles.row}>
							<View style={[styles.iconWrap, {backgroundColor: meta.bg, borderColor: meta.color}]}>
								<Feather name={meta.icon} size={14} color={meta.color} />
							</View>
							<View style={styles.body}>
								<View style={styles.headerRow}>
									<Text style={styles.stageLabel}>
										{idx + 1}. {STAGE_LABEL[approval.stage] || approval.stage}
									</Text>
									<View style={[styles.statusPill, {backgroundColor: meta.bg}]}>
										<Text style={[styles.statusPillText, {color: meta.color}]}>{meta.text}</Text>
									</View>
								</View>
								<Text style={styles.approverName} numberOfLines={1}>{approverName}</Text>
								{approval.comment ? (
									<Text style={styles.comment} numberOfLines={3}>{approval.comment}</Text>
								) : null}
							</View>
						</View>
					);
				})}
			</View>
		</View>
	);
};

export default ApprovalTimeline;

const styles = StyleSheet.create({
	container: {
		gap: 10,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 14,
		padding: 14,
	},
	title: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	list: {
		gap: 12,
	},
	row: {
		flexDirection: 'row',
		gap: 10,
	},
	iconWrap: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	body: {
		flex: 1,
		gap: 2,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	stageLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
		flexShrink: 1,
	},
	statusPill: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 999,
	},
	statusPillText: {
		fontSize: 11,
		fontWeight: '700',
	},
	approverName: {
		fontSize: 13,
		color: colors.muted,
	},
	comment: {
		fontSize: 12,
		color: colors.text,
		fontStyle: 'italic',
		marginTop: 4,
		padding: 8,
		borderRadius: 8,
		backgroundColor: colors.placeholderSurface,
	},
});
