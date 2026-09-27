import {Tabs} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from 'store/authStore';
import {radius, shadows} from 'theme/theme';

const LEFT_TAB_NAMES = ['index', 'ranking'];
const RIGHT_TAB_NAMES = ['my-cases', 'menu'];

const ICON_SIZE = 22;
const CREATE_ICON_SIZE = 26;
const CREATE_BUTTON_SIZE = 60;

const TabsLayout = () => {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const isApprover = Boolean(user?.permissions?.is_approver || user?.is_staff || user?.is_superuser ||
		['TEAM_LEAD', 'MANAGER', 'DIRECTOR'].includes(user?.role));

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
					title: 'Pomysły',
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
					tabBarIcon: () => <Feather name="plus" size={CREATE_ICON_SIZE} color={colors.surface} />,
				}}
			/>
			<Tabs.Screen
				name="my-cases"
				options={{
					title: isApprover ? 'Akceptacje' : 'Moje sprawy',
					href: '/my-cases',
					tabBarIcon: ({color}) => <Feather name={isApprover ? 'check-circle' : 'clipboard'} size={ICON_SIZE} color={color} />,
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
			accessibilityRole="tab"
			accessibilityLabel={label}
			accessibilityState={{selected: isFocused}}
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
						accessibilityRole="tab"
						accessibilityLabel="Dodaj pomysł"
						accessibilityState={{selected: isCreateFocused}}
						style={({pressed}) => [
							styles.createButton,
							isCreateFocused ? styles.createButtonActive : null,
							pressed ? styles.createButtonPressed : null,
						]}
					>
						<Feather name="plus" size={CREATE_ICON_SIZE} color={colors.surface} />
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
		paddingHorizontal: 10,
		paddingTop: 8,
		zIndex: 20,
		elevation: 20,
		backgroundColor: 'transparent',
	},
	tabBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 10,
		paddingHorizontal: 8,
		...shadows.floating,
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
		paddingHorizontal: 3,
		gap: 3,
		minWidth: 52,
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
		backgroundColor: colors.primarySoft,
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
		width: 68,
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
		...shadows.floating,
		transform: [{translateY: -22}],
		borderWidth: 4,
		borderColor: colors.background,
	},
	createButtonActive: {
		backgroundColor: colors.accent,
	},
	createButtonPressed: {
		transform: [{translateY: -20}, {scale: 0.94}],
	},
});
