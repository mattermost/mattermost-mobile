// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {useCallback, useRef} from 'react';

import {postActionWithCookie} from '@actions/remote/integrations';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {getStatusColors} from '@utils/message_attachment';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

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
            backgroundColor: 'transparent',
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

    const onPress = usePreventDoubleTap(useCallback(async () => {
        if (!presssed.current) {
            presssed.current = true;
            await postActionWithCookie(serverUrl, postId, id, cookie || '');
            presssed.current = false;
        }
    }, [serverUrl, postId, id, cookie]));

    const STATUS_COLORS = getStatusColors(theme);
    let hexColor: string | undefined;
    if (buttonColor) {
        hexColor = secureGetFromRecord(STATUS_COLORS, buttonColor) || secureGetFromRecord(theme, buttonColor) || buttonColor;
    } else {
        hexColor = secureGetFromRecord(STATUS_COLORS, 'default');
    }
    if (hexColor) {
        customButtonStyle = {borderColor: changeOpacity(hexColor, 0.16), backgroundColor: changeOpacity(hexColor, 0.08), borderWidth: 0};
        customButtonTextStyle = {color: hexColor};
    }

    return (
        <Button
            buttonStyle={[style.button, customButtonStyle]}
            disabledStyle={style.buttonDisabled}
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
