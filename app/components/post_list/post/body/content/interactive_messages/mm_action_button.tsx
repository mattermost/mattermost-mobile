// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {useCallback, useRef} from 'react';

import ActionButtonText from '@components/post_list/post/body/content/message_attachments/action_button/action_button_text';
import {usePreventDoubleTap} from '@hooks/utils';
import {getStatusColors} from '@utils/message_attachment';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

import type {ActionHandler} from './block_renderer';

type Props = {
    element: MmButtonBlock;
    onAction: ActionHandler;
    postId: string;
    theme: Theme;
};

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
            marginTop: 8,
            justifyContent: 'center',
            height: 36,
            alignSelf: 'flex-start',
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

const MmActionButton = ({element, onAction, theme}: Props) => {
    const pressed = useRef(false);
    const style = getStyleSheet(theme);

    const onPress = usePreventDoubleTap(useCallback(async () => {
        if (!element.text || !element.action_id || pressed.current) {
            return;
        }
        pressed.current = true;
        await onAction(element.action_id, undefined, element.query, element.cookie);
        pressed.current = false;
    }, [element.action_id, element.cookie, element.query, element.text, onAction]));

    if (!element.text || !element.action_id) {
        return null;
    }

    const STATUS_COLORS = getStatusColors(theme);
    const buttonStyle = element.style ?? 'default';
    let colorKey = 'default';
    if (buttonStyle === 'primary') {
        colorKey = 'primary';
    } else if (buttonStyle === 'danger') {
        colorKey = 'danger';
    }
    const hexColor = secureGetFromRecord(STATUS_COLORS, colorKey) || STATUS_COLORS.default;
    const customButtonStyle = {
        borderColor: changeOpacity(hexColor, buttonStyle === 'default' ? 0.16 : 0),
        backgroundColor: buttonStyle === 'default' ? changeOpacity(hexColor, 0.08) : hexColor,
        borderWidth: buttonStyle === 'default' ? 0 : 0,
    };
    const customButtonTextStyle = {
        color: buttonStyle === 'default' ? hexColor : theme.buttonColor,
    };

    return (
        <Button
            testID={`mm_blocks.button.${element.action_id}`}
            buttonStyle={[style.button, customButtonStyle]}
            disabledStyle={style.buttonDisabled}
            onPress={onPress}
            disabled={element.disabled}
        >
            <ActionButtonText
                message={element.text}
                style={[style.text, customButtonTextStyle]}
            />
        </Button>
    );
};

export default MmActionButton;
