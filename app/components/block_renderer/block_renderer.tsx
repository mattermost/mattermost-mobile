// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {
    MmBlocksFieldUploadingContext,
    MmBlocksHasUploadingFieldsContext,
    MmBlocksLookupContext,
    type MmBlocksInlineMarkdownActions,
} from './context';
import {MmBlocksForm, type MmBlocksFormErrors, type MmBlocksFormErrorsChange} from './form';
import {ContainerBlock} from './layout_blocks';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

import type {ActionHandler, LookupHandler} from './types';
import type {AvailableScreens} from '@typings/screens/navigation';

export type BlockRendererProps = {
    blocks: MmBlock[];
    channelId: string;

    /** Where the blocks are rendered; defaults to `dialog`. */
    context?: BlockActionContext;
    errors: MmBlocksFormErrors;
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions?: MmBlocksInlineMarkdownActions;
    location: AvailableScreens;
    onAction: ActionHandler;
    onErrorsChange: MmBlocksFormErrorsChange;
    onLookup?: LookupHandler;

    /** Notifies the parent when any file_input upload starts or all uploads finish. */
    onUploadingChange?: (uploading: boolean) => void;
    postId: string;
    theme: Theme;

    /**
     * When true, skip wrapping `blocks` in an `MmBlocksForm` — the caller already provides one
     * (e.g. a native dialog footer needs form values outside the rendered blocks).
     */
    omitForm?: boolean;
};

export const BlockRenderer = ({
    blocks,
    channelId,
    context = 'dialog',
    errors,
    imagesMetadata,
    inlineMarkdownActions,
    location,
    onAction,
    onErrorsChange,
    onLookup,
    onUploadingChange,
    postId,
    omitForm = false,
    theme,
}: BlockRendererProps) => {
    const [uploadingFields, setUploadingFields] = useState<Set<string>>(() => new Set());

    const setFieldUploading = useCallback((fieldName: string, uploading: boolean) => {
        setUploadingFields((prev) => {
            if (prev.has(fieldName) === uploading) {
                return prev;
            }
            const next = new Set(prev);
            if (uploading) {
                next.add(fieldName);
            } else {
                next.delete(fieldName);
            }
            return next;
        });
    }, []);

    const hasUploadingFields = uploadingFields.size > 0;

    useEffect(() => {
        onUploadingChange?.(hasUploadingFields);
    }, [hasUploadingFields, onUploadingChange]);

    const block = useMemo(() => ({
        type: 'container' as const,
        content: blocks,
    }), [blocks]);

    const content = (
        <ContainerBlock
            block={block}
            onAction={onAction}
            theme={theme}
        />
    );

    return (
        <MmBlocksContextProvider
            channelId={channelId}
            context={context}
            imagesMetadata={imagesMetadata}
            inlineMarkdownActions={inlineMarkdownActions}
            location={location}
            postId={postId}
        >
            <MmBlocksFieldUploadingContext.Provider value={setFieldUploading}>
                <MmBlocksHasUploadingFieldsContext.Provider value={hasUploadingFields}>
                    <MmBlocksLookupContext.Provider value={onLookup}>
                        {omitForm ? content : (
                            <MmBlocksForm
                                errors={errors}
                                onErrorsChange={onErrorsChange}
                            >
                                {content}
                            </MmBlocksForm>
                        )}
                    </MmBlocksLookupContext.Provider>
                </MmBlocksHasUploadingFieldsContext.Provider>
            </MmBlocksFieldUploadingContext.Provider>
        </MmBlocksContextProvider>
    );
};
