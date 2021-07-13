// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type EmojiCategory = (
    | 'recent'
    | 'people'
    | 'nature'
    | 'foods'
    | 'activity'
    | 'places'
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
    category: 'custom';
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
