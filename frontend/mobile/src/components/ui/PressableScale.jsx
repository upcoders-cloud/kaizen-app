import {useEffect, useRef} from 'react';
import {Animated, Platform, Pressable} from 'react-native';

const PressableScale = ({children, disabled, onPressIn, onPressOut, style, pressedScale = 0.97, ...props}) => {
	const scale = useRef(new Animated.Value(1)).current;
	useEffect(() => () => scale.stopAnimation(), [scale]);
	const animate = (value) => Animated.spring(scale, {toValue: value, useNativeDriver: Platform.OS !== 'web', friction: 7, tension: 180}).start();
	return (
		<Animated.View style={{transform: [{scale}]}}>
			<Pressable
				accessibilityRole="button"
				disabled={disabled}
				style={style}
				onPressIn={(event) => {animate(pressedScale); onPressIn?.(event);}}
				onPressOut={(event) => {animate(1); onPressOut?.(event);}}
				{...props}
				>{children}</Pressable>
		</Animated.View>
	);
};
export default PressableScale;
