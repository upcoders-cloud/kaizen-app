import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import Post from './Post';
import colors from 'theme/colors';

const PostList = ({posts = [], loading = false, error = null, onRefresh, onPressItem, onToggleLike}) => {
	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={styles.muted}>Ładowanie postów...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>Error: {error}</Text>
			</View>
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
				/>
			)}
			contentContainerStyle={posts.length ? styles.listContent : styles.centered}
			ListEmptyComponent={<Text style={styles.muted}>Brak postów do wyświetlenia.</Text>}
			showsVerticalScrollIndicator={false}
			refreshControl={
				onRefresh ? (
					<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />
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
	muted: {
		color: colors.muted,
		marginTop: 8,
	},
	error: {
		color: colors.danger,
		fontSize: 15,
		textAlign: 'center',
	},
});
