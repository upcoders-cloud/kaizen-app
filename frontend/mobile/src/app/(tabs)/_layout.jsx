import {Tabs} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const LEFT_TAB_NAMES = ['index', 'ranking'];
const RIGHT_TAB_NAMES = ['my-cases', 'menu'];

const ICON_SIZE = 22;
const CREATE_ICON_SIZE = 26;
const CREATE_BUTTON_SIZE = 60;

const TabsLayout = () => {
	const insets = useSafeAreaInsets();

	return (
		<Tabs
			backBehavior="initialRoute"
			tabBar={(props) => <ModernTabBar {...props} bottomInset={insets.bottom} />}
			screenOptions={{
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Główna',
					tabBarIcon: ({color}) => <Feather name="home" size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="ranking"
				options={{
					title: 'Ranking',
					tabBarIcon: ({color}) => <Feather name="award" size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="create"
				options={{
					title: 'Dodaj',
					tabBarIcon: () => <Feather name="edit-3" size={CREATE_ICON_SIZE} color={colors.surface} />,
				}}
			/>
			<Tabs.Screen
				name="my-cases"
				options={{
					title: 'Moje sprawy',
					href: '/my-cases',
					tabBarIcon: ({color}) => <Feather name="clipboard" size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="menu"
				options={{
					title: 'Menu',
					tabBarIcon: ({color}) => <Feather name="menu" size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profil',
					href: null,
					tabBarIcon: ({color}) => <Feather name="user" size={ICON_SIZE} color={color} />,
				}}
			/>
		</Tabs>
	);
};

const SideTabButton = ({route, isFocused, descriptor, navigation}) => {
	const options = descriptor?.options || {};
	const color = isFocused ? colors.primary : colors.muted;
	const icon = options.tabBarIcon?.({focused: isFocused, color, size: ICON_SIZE});
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
		<Pressable
			onPress={onPress}
			style={({pressed}) => [styles.sideButton, pressed ? styles.sideButtonPressed : null]}
			hitSlop={6}
		>
			<View style={[styles.iconWrap, isFocused ? styles.iconWrapActive : null]}>{icon}</View>
			<Text
				style={[styles.sideLabel, isFocused ? styles.sideLabelActive : null]}
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
};

const ModernTabBar = ({state, descriptors, navigation, bottomInset}) => {
	const findRoute = (name) => state.routes.find((r) => r.name === name);
	const leftTabs = LEFT_TAB_NAMES.map(findRoute).filter(Boolean);
	const rightTabs = RIGHT_TAB_NAMES.map(findRoute).filter(Boolean);
	const createRoute = findRoute('create');
	const createIndex = state.routes.findIndex((r) => r.name === 'create');
	const isCreateFocused = state.index === createIndex;

	const onPressCreate = () => {
		if (!createRoute) return;
		const event = navigation.emit({
			type: 'tabPress',
			target: createRoute.key,
			canPreventDefault: true,
		});
		if (!isCreateFocused && !event.defaultPrevented) {
			navigation.navigate(createRoute.name);
		}
	};

	const renderSideTab = (route) => {
		const routeIndex = state.routes.findIndex((r) => r.key === route.key);
		const isFocused = state.index === routeIndex;
		return (
			<SideTabButton
				key={route.key}
				route={route}
				isFocused={isFocused}
				descriptor={descriptors[route.key]}
				navigation={navigation}
			/>
		);
	};

	return (
		<View style={[styles.outerContainer, {paddingBottom: Math.max(12, bottomInset + 6)}]}>
			<View style={styles.tabBar}>
				<View style={styles.sideZone}>{leftTabs.map(renderSideTab)}</View>
				<View style={styles.centerSlot} pointerEvents="box-none">
					<Pressable
						onPress={onPressCreate}
						style={({pressed}) => [
							styles.createButton,
							isCreateFocused ? styles.createButtonActive : null,
							pressed ? styles.createButtonPressed : null,
						]}
					>
						<Feather name="edit-3" size={CREATE_ICON_SIZE} color={colors.surface} />
					</Pressable>
				</View>
				<View style={styles.sideZone}>{rightTabs.map(renderSideTab)}</View>
			</View>
		</View>
	);
};

export default TabsLayout;

const styles = StyleSheet.create({
	outerContainer: {
		paddingHorizontal: 14,
		paddingTop: 8,
		backgroundColor: 'transparent',
	},
	tabBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 28,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 10,
		paddingHorizontal: 8,
		shadowColor: '#0f172a',
		shadowOpacity: 0.10,
		shadowRadius: 18,
		shadowOffset: {width: 0, height: 8},
		elevation: 10,
	},
	sideZone: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
	},
	sideButton: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 4,
		paddingHorizontal: 8,
		gap: 3,
		minWidth: 56,
	},
	sideButtonPressed: {
		opacity: 0.6,
	},
	iconWrap: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 14,
	},
	iconWrapActive: {
		backgroundColor: '#eef2ff',
	},
	sideLabel: {
		fontSize: 10,
		fontWeight: '600',
		color: colors.muted,
		letterSpacing: 0.2,
	},
	sideLabelActive: {
		color: colors.primary,
		fontWeight: '700',
	},
	centerSlot: {
		width: 76,
		alignItems: 'center',
		justifyContent: 'center',
	},
	createButton: {
		width: CREATE_BUTTON_SIZE,
		height: CREATE_BUTTON_SIZE,
		borderRadius: CREATE_BUTTON_SIZE / 2,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#1d2b64',
		shadowOpacity: 0.32,
		shadowRadius: 14,
		shadowOffset: {width: 0, height: 8},
		elevation: 10,
		transform: [{translateY: -22}],
		borderWidth: 4,
		borderColor: colors.background,
	},
	createButtonActive: {
		backgroundColor: '#243474',
	},
	createButtonPressed: {
		transform: [{translateY: -20}, {scale: 0.94}],
	},
});
