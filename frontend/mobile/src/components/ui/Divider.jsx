import {StyleSheet, View} from 'react-native';
import colors from 'theme/colors';

const Divider = ({style}) => <View style={[styles.line, style]} />;
export default Divider;
const styles = StyleSheet.create({line: {height: StyleSheet.hairlineWidth, backgroundColor: colors.border}});
