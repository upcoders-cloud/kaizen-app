import {Tabs} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const LEFT_TAB_NAMES = ['index'];
const RIGHT_TAB_NAMES_MANAGER = ['my-cases', 'profile'];
const RIGHT_TAB_NAMES_USER = ['profile'];

const TabsLayout = () => {
	const user = useAuthStore((state) => state.user);
	const isManager = user?.role === 'MANAGER';
	const insets = useSafeAreaInsets();

	return (
		<Tabs
			backBehavior="initialRoute"
			tabBar={(props) => (
				<DynamicTabBar
					{...props}
					isManager={isManager}
					bottomInset={insets.bottom}
				/>
			)}
			screenOptions={{
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Główna',
					tabBarIcon: ({color, size}) => <Feather name="home" size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="create"
				options={{
					title: 'Dodaj',
					tabBarIcon: () => <Feather name="plus" size={28} color={colors.surface} />,
				}}
			/>
			<Tabs.Screen
				name="my-cases"
				options={{
					title: 'Moje sprawy',
					href: isManager ? '/my-cases' : null,
					tabBarIcon: ({color, size}) => <Feather name="clipboard" size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profil',
					tabBarIcon: ({color, size}) => <Feather name="user" size={size} color={color} />,
				}}
			/>
		</Tabs>
	);
};

const DynamicTabBar = ({state, descriptors, navigation, isManager, bottomInset}) => {
	const rightNames = isManager ? RIGHT_TAB_NAMES_MANAGER : RIGHT_TAB_NAMES_USER;
	const leftTabs = LEFT_TAB_NAMES
		.map((name) => state.routes.find((route) => route.name === name))
		.filter(Boolean);
	const rightTabs = rightNames
		.map((name) => state.routes.find((route) => route.name === name))
		.filter(Boolean);
	const createRoute = state.routes.find((route) => route.name === 'create');

	const renderSideTab = (route) => {
		const routeIndex = state.routes.findIndex((item) => item.key === route.key);
		const isFocused = state.index === routeIndex;
		const descriptor = descriptors[route.key];
		const options = descriptor?.options || {};
		const color = isFocused ? colors.primary : colors.muted;
		const icon = options.tabBarIcon?.({focused: isFocused, color, size: 22});
		const label = options.title || route.name;

		const onPress = () => {
			const event = navigation.emit({
				type: 'tabPress',
				target: route.key,
				canPreventDefault: true,
			});
			if (!isFocused && !event.defaultPrevented) {
				navigation.navigate(route.name);
			}
		};

		return (
			<Pressable key={route.key} onPress={onPress} style={styles.sideButton}>
				{icon}
				<Text style={[styles.sideLabel, isFocused ? styles.sideLabelActive : null]}>{label}</Text>
			</Pressable>
		);
	};

	const onPressCreate = () => {
		if (!createRoute) return;
		const routeIndex = state.routes.findIndex((item) => item.key === createRoute.key);
		const isFocused = state.index === routeIndex;
		const event = navigation.emit({
			type: 'tabPress',
			target: createRoute.key,
			canPreventDefault: true,
		});
		if (!isFocused && !event.defaultPrevented) {
			navigation.navigate(createRoute.name);
		}
	};

	return (
		<View style={[styles.tabBarContainer, {paddingBottom: Math.max(6, bottomInset)}]}>
			<View style={styles.tabBarRow}>
				<View style={styles.sideZone}>
					{leftTabs.map(renderSideTab)}
				</View>
				<View style={styles.centerSlot}>
					<Pressable onPress={onPressCreate} style={styles.createButton}>
						<Feather name="plus" size={28} color={colors.surface} />
					</Pressable>
				</View>
				<View style={styles.sideZone}>
					{rightTabs.map(renderSideTab)}
				</View>
			</View>
		</View>
	);
};

export default TabsLayout;

const styles = StyleSheet.create({
	tabBarContainer: {
		backgroundColor: colors.surface,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingTop: 8,
		paddingHorizontal: 10,
	},
	tabBarRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},
	sideZone: {
		flex: 1,
		minHeight: 48,
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'center',
		gap: 24,
	},
	sideButton: {
		minWidth: 72,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	sideLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.muted,
	},
	sideLabelActive: {
		color: colors.primary,
	},
	centerSlot: {
		width: 74,
		alignItems: 'center',
		justifyContent: 'center',
	},
	createButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#1d2b64',
		shadowOpacity: 0.2,
		shadowRadius: 10,
		shadowOffset: {width: 0, height: 6},
		elevation: 6,
		transform: [{translateY: -10}],
	},
});
