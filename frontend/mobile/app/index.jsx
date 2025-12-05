import {StyleSheet, Text, View} from 'react-native';

const Home = () => {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Home</Text>
		</View>
	);
};

export default Home;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
	}
})