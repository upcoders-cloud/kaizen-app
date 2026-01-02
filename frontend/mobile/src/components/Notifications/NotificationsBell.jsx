import {Animated, Easing, Pressable, StyleSheet, View} from 'react-native';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import notificationsService from 'src/server/services/notificationsService';
import {useAuthStore} from 'store/authStore';

const NotificationsBell = ({onPress, style, badgeStyle}) => {
	const [unreadCount, setUnreadCount] = useState(0);
	const accessToken = useAuthStore((state) => state.accessToken);
	const wiggle = useRef(new Animated.Value(0)).current;
	const wiggleLoopRef = useRef(null);

	const loadUnreadCount = useCallback(async () => {
		if (!accessToken) {
			setUnreadCount(0);
			return;
		}
		try {
			const data = await notificationsService.unreadCount();
			const count = Number(data?.count ?? 0);
			setUnreadCount(Number.isFinite(count) ? count : 0);
		} catch (err) {
			// Keep the last known count on transient errors.
		}
	}, [accessToken]);

	useFocusEffect(
		useCallback(() => {
			void loadUnreadCount();
		}, [loadUnreadCount])
	);

	useEffect(() => {
		const startWiggle = () => {
			if (wiggleLoopRef.current) return;
			wiggleLoopRef.current = Animated.loop(
				Animated.sequence([
					Animated.timing(wiggle, {
						toValue: 1,
						duration: 90,
						easing: Easing.inOut(Easing.quad),
						useNativeDriver: true,
					}),
					Animated.timing(wiggle, {
						toValue: -1,
						duration: 90,
						easing: Easing.inOut(Easing.quad),
						useNativeDriver: true,
					}),
					Animated.timing(wiggle, {
						toValue: 1,
						duration: 90,
						easing: Easing.inOut(Easing.quad),
						useNativeDriver: true,
					}),
					Animated.timing(wiggle, {
						toValue: 0,
						duration: 120,
						easing: Easing.out(Easing.quad),
						useNativeDriver: true,
					}),
					Animated.delay(1400),
				])
			);
			wiggleLoopRef.current.start();
		};

		const stopWiggle = () => {
			if (wiggleLoopRef.current) {
				wiggleLoopRef.current.stop();
				wiggleLoopRef.current = null;
			}
			wiggle.stopAnimation();
			wiggle.setValue(0);
		};

		if (unreadCount > 0) {
			startWiggle();
		} else {
			stopWiggle();
		}

		return () => stopWiggle();
	}, [unreadCount, wiggle]);

	const bellRotation = wiggle.interpolate({
		inputRange: [-1, 1],
		outputRange: ['-8deg', '8deg'],
	});

	return (
		<Pressable style={[styles.button, style]} onPress={onPress}>
			<Animated.View style={{transform: [{rotate: bellRotation}]}}>
				<Feather name="bell" size={18} color={colors.primary} />
			</Animated.View>
			{unreadCount > 0 ? <View style={[styles.badge, badgeStyle]} /> : null}
		</Pressable>
	);
};

export default NotificationsBell;

const styles = StyleSheet.create({
	button: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f4f6fb',
		borderWidth: 1,
		borderColor: '#e3e9f7',
	},
	badge: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#ef4444',
		borderWidth: 1,
		borderColor: colors.surface,
	},
});
