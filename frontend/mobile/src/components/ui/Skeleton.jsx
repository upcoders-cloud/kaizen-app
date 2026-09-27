import {useEffect, useRef} from 'react';
import {Animated, Platform, StyleSheet} from 'react-native';
import colors from 'theme/colors';
import {radius} from 'theme/theme';

const Skeleton = ({width = '100%', height = 16, style, rounded = false}) => {
	const opacity = useRef(new Animated.Value(0.5)).current;
	useEffect(() => {
		const loop = Animated.loop(Animated.sequence([
			Animated.timing(opacity, {toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web'}),
			Animated.timing(opacity, {toValue: 0.5, duration: 650, useNativeDriver: Platform.OS !== 'web'}),
		]));
		loop.start();
		return () => loop.stop();
	}, [opacity]);
	return <Animated.View accessibilityLabel="Wczytywanie" style={[styles.base, {width, height, borderRadius: rounded ? height / 2 : radius.sm, opacity}, style]} />;
};
export default Skeleton;
const styles = StyleSheet.create({base: {backgroundColor: colors.borderMuted}});
