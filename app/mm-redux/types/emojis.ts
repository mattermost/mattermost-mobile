// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type EmojiCategory = (
    | 'recent'
    | 'smileys-emotion'
    | 'people-body'
    | 'animals-nature'
    | 'food-drink'
    | 'travel-places'
    | 'activities'
    | 'objects'
    | 'symbols'
    | 'flags'
    | 'custom'
);

export type CustomEmoji = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    creator_id: string;
    name: string;
    category: 'custom';
};
export type StandardEmoji = {
    image: string;
    short_names: Array<string>;
    short_name: string;
    category: EmojiCategory;
    batch: number;
};
export type Emoji = StandardEmoji | CustomEmoji;
export type EmojisState = {
    customEmoji: {
        [x: string]: CustomEmoji;
    };
    nonExistentEmoji: Set<string>;
};
