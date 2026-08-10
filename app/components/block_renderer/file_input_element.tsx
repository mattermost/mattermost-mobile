// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo} from 'react';
import {Text, View} from 'react-native';

import Label from '@components/settings/label';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {MmBlocksFieldUploadingContext, MmBlocksInteractionsDisabledContext, MmBlocksRenderContext} from './context';
import {MmBlocksFieldError, useMmBlocksForm} from './form';
import MmBlocksFileUpload from './mm_blocks_file_upload';

import type {ActionHandler} from './types';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {marginBottom: 24},
    helpText: {
        color: theme.centerChannelColor,
        marginLeft: 15,
        marginTop: 4,
        opacity: 0.64,
        ...typography('Body', 75, 'Regular'),
    },
}));

type FileInputElementProps = {
    element: MmFileInputBlock;
    onAction: ActionHandler;
    theme: Theme;
};

/** Accepts both the comma-separated dialog `default` and an already-parsed ID list. */
function normalizeFileIds(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
    }
    if (typeof value === 'string' && value.trim()) {
        return value.split(',').map((id) => id.trim()).filter(Boolean);
    }
    return [];
}

export const FileInputElement = ({element, onAction, theme}: FileInputElementProps) => {
    const interactionsDisabled = useContext(MmBlocksInteractionsDisabledContext);
    const setFieldUploading = useContext(MmBlocksFieldUploadingContext);
    const renderContext = useContext(MmBlocksRenderContext);
    const {values, setValue, setDefaultValue} = useMmBlocksForm();
    const style = getStyleSheet(theme);

    const initialFileIds = useMemo(() => normalizeFileIds(element.initial_value), [element.initial_value]);

    useEffect(() => {
        if (!element.name) {
            return;
        }
        setDefaultValue(element.name, initialFileIds);
    }, [element.name, initialFileIds, setDefaultValue]);

    const handleFileSelected = useCallback(async (fileIds: string[]) => {
        setValue(element.name, fileIds);

        if (!element.onChange || interactionsDisabled) {
            return;
        }

        try {
            await onAction({
                actionId: element.onChange,
                formValues: {...values, [element.name]: fileIds},
            });
        } catch (error) {
            logError('error on FileInputElement.handleFileSelected', getFullErrorMessage(error));
        }
    }, [element.name, element.onChange, interactionsDisabled, onAction, setValue, values]);

    const handlePendingChange = useCallback((uploading: boolean) => {
        setFieldUploading?.(element.name, uploading);
    }, [element.name, setFieldUploading]);

    useEffect(() => {
        return () => {
            setFieldUploading?.(element.name, false);
        };
    }, [element.name, setFieldUploading]);

    if (!element.name || !renderContext) {
        return null;
    }

    const rawValue = values[element.name];
    const fileIds = rawValue === undefined || rawValue === null ? initialFileIds : normalizeFileIds(rawValue);

    return (
        <View style={style.container}>
            {Boolean(element.label?.trim()) && (
                <Label
                    label={element.label ?? ''}
                    optional={element.optional === true}
                    testID={`mm_blocks.file_input.${element.name}`}
                />
            )}
            <MmBlocksFileUpload
                channelId={renderContext.channelId}
                value={fileIds}
                allowMultiple={element.allow_multiple === true}
                disabled={interactionsDisabled || element.disabled === true}
                placeholder={element.placeholder}
                onFileSelected={handleFileSelected}
                onPendingChange={handlePendingChange}
                theme={theme}
                testID={`mm_blocks.file_input.${element.name}`}
            />
            {Boolean(element.help_text) && (
                <Text style={style.helpText}>{element.help_text}</Text>
            )}
            <MmBlocksFieldError name={element.name}/>
        </View>
    );
};
