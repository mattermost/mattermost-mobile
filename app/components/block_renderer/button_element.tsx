// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useMemo, useState} from 'react';
import {type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import Button from '@components/button';
import {usePreventDoubleTap} from '@hooks/utils';

import {MmBlocksInteractionContext} from './context';
import {resolveMmButtonColors} from './utils/button';

import type {ActionHandler} from './types';

type ButtonElementProps = {
    element: MmButtonBlock;
    onAction: ActionHandler;
    theme: Theme;
};

export const ButtonElement = ({element, onAction, theme}: ButtonElementProps) => {
    const [isExecuting, setIsExecuting] = useState(false);
    const interactionsEnabled = useContext(MmBlocksInteractionContext);
    const isPrimary = element.style === 'primary';
    const buttonColors = resolveMmButtonColors(element.style, theme);

    const backgroundStyle = useMemo((): StyleProp<ViewStyle> => {
        if (isPrimary) {
            return {};
        }

        return [
            {backgroundColor: buttonColors.backgroundColor},
        ];
    }, [buttonColors.backgroundColor, isPrimary]);

    const textStyle = useMemo((): StyleProp<TextStyle> => {
        if (isPrimary) {
            return undefined;
        }

        return {color: buttonColors.color};
    }, [buttonColors.color, isPrimary]);

    const handlePress = usePreventDoubleTap(useCallback(async () => {
        if (!element.text || !element.action_id) {
            return;
        }
        try {
            setIsExecuting(true);
            await onAction(element.action_id, undefined, element.query, element.cookie);
        } finally {
            setIsExecuting(false);
        }
    }, [element.action_id, element.cookie, element.query, element.text, onAction]));

    if (!element.text || !element.action_id) {
        return null;
    }

    return (
        <Button
            theme={theme}
            text={element.text}
            testID={`mm_blocks.button.${element.action_id}`}
            onPress={handlePress}
            disabled={element.disabled === true || !interactionsEnabled || isExecuting}
            showLoader={isExecuting}
            size='m'
            emphasis={isPrimary ? 'primary' : 'tertiary'}
            backgroundStyle={backgroundStyle}
            textStyle={textStyle}
        />
    );
};
