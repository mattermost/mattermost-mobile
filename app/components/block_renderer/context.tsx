// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createContext} from 'react';

import type {AvailableScreens} from '@typings/screens/navigation';

export type MmBlocksRenderContextValue = {
    channelId: string;
    location: AvailableScreens;
    postId: string;
};

/** Channel and screen location for MM blocks children (markdown, gallery, autocomplete). */
export const MmBlocksRenderContext = createContext<MmBlocksRenderContextValue | undefined>(undefined);

/** Post-level cookie and format for mmaction:// links inside MM blocks text blocks. */
export type MmBlocksInlineMarkdownActions = {
    mmBlocksActionCookie?: string;
    integrationFormat?: PostActionIntegrationFormat;
};

export const MmBlocksInlineMarkdownActionsContext = createContext<MmBlocksInlineMarkdownActions>({});

export const MmBlocksImagesMetadataContext = createContext<Record<string, PostImage> | undefined>(undefined);

/** How the immediate mm_blocks parent lays out direct children (`column` = vertical stack, `row` = horizontal flow). */
export const MmBlocksChildLayoutContext = createContext<'column' | 'row'>('column');

/** Measured inner width of the nearest ancestor `container` block (for image sizing). */
export const MmBlocksLayoutWidthContext = createContext<number | undefined>(undefined);

/** When false, block children should not handle presses, links, or other user input. */
export const MmBlocksInteractionContext = createContext(true);
