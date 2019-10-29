// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-underscore-dangle */

import React from 'react';
import {
    TextInput,
    Text,
    TouchableWithoutFeedback,
    UIManager,
    requireNativeComponent,
} from 'react-native';
import invariant from 'invariant';

const AndroidTextInput = requireNativeComponent('PasteableTextInputAndroid');

// This class is copied from React Native's TextInput
// All credit goes to React Native team
// Source: https://github.com/facebook/react-native/blob/master/Libraries/Components/TextInput/TextInput.js#L1056
class CustomTextInput extends TextInput {
    // Override React Native's TextInput render for Android
    _renderAndroid = () => {
        const props = Object.assign({}, this.props);
        props.style = [this.props.style];
        props.autoCapitalize = UIManager.getViewManagerConfig(
            'AndroidTextInput',
        ).Constants.AutoCapitalizationType[props.autoCapitalize || 'sentences'];
        let children = this.props.children;
        let childCount = 0;
        React.Children.forEach(children, () => ++childCount);
        invariant(
            !(this.props.value && childCount),
            'Cannot specify both value and children.',
        );
        if (childCount > 1) {
            children = <Text>{children}</Text>;
        }

        if (props.selection && props.selection.end == null) {
            props.selection = {
                start: props.selection.start,
                end: props.selection.start,
            };
        }

        const textContainer = (
            <AndroidTextInput
                ref={this._setNativeRef}
                {...props}
                mostRecentEventCount={0}
                onFocus={this._onFocus}
                onBlur={this._onBlur}
                onChange={this._onChange}
                onSelectionChange={this._onSelectionChange}
                onTextInput={this._onTextInput}
                text={this._getText()}
                // eslint-disable-next-line react/no-children-prop
                children={children}
                disableFullscreenUI={this.props.disableFullscreenUI}
                textBreakStrategy={this.props.textBreakStrategy}
                onScroll={this._onScroll}
                onPaste={this._onPaste}
            />
        );

        return (
            <TouchableWithoutFeedback
                onLayout={props.onLayout}
                onPress={this._onPress}
                accessible={this.props.accessible}
                accessibilityLabel={this.props.accessibilityLabel}
                accessibilityRole={this.props.accessibilityRole}
                accessibilityStates={this.props.accessibilityStates}
                nativeID={this.props.nativeID}
                testID={this.props.testID}
            >
                {textContainer}
            </TouchableWithoutFeedback>
        );
    };

    _onPaste = (event) => {
        const {nativeEvent} = event;
        const {onPaste} = this.props;
        return onPaste?.(nativeEvent.error, nativeEvent.data);
    }
}

export default CustomTextInput;
