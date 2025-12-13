import {Tabs} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';

const TabsLayout = () => {
	return (
		<Tabs
			backBehavior="initialRoute"
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.muted,
				tabBarStyle: {
					backgroundColor: colors.surface,
					borderTopColor: colors.border,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({color, size}) => <Feather name="home" size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="create"
				options={{
					title: 'Create',
					tabBarIcon: ({color, size}) => <Feather name="plus-circle" size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profile',
					tabBarIcon: ({color, size}) => <Feather name="user" size={size} color={color} />,
				}}
			/>
		</Tabs>
	);
};

export default TabsLayout;
