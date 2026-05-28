// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {MmBlocksInlineMarkdownActions} from './context';
import type {AvailableScreens} from '@typings/screens/navigation';

/** Optional 4th arg is legacy attachment `cookie` when the block was translated from `props.attachments`. */
export type ActionHandler = (
    actionId: string,
    selectedOption?: string,
    query?: Record<string, string>,
    attachmentCookie?: string,
) => void | Promise<void>;

export type BlockSwitchProps = {
    block: MmBlock;
    onAction: ActionHandler;
    postId: string;
    theme: Theme;
};

export type BlockRendererProps = {
    blocks: MmBlock[];
    channelId: string;
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions?: MmBlocksInlineMarkdownActions;
    location: AvailableScreens;
    onAction: ActionHandler;
    postId: string;
    theme: Theme;
};
