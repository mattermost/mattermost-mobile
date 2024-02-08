// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PostModel from '@typings/database/models/servers/post';
import type {ViewToken} from 'react-native';

export type ViewableItemsChanged = {
    viewableItems: ViewToken[];
    changed: ViewToken[];
}

export type ViewableItemsChangedListenerEvent = (viewableItms: ViewToken[]) => void;

export type ScrollEndIndexListener = (fn: (endIndex: number) => void) => () => void;
export type ViewableItemsListener = (fn: (viewableItems: ViewToken[]) => void) => () => void;

export type PostWithPrevAndNext = {currentPost: PostModel; nextPost?: PostModel; previousPost?: PostModel; isSaved?: boolean};

export type PostListItem = {
    type: 'post';
    value: PostWithPrevAndNext;
}

export type PostListOtherItem = {
    type: 'date' | 'thread-overview' | 'start-of-new-messages' | 'user-activity';
    value: string;
}

export type PostList = Array<PostListItem | PostListOtherItem>;
