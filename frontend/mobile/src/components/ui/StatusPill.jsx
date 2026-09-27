import {StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';
import {radius, spacing, typography} from 'theme/theme';

const STATUS = {
	TO_VERIFY: {label: 'Do weryfikacji', background: colors.statusToVerify, color: colors.statusTextToVerify},
	SUBMITTED: {label: 'Zgłoszony', background: colors.statusSubmitted, color: colors.statusTextSubmitted},
	IN_PROGRESS: {label: 'W realizacji', background: colors.statusInProgress, color: colors.statusTextInProgress},
	IMPLEMENTED: {label: 'Wdrożony', background: colors.statusImplemented, color: colors.statusTextImplemented},
	CANCELLED: {label: 'Odrzucony', background: colors.statusCancelled, color: colors.statusTextCancelled},
};
const StatusPill = ({status, label, style}) => {
	const tone = STATUS[status] || STATUS.SUBMITTED;
	return <View style={[styles.base, {backgroundColor: tone.background}, style]}><Text style={[styles.text, {color: tone.color}]}>{label || tone.label}</Text></View>;
};
export default StatusPill;
const styles = StyleSheet.create({
	base: {alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill},
	text: {...typography.caption, fontWeight: '700'},
});
