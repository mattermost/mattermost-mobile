// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Database} from '@nozbe/watermelondb';

export type EmojiCategoryType = {
    key: string;
    index: number;
}

export type EmojiRowType = EmojiAlias[] | EmojiCategoryType;

export type EmojiOffsetType = {
    key: string;
    offset: number;
}

export type EmojiStore = {
    data: EmojiRowType[];
    fuse: any;
    filteredData: string[]|null;
    categories: any[];
    currentCagoryIndex: number;
    actions: {
        initialize: (database: Database, skinTone?: string) => void;
        search: (term: string) => void;
        resetData: () => void;
        setCurrentCategoryIndex: (index: number) => void;
    };
}
