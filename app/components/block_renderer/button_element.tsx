// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {useCallback, useContext, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Loading from '@components/loading';
import ActionButtonText from '@components/post_list/post/body/content/message_attachments/action_button/action_button_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {MmBlocksInteractionContext} from './context';
import {resolveMmButtonColors} from './utils/button';

import type {ActionHandler} from './types';

type ButtonElementProps = {
    element: MmButtonBlock;
    onAction: ActionHandler;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            borderRadius: 4,
            borderWidth: 0,
            opacity: 1,
            alignItems: 'center',
            justifyContent: 'center',
            height: 36,
            alignSelf: 'flex-start',
        },
        buttonDisabled: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        text: {
            fontSize: 15,
            fontFamily: 'OpenSans-SemiBold',
            lineHeight: 17,
        },
    };
});

const contentStyles = StyleSheet.create({
    content: {
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
    },
});

export const ButtonElement = ({element, onAction, theme}: ButtonElementProps) => {
    const [isExecuting, setIsExecuting] = useState(false);
    const interactionsEnabled = useContext(MmBlocksInteractionContext);
    const style = getStyleSheet(theme);

    const onPress = useCallback(async () => {
        if (isExecuting || !element.text || !element.action_id) {
            return;
        }
        setIsExecuting(true);
        try {
            await onAction(element.action_id, undefined, element.query, element.cookie);
        } finally {
            setIsExecuting(false);
        }
    }, [element.action_id, element.cookie, element.query, element.text, isExecuting, onAction]);

    if (!element.text || !element.action_id) {
        return null;
    }

    const buttonColors = resolveMmButtonColors(element.style, theme);
    const customButtonStyle = {
        backgroundColor: buttonColors.backgroundColor,
    };
    const customButtonTextStyle = {
        color: buttonColors.color,
    };

    return (
        <Button
            testID={`mm_blocks.button.${element.action_id}`}
            buttonStyle={[style.button, customButtonStyle]}
            disabledStyle={style.buttonDisabled}
            onPress={onPress}
            disabled={element.disabled === true || !interactionsEnabled || isExecuting}
            accessibilityState={{busy: isExecuting}}
        >
            <View style={contentStyles.content}>
                {isExecuting && (
                    <Loading
                        color={customButtonTextStyle.color}
                        testID={`mm_blocks.button.${element.action_id}.loader`}
                    />
                )}
                <ActionButtonText
                    message={element.text}
                    style={[style.text, customButtonTextStyle]}
                />
            </View>
        </Button>
    );
};
