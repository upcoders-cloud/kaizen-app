import {FlatList, Image, Pressable, StyleSheet, View} from 'react-native';
import {useEffect, useRef, useState} from 'react';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const ImageCarousel = ({
	images = [],
	width,
	height = 240,
	initialIndex = 0,
	onImagePress,
	onIndexChange,
	showDots = true,
	showCounter = false,
	imageResizeMode = 'cover',
	containerStyle,
}) => {
	const listRef = useRef(null);
	const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
	const [activeIndex, setActiveIndex] = useState(Math.min(initialIndex, safeImages.length - 1));

	useEffect(() => {
		if (!listRef.current || !width || !safeImages.length) return;
		const nextIndex = Math.min(initialIndex, safeImages.length - 1);
		listRef.current.scrollToOffset({offset: nextIndex * width, animated: false});
		setActiveIndex(nextIndex);
		onIndexChange?.(nextIndex);
	}, [initialIndex, width, safeImages.length, onIndexChange]);

	const handleMomentumEnd = (event) => {
		if (!width) return;
		const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
		setActiveIndex(nextIndex);
		onIndexChange?.(nextIndex);
	};

	if (!safeImages.length || !width) return null;

	return (
		<View style={[styles.container, {width, height}, containerStyle]}>
			<FlatList
				ref={listRef}
				data={safeImages}
				keyExtractor={(item, index) => `${item}-${index}`}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				contentInset={{left: 0, right: 0}}
				contentInsetAdjustmentBehavior="never"
				onMomentumScrollEnd={handleMomentumEnd}
				getItemLayout={(_, index) => ({length: width, offset: width * index, index})}
				renderItem={({item, index}) => (
					<Pressable
						onPress={() => onImagePress?.(index)}
						style={[styles.slide, {width, height}]}
					>
						<Image source={{uri: item}} style={[styles.image, {width, height}]} resizeMode={imageResizeMode} />
					</Pressable>
				)}
			/>
			{showDots && safeImages.length > 1 ? (
				<View style={styles.dots}>
					{safeImages.map((_, index) => (
						<View
							key={`dot-${index}`}
							style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
						/>
					))}
				</View>
			) : null}
			{showCounter && safeImages.length > 1 ? (
				<View style={styles.counter}>
					<Text style={styles.counterText}>{activeIndex + 1} / {safeImages.length}</Text>
				</View>
			) : null}
		</View>
	);
};

export default ImageCarousel;

const styles = StyleSheet.create({
	container: {
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: colors.placeholderSurface,
	},
	slide: {
		backgroundColor: colors.placeholderSurface,
	},
	image: {
		backgroundColor: colors.placeholderSurface,
	},
	dots: {
		position: 'absolute',
		bottom: 10,
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 6,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: 'rgba(255,255,255,0.6)',
	},
	dotActive: {
		backgroundColor: colors.primary,
	},
	counter: {
		position: 'absolute',
		top: 12,
		right: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: 'rgba(15, 23, 42, 0.7)',
	},
	counterText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '700',
	},
});
