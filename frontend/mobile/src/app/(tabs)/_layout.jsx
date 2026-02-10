import {Tabs} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const LEFT_TAB_NAMES = ['index'];
const RIGHT_TAB_NAMES_MANAGER = ['my-cases', 'profile'];
const RIGHT_TAB_NAMES_USER = ['profile'];

const ICON_SIZE = 24;
const CREATE_ICON_SIZE = 26;
const CREATE_BUTTON_SIZE = 56;

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
					tabBarIcon: ({color}) => <Feather name="home" size={ICON_SIZE} color={color} />,
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
					href: isManager ? '/my-cases' : null,
					tabBarIcon: ({color}) => <Feather name="clipboard" size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profil',
					tabBarIcon: ({color}) => <Feather name="user" size={ICON_SIZE} color={color} />,
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
	const createIndex = state.routes.findIndex((item) => item.name === 'create');
	const isCreateFocused = state.index === createIndex;

	const renderSideTab = (route) => {
		const routeIndex = state.routes.findIndex((item) => item.key === route.key);
		const isFocused = state.index === routeIndex;
		const descriptor = descriptors[route.key];
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
			<Pressable key={route.key} onPress={onPress} style={styles.sideButton}>
				{icon}
				<Text style={[styles.sideLabel, isFocused && styles.sideLabelActive]}>{label}</Text>
			</Pressable>
		);
	};

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

	return (
		<View style={[styles.tabBarContainer, {paddingBottom: Math.max(8, bottomInset)}]}>
			<View style={styles.tabBarRow}>
				<View style={styles.sideZone}>
					{leftTabs.map(renderSideTab)}
				</View>
				<View style={styles.centerSlot}>
					<Pressable
						onPress={onPressCreate}
						style={({pressed}) => [
							styles.createButton,
							isCreateFocused && styles.createButtonActive,
							pressed && styles.createButtonPressed,
						]}
					>
						<Feather name="edit-3" size={CREATE_ICON_SIZE} color={colors.surface} />
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
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
		paddingTop: 6,
		paddingHorizontal: 12,
	},
	tabBarRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},
	sideZone: {
		flex: 1,
		minHeight: 52,
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-evenly',
	},
	sideButton: {
		minWidth: 64,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 4,
		gap: 4,
	},
	sideLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.muted,
		letterSpacing: 0.1,
	},
	sideLabelActive: {
		color: colors.primary,
		fontWeight: '700',
	},
	centerSlot: {
		width: 80,
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
		shadowOpacity: 0.28,
		shadowRadius: 12,
		shadowOffset: {width: 0, height: 6},
		elevation: 8,
		transform: [{translateY: -14}],
	},
	createButtonActive: {
		backgroundColor: '#243474',
	},
	createButtonPressed: {
		transform: [{translateY: -12}, {scale: 0.94}],
	},
});
