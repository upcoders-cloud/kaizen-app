import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import Post from './Post';
import PostListSkeleton from './PostSkeleton';
import colors from 'theme/colors';
import {EmptyState, ErrorState} from 'components/ui';

const PostList = ({
	posts = [],
	loading = false,
	refreshing = false,
	loadingMore = false,
	error = null,
	emptyText = 'Brak postów do wyświetlenia.',
	onRefresh,
	onEndReached,
	onPressItem,
	onToggleLike,
	onToggleBookmark,
	onPressComment,
	onPressMore,
	currentUserId,
	isDeleting = false,
}) => {
	if (loading) {
		return <PostListSkeleton count={4} />;
	}

	if (error) {
		return (
			<ErrorState description={error} onRetry={onRefresh} style={styles.centered} />
		);
	}

	return (
		<FlatList
			data={posts}
			keyExtractor={(item) => String(item.id)}
			renderItem={({item}) => (
				<Post
					post={item}
					onPress={() => onPressItem?.(item)}
					onToggleLike={onToggleLike}
					onToggleBookmark={onToggleBookmark}
					onPressComment={onPressComment}
					onPressMore={onPressMore}
					canManage={
						currentUserId != null && String(item?.author?.id) === String(currentUserId)
					}
					isDeleting={isDeleting}
				/>
			)}
			contentContainerStyle={posts.length ? styles.listContent : styles.centered}
			ListEmptyComponent={<EmptyState icon="lightbulb" title="Brak pomysłów" description={emptyText} />}
			ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.moreLoader} /> : null}
			onEndReached={onEndReached}
			onEndReachedThreshold={0.4}
			showsVerticalScrollIndicator={false}
			refreshControl={
				onRefresh ? (
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
				) : undefined
			}
		/>
	);
};

export default PostList;

const styles = StyleSheet.create({
	centered: {
		flexGrow: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 16,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 24,
		gap: 12,
	},
	moreLoader: {marginVertical: 16},
});
