import {forwardRef, useEffect, useMemo, useState} from 'react';
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
} from 'react-native';
const KeyboardAwareScrollView = forwardRef(
	(
		{
			children,
			contentContainerStyle,
			style,
			keyboardAvoidingViewStyle,
			keyboardDismissMode = 'on-drag',
			keyboardShouldPersistTaps = 'handled',
			keyboardVerticalOffset = 0,
			extraScrollPadding = 0,
			...scrollProps
		},
		ref
	) => {
		const [keyboardHeight, setKeyboardHeight] = useState(0);

		useEffect(() => {
			const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
			const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
			const handleShow = (event) => {
				setKeyboardHeight(event?.endCoordinates?.height ?? 0);
			};
			const handleHide = () => setKeyboardHeight(0);
			const showSubscription = Keyboard.addListener(showEvent, handleShow);
			const hideSubscription = Keyboard.addListener(hideEvent, handleHide);
			return () => {
				showSubscription.remove();
				hideSubscription.remove();
			};
		}, []);

		const basePaddingBottom = useMemo(() => {
			const flattened = StyleSheet.flatten(contentContainerStyle) || {};
			if (typeof flattened.paddingBottom === 'number') return flattened.paddingBottom;
			if (typeof flattened.paddingVertical === 'number') return flattened.paddingVertical;
			if (typeof flattened.padding === 'number') return flattened.padding;
			return 0;
		}, [contentContainerStyle]);

		const mergedContentStyle = useMemo(() => {
			const paddingBottom = basePaddingBottom + keyboardHeight + extraScrollPadding;
			return [contentContainerStyle, {paddingBottom}];
		}, [basePaddingBottom, contentContainerStyle, extraScrollPadding, keyboardHeight]);

		return (
			<KeyboardAvoidingView
				style={[styles.flex, keyboardAvoidingViewStyle]}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				keyboardVerticalOffset={keyboardVerticalOffset}
			>
				<ScrollView
					ref={ref}
					style={style}
					contentContainerStyle={mergedContentStyle}
					keyboardShouldPersistTaps={keyboardShouldPersistTaps}
					keyboardDismissMode={keyboardDismissMode}
					{...scrollProps}
				>
					{children}
				</ScrollView>
			</KeyboardAvoidingView>
		);
	}
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

export default KeyboardAwareScrollView;

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
});
