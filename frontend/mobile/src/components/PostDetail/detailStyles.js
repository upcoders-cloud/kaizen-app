import {StyleSheet} from 'react-native';
import colors from 'theme/colors';
import {radius, shadows, spacing, typography} from 'theme/theme';

const styles = StyleSheet.create({
	container: {
		padding: spacing.lg,
		paddingBottom: 32,
		gap: 14,
		backgroundColor: colors.background,
	},
	menuButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
	},
	menuLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		gap: 10,
		padding: 32,
	},
	error: {
		color: colors.danger,
		fontWeight: '700',
		fontSize: 16,
		textAlign: 'center',
	},
	muted: {
		color: colors.muted,
		textAlign: 'center',
		fontSize: 14,
	},

	/* Header card */
	headerCard: {
		gap: 14,
		padding: 18,
		borderRadius: radius.xl,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		...shadows.card,
	},
	badgesRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		alignItems: 'center',
	},
	categoryBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		textTransform: 'uppercase',
	},
	statusBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
	},
	postId: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
	},
	postTitle: {
		...typography.title,
		color: colors.text,
		lineHeight: 28,
	},
	headerDivider: {
		height: 1,
		backgroundColor: colors.border,
	},
	metaGrid: {
		gap: 12,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	metaAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	metaAvatarText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.primary,
	},
	metaAvatarManager: {
		backgroundColor: colors.roleManagerSurface,
	},
	metaAvatarManagerText: {
		color: colors.roleManagerText,
	},
	metaIconCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.placeholderSurface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	metaInfo: {
		gap: 1,
	},
	metaLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	metaValue: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},

	/* Shared card */
	card: {
		gap: 12,
		padding: spacing.lg,
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	cardIconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	countBadge: {
		backgroundColor: colors.border,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
	},
	countBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.muted,
	},

	/* Description */
	descriptionText: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.text,
	},
	placeholderText: {
		color: colors.muted,
		fontSize: 13,
	},

	/* Rejection */
	rejectionCard: {
		gap: 10,
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.dangerSoft,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	rejectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	rejectionLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.danger,
	},
	rejectionText: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.text,
	},
	resubmitButton: {
		alignSelf: 'flex-start',
		marginTop: 2,
	},

	/* Manager actions */
	stageHint: {
		fontSize: 12,
		color: colors.muted,
		fontWeight: '600',
		marginBottom: 6,
	},
	managerActionsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	approveButton: {
		flex: 1,
		minHeight: 44,
		backgroundColor: colors.success,
		borderColor: colors.success,
	},
	approveButtonText: {
		color: colors.white,
	},
	rejectButtonDetail: {
		flex: 1,
		minHeight: 44,
		borderColor: colors.danger,
	},
	rejectButtonText: {
		color: colors.danger,
	},

	/* Images */
	imageWrapper: {
		width: '100%',
		height: 240,
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
		backgroundColor: colors.placeholderSurface,
	},
	image: {
		width: '100%',
		height: '100%',
	},
	imageTypeLabel: {
		position: 'absolute',
		top: spacing.md,
		left: spacing.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: radius.pill,
		backgroundColor: colors.backdrop,
	},
	imageTypeLabelText: {fontSize: 12, fontWeight: '700', color: colors.white},
	comparisonRow: {flexDirection: 'row', gap: spacing.md},
	comparisonItem: {flex: 1, overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.surfaceAlt},
	comparisonImage: {width: '100%', height: 128},
	comparisonLabel: {padding: spacing.sm, textAlign: 'center', color: colors.text, fontWeight: '700'},

	/* Survey */
	surveyResultsCard: {
		gap: 14,
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.primarySoft,
		borderWidth: 1,
		borderColor: colors.borderStrong,
	},
	surveyRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	surveyItem: {
		flex: 1,
		alignItems: 'center',
		gap: 6,
	},
	surveyDivider: {
		width: 1,
		height: 48,
		backgroundColor: colors.borderStrong,
	},
	surveyValue: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.primary,
	},
	surveyLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.muted,
	},
	surveyCta: {
		alignSelf: 'flex-start',
	},

	/* Actions */
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
	},
	actionButtonWrapper: {
		alignSelf: 'flex-start',
	},
	actionButtonActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	actionButtonPressed: {
		opacity: 0.75,
	},
	actionButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
	actionCount: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
	},
	actionButtonTextActive: {
		color: colors.white,
	},

	/* Comments */
	commentsCard: {
		gap: 12,
		padding: spacing.lg,
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	showAllText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},

	/* Preview modal */
	previewOverlay: {
		flex: 1,
		backgroundColor: colors.backdrop,
		alignItems: 'stretch',
		justifyContent: 'center',
	},
	previewBackdrop: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	},
	previewModalCard: {
		width: '100%',
	},
	previewCarousel: {
		borderRadius: 0,
	},

	/* Menu modal */
	menuOverlay: {
		flex: 1,
		backgroundColor: colors.backdrop,
		justifyContent: 'flex-start',
		alignItems: 'flex-end',
		paddingTop: 56,
		paddingRight: 16,
	},
	menuCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 6,
		minWidth: 160,
		shadowColor: colors.primary,
		shadowOpacity: 0.14,
		shadowRadius: 14,
		shadowOffset: {width: 0, height: 8},
		elevation: 4,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	menuText: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	menuTextDanger: {
		color: colors.danger,
	},
});

export default styles;
