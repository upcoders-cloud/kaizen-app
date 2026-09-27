import {View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import TextBase from 'components/Text/Text';
import Button from 'components/Button/Button';
import ApprovalTimeline from 'components/PostDetail/ApprovalTimeline';
import ImplementationCard from 'components/PostDetail/ImplementationCard';
import {Card, StatusPill} from 'components/ui';
import colors from 'theme/colors';
import styles from './detailStyles';

export default function PostOverview({post, categoryStyle, categoryLabel, authorInitials, authorName, managerName, managerInitials, formattedDate, isOwner, router, resolvedId, canManageProgress, setProgressModalVisible, isCurrentStageApprover, handleApprovePost, approvingPost, setRejectModalVisible}) {
	return (
		<>
			{/* Main card: header + description */}
			<Card style={styles.headerCard} padded={false} elevated>
				<View style={styles.badgesRow}>
					<TextBase style={[styles.categoryBadge, categoryStyle]}>
						{categoryLabel || 'Zgłoszenie'}
					</TextBase>
					<StatusPill status={post?.status} />
					{post?.id ? <TextBase style={styles.postId}>#{post.id}</TextBase> : null}
				</View>

				<TextBase style={styles.postTitle}>{post?.title || 'Bez tytułu'}</TextBase>

				<View style={styles.headerDivider} />

				<TextBase style={styles.descriptionText}>
					{post?.content || 'Brak treści.'}
				</TextBase>

				<View style={styles.headerDivider} />

				<View style={styles.metaGrid}>
					<View style={styles.metaItem}>
						<View style={styles.metaAvatar}>
							<TextBase style={styles.metaAvatarText}>{authorInitials}</TextBase>
						</View>
						<View style={styles.metaInfo}>
							<TextBase style={styles.metaLabel}>Autor</TextBase>
							<TextBase style={styles.metaValue}>{authorName}</TextBase>
						</View>
					</View>
					{managerName ? (
						<View style={styles.metaItem}>
							<View style={[styles.metaAvatar, styles.metaAvatarManager]}>
								<TextBase style={[styles.metaAvatarText, styles.metaAvatarManagerText]}>{managerInitials}</TextBase>
							</View>
							<View style={styles.metaInfo}>
								<TextBase style={styles.metaLabel}>Kierownik</TextBase>
								<TextBase style={styles.metaValue}>{managerName}</TextBase>
							</View>
						</View>
					) : null}
					<View style={styles.metaItem}>
						<View style={styles.metaIconCircle}>
							<Feather name="calendar" size={13} color={colors.muted} />
						</View>
						<View style={styles.metaInfo}>
							<TextBase style={styles.metaLabel}>Data</TextBase>
							<TextBase style={styles.metaValue}>{formattedDate}</TextBase>
						</View>
					</View>
				</View>
			</Card>

			{/* Rejection reason */}
			{post?.status === 'CANCELLED' && post?.rejection_reason && isOwner ? (
				<View style={styles.rejectionCard}>
					<View style={styles.rejectionHeader}>
						<Feather name="alert-circle" size={16} color={colors.danger} />
						<TextBase style={styles.rejectionLabel}>Powód odrzucenia</TextBase>
					</View>
					<TextBase style={styles.rejectionText}>{post.rejection_reason}</TextBase>
					<Button
						title="Edytuj i zgłoś ponownie"
						variant="outline"
						onPress={() => router.push(`/post/${resolvedId}/edit`)}
						leftIcon={<Feather name="edit-2" size={14} color={colors.primary} />}
						style={styles.resubmitButton}
					/>
				</View>
			) : null}

			{/* Approval timeline - pokazuje wszystkie etapy zatwierdzenia */}
			{Array.isArray(post?.approvals) && post.approvals.length > 0 ? (
				<View style={styles.card}>
					<ApprovalTimeline approvals={post.approvals} />
				</View>
			) : null}

			{/* Implementation card - koszt, termin, postęp */}
			{(post?.estimated_cost != null || post?.deadline || post?.progress_percent > 0 || ['SUBMITTED', 'IN_PROGRESS', 'IMPLEMENTED'].includes(post?.status)) ? (
				<ImplementationCard
					post={post}
					canManage={canManageProgress}
					onUpdateProgress={() => setProgressModalVisible(true)}
				/>
			) : null}

			{/* Approver actions (multi-stage) */}
			{post?.status === 'TO_VERIFY' && isCurrentStageApprover ? (
				<View style={styles.card}>
					<View style={styles.cardHeader}>
						<View style={[styles.cardIconCircle, {backgroundColor: colors.warningSoft}]}>
							<Feather name="shield" size={14} color={colors.warning} />
						</View>
						<TextBase style={styles.cardTitle}>Twoja decyzja</TextBase>
					</View>
					<TextBase style={styles.stageHint}>
						Etap: {{
							TEAM_LEAD: 'Lider zespołu',
							MANAGER: 'Kierownik',
							DIRECTOR: 'Dyrektor',
						}[post?.current_stage?.stage] || post?.current_stage?.stage}
					</TextBase>
					<View style={styles.managerActionsRow}>
						<Button
							title="Zatwierdź"
							onPress={handleApprovePost}
							loading={approvingPost}
							leftIcon={<Feather name="check" size={16} color={colors.white} />}
							style={styles.approveButton}
							textStyle={styles.approveButtonText}
						/>
						<Button
							title="Odrzuć"
							variant="outline"
							onPress={() => setRejectModalVisible(true)}
							leftIcon={<Feather name="x" size={16} color={colors.danger} />}
							style={styles.rejectButtonDetail}
							textStyle={styles.rejectButtonText}
						/>
					</View>
				</View>
			) : null}
		</>
	);
}
