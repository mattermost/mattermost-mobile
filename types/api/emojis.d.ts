// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type EmojiCategory = (
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

type CustomEmoji = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    creator_id: string;
    name: string;
};

type SystemEmoji = {
    filename: string;
    aliases: string[];
    category: EmojiCategory;
    batch: number;
};

type Emoji = SystemEmoji | CustomEmoji;

type EmojisState = {
    customEmoji: {
        [x: string]: CustomEmoji;
    };
    nonExistentEmoji: Set<string>;
};
