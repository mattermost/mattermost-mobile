// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Button from 'react-native-button';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import ActionButtonText from './action_button_text';
import {STATUS_COLORS} from '../message_attachment';

export default class ActionButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            doPostActionWithCookie: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        cookie: PropTypes.string.isRequired,
        disabled: PropTypes.bool,
        style: PropTypes.string,
    };

    handleActionPress = preventDoubleTap(() => {
        const {actions, id, postId, cookie} = this.props;
        actions.doPostActionWithCookie(postId, id, cookie);
    }, 4000);

    render() {
        const {name, theme, disabled, style: customStyle} = this.props;
        const style = getStyleSheet(theme);
        let customButtonStyle;
        let customButtonTextStyle;

        if (customStyle) {
            const color = STATUS_COLORS[customStyle] || theme[customStyle] || customStyle;
            customButtonStyle = {borderColor: color, backgroundColor: '#ffffff', borderWidth: 1};
            customButtonTextStyle = {color};
        }

        return (
            <Button
                containerStyle={[style.button, customButtonStyle]}
                disabledContainerStyle={style.buttonDisabled}
                onPress={this.handleActionPress}
                disabled={disabled}
            >
                <ActionButtonText
                    message={name}
                    style={{...style.text, ...customButtonTextStyle}}
                />
            </Button>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        button: {
            borderRadius: 2,
            backgroundColor: theme.buttonBg,
            opacity: 1,
            alignItems: 'center',
            marginBottom: 2,
            marginRight: 5,
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
        },
        buttonDisabled: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        text: {
            color: theme.buttonColor,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 13,
        },
    };
});
