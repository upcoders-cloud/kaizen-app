import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import Post from './Post';

const PostList = ({posts = [], loading = false, error = null, onRefresh}) => {
	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#1d2b64" />
				<Text style={styles.muted}>Loading posts...</Text>
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
			renderItem={({item}) => <Post post={item} />}
			contentContainerStyle={posts.length ? styles.listContent : styles.centered}
			ListEmptyComponent={<Text style={styles.muted}>No posts to display.</Text>}
			showsVerticalScrollIndicator={false}
			refreshControl={
				onRefresh ? (
					<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#1d2b64" />
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
		paddingBottom: 24,
		gap: 12,
	},
	muted: {
		color: '#6c7a92',
		marginTop: 8,
	},
	error: {
		color: '#d22',
		fontSize: 15,
		textAlign: 'center',
	},
});
