import {Modal, Pressable, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import ImageCarousel from 'components/PostDetail/ImageCarousel';
import RejectionReasonModal from 'components/RejectionReasonModal/RejectionReasonModal';
import ProgressUpdateModal from 'components/PostDetail/ProgressUpdateModal';
import ApproveDecisionModal from 'components/PostDetail/ApproveDecisionModal';
import styles from './detailStyles';

export default function PostDetailModals({previewVisible, closePreview, imageItems, screenWidth, screenHeight, previewIndex, menuVisible, handleCloseMenu, handleEditPost, handleDeletePost, rejectModalVisible, setRejectModalVisible, handleRejectPost, rejectLoading, progressModalVisible, setProgressModalVisible, handleSubmitProgress, post, progressSaving, approveModalVisible, setApproveModalVisible, handleApproveManager, approvingPost}) {
	return (
		<>
			<Modal
				transparent
				visible={previewVisible}
				animationType="fade"
				onRequestClose={closePreview}
			>
				<View style={styles.previewOverlay}>
					<Pressable style={styles.previewBackdrop} onPress={closePreview} />
					<View style={styles.previewModalCard}>
						<ImageCarousel
							images={imageItems}
							width={screenWidth}
							height={Math.min(520, screenHeight * 0.78)}
							initialIndex={previewIndex}
							showDots={false}
							showCounter
							imageResizeMode="contain"
							containerStyle={styles.previewCarousel}
						/>
					</View>
				</View>
			</Modal>
			<Modal transparent visible={menuVisible} animationType="fade" onRequestClose={handleCloseMenu}>
				<Pressable style={styles.menuOverlay} onPress={handleCloseMenu}>
					<Pressable style={styles.menuCard} onPress={(event) => event.stopPropagation()}>
						<Pressable style={styles.menuItem} onPress={handleEditPost}>
							<Feather name="edit-2" size={16} color={colors.primary} />
							<Text style={styles.menuText}>Edytuj</Text>
						</Pressable>
						<Pressable style={styles.menuItem} onPress={handleDeletePost}>
							<Feather name="trash-2" size={16} color={colors.danger} />
							<Text style={[styles.menuText, styles.menuTextDanger]}>Usuń</Text>
						</Pressable>
					</Pressable>
				</Pressable>
			</Modal>
			<RejectionReasonModal
				visible={rejectModalVisible}
				onClose={() => setRejectModalVisible(false)}
				onSubmit={handleRejectPost}
				loading={rejectLoading}
			/>
			<ProgressUpdateModal
				visible={progressModalVisible}
				onClose={() => setProgressModalVisible(false)}
				onSubmit={handleSubmitProgress}
				initialProgress={post?.progress_percent ?? 0}
				initialDeadline={post?.deadline ?? ''}
				loading={progressSaving}
			/>
			<ApproveDecisionModal
				visible={approveModalVisible}
				onClose={() => setApproveModalVisible(false)}
				onSubmit={handleApproveManager}
				initialCost={post?.estimated_cost ?? ''}
				initialDeadline={post?.deadline ?? ''}
				initialDirector={post?.assigned_director_detail?.id ?? null}
				loading={approvingPost}
			/>
		</>
	);
}
