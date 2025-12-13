import {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {FAILED_TO_LOAD_POSTS} from 'constants/constans';
import PostList from 'components/PostList/PostList';
import postsService from 'src/server/services/postsService';
import Button from 'components/Button/Button';
import colors from 'theme/colors';

const Home = () => {
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const router = useRouter();

	useEffect(() => {
		void loadPostsData({setLoading, setError, setPosts});
	}, []);

	return (
		<SafeAreaProvider>
				<SafeAreaView style={styles.safeArea}>
					<View style={styles.header}>
						<Text style={styles.title}>Kaizen Posts</Text>
						<Text style={styles.subtitle}>Latest team ideas</Text>
						<Button
							title="Create Post"
							onPress={() => router.push('/create')}
							leftIcon={<Feather name="plus" size={16} color="white" />}
							style={styles.createButton}
						/>
					</View>
					<PostList
						posts={posts}
						loading={loading}
						error={error}
						onRefresh={() => loadPostsData({setLoading, setError, setPosts})}
						onPressItem={(item) => router.push(`/post/${item.id}`)}
					/>
			</SafeAreaView>
		</SafeAreaProvider>
	);
};

const loadPostsData = async ({setLoading, setError, setPosts}) => {
	setLoading(true);
	setError(null);
	try {
		const data = await postsService.list();
		console.log(data)
		setPosts(data);
	} catch (err) {
		setError(err?.message || FAILED_TO_LOAD_POSTS);
	} finally {
		setLoading(false);
	}
};

export default Home;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	header: {
		alignSelf: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: colors.primary,
	},
	subtitle: {
		fontSize: 14,
		color: '#4a5970',
		marginTop: 4,
	},
	createButton: {
		alignSelf: 'center',
		marginTop: 10,
	},
});
