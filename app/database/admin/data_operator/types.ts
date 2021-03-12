// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {PostImage, RawEmbed, RawFile, RawPost, RawReaction, RecordValue} from '@typings/database/database';
import {OperationType} from './index';

export type HandleReactions = {
    reactions: RawReaction[];
    prepareRowsOnly: boolean;
};

export type HandleFiles = {
    files: RawFile[];
    prepareRowsOnly: boolean;
};

export type HandlePostMetadata = {
    embeds: { embed: RawEmbed[]; postId: string }[];
    images: { images: Dictionary<PostImage>; postId: string }[];
    prepareRowsOnly: boolean;
};

export type HandlePosts = {
    optType: OperationType;
    orders?: string[];
    values: RawPost[];
    previousPostId?: string;
};

export type SanitizeReactions = {
    database: Database;
    post_id: string;
    rawReactions: RawReaction[];
}

export type MissingField = {
    fields: string[];
    rawValue: RecordValue;
    tableName: string;
};

export type AddPreviousPostId = {
    orders: string[];
    values: RawPost[];
    previousPostId: string;
}

export type SanitizePosts = {
    posts: RawPost[];
    orders: string[];
}
