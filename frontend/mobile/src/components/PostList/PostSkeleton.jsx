import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import colors from 'theme/colors';

const Shimmer = ({style}) => {
	const opacity = useRef(new Animated.Value(0.5)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
				Animated.timing(opacity, {toValue: 0.5, duration: 700, useNativeDriver: true}),
			])
		);
		loop.start();
		return () => loop.stop();
	}, [opacity]);

	return <Animated.View style={[styles.shimmer, {opacity}, style]} />;
};

const PostSkeletonItem = () => (
	<View style={styles.card}>
		<View style={styles.headerRow}>
			<Shimmer style={styles.avatar} />
			<View style={styles.headerText}>
				<Shimmer style={styles.line60} />
				<Shimmer style={styles.line40} />
			</View>
		</View>
		<Shimmer style={styles.title} />
		<Shimmer style={styles.body} />
		<Shimmer style={styles.bodyShort} />
		<View style={styles.footerRow}>
			<Shimmer style={styles.pill} />
			<Shimmer style={styles.pill} />
		</View>
	</View>
);

const PostListSkeleton = ({count = 4}) => (
	<View style={styles.container}>
		{Array.from({length: count}).map((_, i) => (
			<PostSkeletonItem key={i} />
		))}
	</View>
);

export default PostListSkeleton;

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingTop: 8,
		gap: 12,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 16,
		gap: 10,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	headerText: {
		flex: 1,
		gap: 6,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
	},
	shimmer: {
		backgroundColor: colors.placeholderSurface ?? '#e2e8f0',
		borderRadius: 6,
	},
	line60: {
		height: 12,
		width: '60%',
	},
	line40: {
		height: 10,
		width: '40%',
	},
	title: {
		height: 18,
		width: '80%',
	},
	body: {
		height: 12,
		width: '100%',
	},
	bodyShort: {
		height: 12,
		width: '70%',
	},
	footerRow: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 4,
	},
	pill: {
		height: 24,
		width: 60,
		borderRadius: 12,
	},
});
