// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createContext} from 'react';

import type {LookupHandler} from './types';
import type {AvailableScreens} from '@typings/screens/navigation';

/** Post-level cookie and format for mmaction:// links inside MM blocks text blocks. */
export type MmBlocksInlineMarkdownActions = {
    mmBlocksActionCookie?: string;
    integrationFormat?: PostActionIntegrationFormat;
};

export type MmBlocksRenderContextValue = {
    channelId: string;

    /** Where the blocks are rendered. Posts use `post` so text inputs open a dedicated screen. */
    context: BlockActionContext;
    location: AvailableScreens;
    postId: string;
    imagesMetadata?: Record<string, PostImage>;
    inlineMarkdownActions: MmBlocksInlineMarkdownActions;
};

/** Post-level render context for MM blocks children (markdown, gallery, autocomplete, images). */
export const MmBlocksRenderContext = createContext<MmBlocksRenderContextValue | undefined>(undefined);

/** Measured inner width of the nearest ancestor `container` block (for image sizing). */
export const MmBlocksLayoutWidthContext = createContext<number | undefined>(undefined);

/** When true, form inputs/buttons render but do not dispatch actions (e.g. while a dialog is submitting). */
export const MmBlocksInteractionsDisabledContext = createContext(false);

/** Optional dynamic-select lookup (form `select` blocks with `data_source: 'dynamic'`). */
export const MmBlocksLookupContext = createContext<LookupHandler | undefined>(undefined);

export type MmBlocksFieldUploadingHandler = (fieldName: string, uploading: boolean) => void;

/** Per-field upload-in-progress tracking so dialogs/posts can disable submit until IDs settle. */
export const MmBlocksFieldUploadingContext = createContext<MmBlocksFieldUploadingHandler | undefined>(undefined);

/** True while any file_input field reports an in-flight upload. */
export const MmBlocksHasUploadingFieldsContext = createContext(false);
