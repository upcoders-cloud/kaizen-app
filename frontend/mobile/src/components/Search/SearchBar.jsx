import {useEffect, useRef} from 'react';
import {Animated, Easing, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';

const SEARCH_BAR_HEIGHT = 56;
const ANIMATION_DURATION = 220;

const SearchBar = ({
	value,
	onChangeText,
	visible = false,
	onClear,
	placeholder = 'Szukaj po tytule...',
	onSubmitEditing,
}) => {
	const animation = useRef(new Animated.Value(0)).current;
	const inputRef = useRef(null);

	useEffect(() => {
		Animated.timing(animation, {
			toValue: visible ? 1 : 0,
			duration: ANIMATION_DURATION,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [animation, visible]);

	useEffect(() => {
		if (!visible) return;
		const timeout = setTimeout(() => inputRef.current?.focus(), 120);
		return () => clearTimeout(timeout);
	}, [visible]);

	const height = animation.interpolate({
		inputRange: [0, 1],
		outputRange: [0, SEARCH_BAR_HEIGHT],
	});
	const opacity = animation.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});
	const translateY = animation.interpolate({
		inputRange: [0, 1],
		outputRange: [-6, 0],
	});
	const showClear = Boolean(value);
	const handleClear = () => {
		onClear?.();
		inputRef.current?.focus();
	};

	return (
		<Animated.View
			style={[styles.wrapper, {height, opacity, transform: [{translateY}]}]}
			pointerEvents={visible ? 'auto' : 'none'}
		>
			<View style={styles.searchBar}>
				<Feather name="search" size={16} color={colors.muted} />
				<TextInput
					ref={inputRef}
					style={styles.input}
					placeholder={placeholder}
					placeholderTextColor={colors.mutedAlt}
					autoCorrect={false}
					autoCapitalize="none"
					returnKeyType="search"
					value={value}
					onChangeText={onChangeText}
					onSubmitEditing={onSubmitEditing}
					selectionColor={colors.primary}
				/>
				{showClear && onClear ? (
					<Pressable style={styles.clearButton} onPress={handleClear}>
						<Feather name="x-circle" size={18} color={colors.mutedAlt} />
					</Pressable>
				) : null}
			</View>
		</Animated.View>
	);
};

export default SearchBar;

const styles = StyleSheet.create({
	wrapper: {
		paddingHorizontal: 16,
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		overflow: 'hidden',
		justifyContent: 'center',
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		borderRadius: 12,
		backgroundColor: '#f9fbff',
	},
	input: {
		flex: 1,
		fontSize: 15,
		color: colors.text,
		paddingVertical: 0,
	},
	clearButton: {
		padding: 2,
		borderRadius: 10,
	},
});
