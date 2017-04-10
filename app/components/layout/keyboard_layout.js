// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {KeyboardAvoidingView, Platform, View} from 'react-native';

export default class KeyboardLayout extends React.Component {
    static propTypes = {
        behaviour: React.PropTypes.string,
        children: React.PropTypes.node,
        keyboardVerticalOffset: React.PropTypes.number
    };

    render() {
        const {behaviour, children, keyboardVerticalOffset, ...otherProps} = this.props;

        if (Platform.OS === 'android') {
            return (
                <View {...otherProps}>
                    {children}
                </View>
            );
        }

        return (
            <KeyboardAvoidingView
                behaviour={behaviour}
                keyboardVerticalOffset={keyboardVerticalOffset}
                {...otherProps}
            >
                {children}
            </KeyboardAvoidingView>
        );
    }
}
