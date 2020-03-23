// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Button from 'react-native-button';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {getStatusColors} from 'app/utils/message_attachment_colors';
import ActionButtonText from './action_button_text';

export default class ActionButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            doPostActionWithCookie: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        cookie: PropTypes.string,
        disabled: PropTypes.bool,
        buttonColor: PropTypes.string,
    };

    handleActionPress = preventDoubleTap(() => {
        const {actions, id, postId, cookie} = this.props;
        actions.doPostActionWithCookie(postId, id, cookie);
    }, 4000);

    render() {
        const {name, theme, disabled, buttonColor} = this.props;
        const style = getStyleSheet(theme);
        let customButtonStyle;
        let customButtonTextStyle;

        if (buttonColor) {
            const STATUS_COLORS = getStatusColors(theme);
            const hexColor = STATUS_COLORS[buttonColor] || theme[buttonColor] || buttonColor;
            customButtonStyle = {borderColor: changeOpacity(hexColor, 0.25), backgroundColor: '#ffffff'};
            customButtonTextStyle = {color: hexColor};
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
    const STATUS_COLORS = getStatusColors(theme);
    return {
        button: {
            borderRadius: 4,
            borderColor: changeOpacity(STATUS_COLORS.default, 0.25),
            borderWidth: 2,
            opacity: 1,
            alignItems: 'center',
            marginTop: 12,
            justifyContent: 'center',
            height: 36,
        },
        buttonDisabled: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        text: {
            color: STATUS_COLORS.default,
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 17,
        },
    };
});
