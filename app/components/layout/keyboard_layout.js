// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {KeyboardAvoidingView, Platform, View} from 'react-native';

export default class KeyboardLayout extends Component {
    static propTypes = {
        behaviour: PropTypes.string,
        children: PropTypes.node,
        keyboardVerticalOffset: PropTypes.number
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
