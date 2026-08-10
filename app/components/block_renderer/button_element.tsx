// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useMemo, useState} from 'react';
import {type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import Button from '@components/button';
import {usePreventDoubleTap} from '@hooks/utils';

import {MmBlocksHasUploadingFieldsContext} from './context';
import {useMmBlocksForm} from './form';
import {resolveMmButtonColors} from './utils/button';

import type {ActionHandler} from './types';

type ButtonElementProps = {
    element: MmButtonBlock;
    onAction: ActionHandler;
    theme: Theme;
};

export const ButtonElement = ({element, onAction, theme}: ButtonElementProps) => {
    const form = useMmBlocksForm();
    const hasUploadingFields = useContext(MmBlocksHasUploadingFieldsContext);
    const [isExecuting, setIsExecuting] = useState(false);
    const isPrimary = element.style === 'primary';
    const isSubmit = element.subtype === 'submit';
    const isDisabled = element.disabled === true || isExecuting || (isSubmit && hasUploadingFields);
    const useStyledTertiary = !isPrimary && !isDisabled;

    const buttonColors = useMemo(
        () => resolveMmButtonColors(element.style, theme),
        [element.style, theme],
    );

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
            const formValues = isSubmit ? form.values : undefined;
            await onAction({
                actionId: element.action_id,
                query: element.query,
                attachmentCookie: element.cookie,
                formValues,
                subtype: element.subtype,
            });
        } finally {
            setIsExecuting(false);
        }
    }, [element.action_id, element.cookie, element.query, element.subtype, form.values, isSubmit, onAction]));

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
