import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import colors from 'theme/colors';
import {spacing} from 'theme/theme';

const ScreenContainer = ({children, scroll = false, style, contentStyle, edges = ['left', 'right', 'bottom'], ...props}) => {
	const content = scroll
		? <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled" {...props}>{children}</ScrollView>
		: <View style={[styles.fill, contentStyle]} {...props}>{children}</View>;
	return <SafeAreaView edges={edges} style={[styles.safe, style]}>{content}</SafeAreaView>;
};
export default ScreenContainer;
const styles = StyleSheet.create({safe: {flex: 1, backgroundColor: colors.background}, fill: {flex: 1}, content: {padding: spacing.lg, paddingBottom: spacing.xxxl}});
