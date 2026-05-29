// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, type ReactNode} from 'react';

import {
    MmBlocksChildLayoutContext,
    MmBlocksImagesMetadataContext,
    MmBlocksInlineMarkdownActionsContext,
    MmBlocksInteractionContext,
    MmBlocksLayoutWidthContext,
    MmBlocksRenderContext,
    type MmBlocksInlineMarkdownActions,
} from './context';

import type {AvailableScreens} from '@typings/screens/navigation';

export type MmBlocksContextProviderProps = {
    channelId: string;
    location: AvailableScreens;
    postId: string;
    children: ReactNode;
    childLayout?: 'column' | 'row';
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions?: MmBlocksInlineMarkdownActions;
    interactionsEnabled?: boolean;
    layoutWidth?: number;
};

export const MmBlocksContextProvider = ({
    channelId,
    location,
    postId,
    children,
    childLayout = 'column',
    imagesMetadata,
    inlineMarkdownActions,
    interactionsEnabled = true,
    layoutWidth,
}: MmBlocksContextProviderProps) => {
    const metadataValue = useMemo(() => imagesMetadata, [imagesMetadata]);
    const inlineMarkdownActionsValue = useMemo(
        () => inlineMarkdownActions ?? {},
        [inlineMarkdownActions],
    );
    const renderContextValue = useMemo(
        () => ({channelId, location, postId}),
        [channelId, location, postId],
    );

    return (
        <MmBlocksInteractionContext.Provider value={interactionsEnabled}>
            <MmBlocksRenderContext.Provider value={renderContextValue}>
                <MmBlocksImagesMetadataContext.Provider value={metadataValue}>
                    <MmBlocksInlineMarkdownActionsContext.Provider value={inlineMarkdownActionsValue}>
                        <MmBlocksLayoutWidthContext.Provider value={layoutWidth}>
                            <MmBlocksChildLayoutContext.Provider value={childLayout}>
                                {children}
                            </MmBlocksChildLayoutContext.Provider>
                        </MmBlocksLayoutWidthContext.Provider>
                    </MmBlocksInlineMarkdownActionsContext.Provider>
                </MmBlocksImagesMetadataContext.Provider>
            </MmBlocksRenderContext.Provider>
        </MmBlocksInteractionContext.Provider>
    );
};

export type MmBlocksExpandedContentPayload = {
    channelId: string;
    location: AvailableScreens;
    postId: string;
    childLayout: 'column' | 'row';
    renderContent: () => ReactNode;
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions?: MmBlocksInlineMarkdownActions;
};
