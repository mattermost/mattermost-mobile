// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {KeyboardAvoidingView, Platform, View} from 'react-native';

export default class KeyboardLayout extends Component {
    static propTypes = {
        behaviour: PropTypes.string,
        children: PropTypes.node,
        keyboardVerticalOffset: PropTypes.number,
        statusBarHeight: PropTypes.number,
        watchStatusBar: PropTypes.bool
    };

    static defaultProps = {
        keyboardVerticalOffset: 0
    };

    shouldComponentUpdate(nextProps) {
        return nextProps.statusBarHeight !== this.props.statusBarHeight;
    }

    render() {
        const {behaviour, children, keyboardVerticalOffset, statusBarHeight, watchStatusBar, ...otherProps} = this.props;

        if (Platform.OS === 'android') {
            return (
                <View {...otherProps}>
                    {children}
                </View>
            );
        }

        let height = 0;
        if (watchStatusBar && statusBarHeight > 20) {
            height = (statusBarHeight - 20) + keyboardVerticalOffset;
        } else {
            height = keyboardVerticalOffset;
        }

        return (
            <KeyboardAvoidingView
                behaviour={behaviour}
                keyboardVerticalOffset={height}
                {...otherProps}
            >
                {children}
            </KeyboardAvoidingView>
        );
    }
}
