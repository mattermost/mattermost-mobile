// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ContainerBlock} from './layout_blocks';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

import type {BlockRendererProps} from './types';

export const BlockRenderer = ({
    blocks,
    channelId,
    imagesMetadata,
    inlineMarkdownActions,
    location,
    onAction,
    postId,
    theme,
}: BlockRendererProps) => {
    return (
        <MmBlocksContextProvider
            channelId={channelId}
            imagesMetadata={imagesMetadata}
            inlineMarkdownActions={inlineMarkdownActions}
            location={location}
        >
            <ContainerBlock
                block={{
                    type: 'container',
                    content: blocks,
                }}
                onAction={onAction}
                postId={postId}
                theme={theme}
            />
        </MmBlocksContextProvider>
    );
};
