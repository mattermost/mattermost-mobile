// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import Button from 'react-native-button';

import {postActionWithCookie} from '@actions/remote/integrations';
import {useServerUrl} from '@context/server';
import {getStatusColors} from '@utils/message_attachment_colors';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import ActionButtonText from './action_button_text';

type Props = {
    buttonColor?: string;
    cookie?: string;
    disabled?: boolean;
    id: string;
    name: string;
    postId: string;
    theme: ExtendedTheme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
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
            fontFamily: 'OpenSans-SemiBold',
            lineHeight: 17,
        },
    };
});

const ActionButton = ({buttonColor, cookie, disabled, id, name, postId, theme}: Props) => {
    const presssed = useRef(false);
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);
    let customButtonStyle;
    let customButtonTextStyle;

    const onPress = useCallback(preventDoubleTap(async () => {
        if (!presssed.current) {
            presssed.current = true;
            await postActionWithCookie(serverUrl, postId, id, cookie || '');
            presssed.current = false;
        }
    }), [id, postId, cookie]);

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
            onPress={onPress}
            disabled={disabled}
        >
            <ActionButtonText
                message={name}
                style={{...style.text, ...customButtonTextStyle}}
            />
        </Button>
    );
};

export default ActionButton;
