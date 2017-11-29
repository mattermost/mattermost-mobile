// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {KeyboardAvoidingView, Platform, View} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class KeyboardLayout extends PureComponent {
    static propTypes = {
        behaviour: PropTypes.string,
        children: PropTypes.node,
        keyboardVerticalOffset: PropTypes.number,
        statusBarHeight: PropTypes.number,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        keyboardVerticalOffset: 0
    };

    render() {
        const {behaviour, children, keyboardVerticalOffset, statusBarHeight, theme, ...otherProps} = this.props;
        const style = getStyleFromTheme(theme);

        if (Platform.OS === 'android') {
            return (
                <View
                    style={style.keyboardLayout}
                    {...otherProps}
                >
                    {children}
                </View>
            );
        }

        let height = 0;
        if (statusBarHeight > 20) {
            height = (statusBarHeight - 20) + keyboardVerticalOffset;
        } else {
            height = keyboardVerticalOffset;
        }

        return (
            <KeyboardAvoidingView
                behaviour={behaviour}
                keyboardVerticalOffset={height}
                style={style.keyboardLayout}
                {...otherProps}
            >
                {children}
            </KeyboardAvoidingView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        keyboardLayout: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            paddingBottom: 0
        }
    };
});
