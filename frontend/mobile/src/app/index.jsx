import {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import postsController from 'src/server/postsController';
import {FAILED_TO_LOAD_POSTS} from 'src/constants/constans';
import PostList from "src/screens/Posts/PostList";

const Home = () => {
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const loadPosts = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await postsController.fetchPosts();
			setPosts(data);
		} catch (err) {
			setError(err?.message || FAILED_TO_LOAD_POSTS);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPosts();
	}, [loadPosts]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<Text style={styles.title}>Kaizen Posts</Text>
				<Text style={styles.subtitle}>Latest team ideas</Text>
			</View>
			<PostList posts={posts} loading={loading} error={error} onRefresh={loadPosts} />
		</SafeAreaView>
	);
};

export default Home;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f4f6fb',
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1d2b64',
	},
	subtitle: {
		fontSize: 14,
		color: '#4a5970',
		marginTop: 4,
	},
});
