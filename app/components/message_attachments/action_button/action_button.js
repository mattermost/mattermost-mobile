// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Button from 'react-native-button';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {STATUS_COLORS} from 'app/constants/colors';
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
            customButtonStyle = {borderColor: changeOpacity(color, 0.25), backgroundColor: '#ffffff'};
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
