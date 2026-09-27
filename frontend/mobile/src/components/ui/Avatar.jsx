import {Image, StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';

const getInitials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const Avatar = ({name, uri, size = 40, style, accessibilityLabel}) => (
	<View style={[styles.base, {width: size, height: size, borderRadius: size / 2}, style]} accessibilityLabel={accessibilityLabel || name || 'Użytkownik'}>
		{uri ? <Image source={{uri}} style={{width: size, height: size, borderRadius: size / 2}} /> : <Text style={[styles.initials, {fontSize: Math.max(12, size * 0.32)}]}>{getInitials(name)}</Text>}
	</View>
);
export default Avatar;
const styles = StyleSheet.create({
	base: {alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, overflow: 'hidden'},
	initials: {color: colors.primary, fontWeight: '800'},
});
