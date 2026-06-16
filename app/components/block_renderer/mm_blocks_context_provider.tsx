// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, type ReactNode} from 'react';

import {
    MmBlocksLayoutWidthContext,
    MmBlocksRenderContext,
    type MmBlocksInlineMarkdownActions,
    type MmBlocksRenderContextValue,
} from './context';

import type {AvailableScreens} from '@typings/screens/navigation';

export type MmBlocksContextProviderProps = {
    channelId: string;
    location: AvailableScreens;
    postId: string;
    children: ReactNode;
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions?: MmBlocksInlineMarkdownActions;
    layoutWidth?: number;
};

export const MmBlocksContextProvider = ({
    channelId,
    location,
    postId,
    children,
    imagesMetadata,
    inlineMarkdownActions,
    layoutWidth,
}: MmBlocksContextProviderProps) => {
    const renderContextValue = useMemo(
        (): MmBlocksRenderContextValue => ({
            channelId,
            location,
            postId,
            imagesMetadata,
            inlineMarkdownActions: inlineMarkdownActions ?? {},
        }),
        [channelId, imagesMetadata, inlineMarkdownActions, location, postId],
    );

    return (
        <MmBlocksRenderContext.Provider value={renderContextValue}>
            <MmBlocksLayoutWidthContext.Provider value={layoutWidth}>
                {children}
            </MmBlocksLayoutWidthContext.Provider>
        </MmBlocksRenderContext.Provider>
    );
};

export type MmBlocksExpandedContentPayload = MmBlocksRenderContextValue & {
    renderContent: () => ReactNode;
};
