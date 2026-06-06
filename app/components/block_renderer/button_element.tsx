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
    const isDisabled = element.disabled === true || !interactionsEnabled || isExecuting;
    const buttonColors = resolveMmButtonColors(element.style, theme);
    const useStyledTertiary = !isPrimary && !isDisabled;

    const backgroundStyle = useMemo((): StyleProp<ViewStyle> => {
        if (!useStyledTertiary) {
            return {};
        }

        return [
            {backgroundColor: buttonColors.backgroundColor},
        ];
    }, [buttonColors.backgroundColor, useStyledTertiary]);

    const textStyle = useMemo((): StyleProp<TextStyle> => {
        if (!useStyledTertiary) {
            return undefined;
        }

        return {color: buttonColors.color};
    }, [buttonColors.color, useStyledTertiary]);

    const handlePress = usePreventDoubleTap(useCallback(async () => {
        try {
            setIsExecuting(true);
            await onAction(element.action_id, undefined, element.query, element.cookie);
        } finally {
            setIsExecuting(false);
        }
    }, [element.action_id, element.cookie, element.query, onAction]));

    if (!element.text || !element.action_id) {
        return null;
    }

    return (
        <Button
            theme={theme}
            text={element.text}
            testID={`mm_blocks.button.${element.action_id}`}
            onPress={handlePress}
            disabled={isDisabled}
            showLoader={isExecuting}
            size='m'
            emphasis={isPrimary || isDisabled ? 'primary' : 'tertiary'}
            backgroundStyle={backgroundStyle}
            textStyle={textStyle}
            renderLabelAsMarkdown={true}
        />
    );
};
