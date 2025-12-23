import {Tabs} from 'expo-router';
import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';

const CreateTabButton = ({children, onPress, accessibilityState}) => (
	<View style={styles.createButtonSlot}>
		<Pressable onPress={onPress} style={styles.createButtonWrapper}>
			<View
				style={[
					styles.createButton,
					accessibilityState?.selected ? styles.createButtonActive : null,
				]}
			>
				{children}
			</View>
		</Pressable>
	</View>
);

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
					tabBarLabel: () => null,
					tabBarButton: (props) => <CreateTabButton {...props} />,
					tabBarIcon: () => <Feather name="plus" size={24} color={colors.surface} />,
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

const styles = StyleSheet.create({
	createButtonSlot: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	createButtonWrapper: {
		top: -10,
		width: 56,
		height: 56,
		alignItems: 'center',
		justifyContent: 'center',
	},
	createButton: {
		width: 45,
		height: 45,
		borderRadius: 25,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#1d2b64',
		shadowOpacity: 0.2,
		shadowRadius: 10,
		shadowOffset: {width: 0, height: 6},
		elevation: 6,
	},
	createButtonActive: {
		backgroundColor: colors.primary,
	},
});
