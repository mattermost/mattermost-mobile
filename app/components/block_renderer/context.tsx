// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createContext} from 'react';

import type {AvailableScreens} from '@typings/screens/navigation';

/** Post-level cookie and format for mmaction:// links inside MM blocks text blocks. */
export type MmBlocksInlineMarkdownActions = {
    mmBlocksActionCookie?: string;
    integrationFormat?: PostActionIntegrationFormat;
};

export type MmBlocksRenderContextValue = {
    channelId: string;
    location: AvailableScreens;
    postId: string;
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions: MmBlocksInlineMarkdownActions;
};

/** Post-level render context for MM blocks children (markdown, gallery, autocomplete, images). */
export const MmBlocksRenderContext = createContext<MmBlocksRenderContextValue | undefined>(undefined);

/** Measured inner width of the nearest ancestor `container` block (for image sizing). */
export const MmBlocksLayoutWidthContext = createContext<number | undefined>(undefined);
