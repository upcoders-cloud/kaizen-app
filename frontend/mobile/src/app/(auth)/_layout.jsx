import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';

const Layout = () => {
	return (
		<>
			<StatusBar style='auto'/>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'none',
				}}
			/>
		</>
	);
};

export default Layout;
