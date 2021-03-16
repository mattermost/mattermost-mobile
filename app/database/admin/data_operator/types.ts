// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';
import {
    PostImage,
    RawEmbed,
    RawFile,
    RawPost,
    RawReaction,
    RecordValue,
} from '@typings/database/database';

export type HandleReactions = {
  reactions: RawReaction[];
  prepareRowsOnly: boolean;
};

export type HandleFiles = {
  files: RawFile[];
  prepareRowsOnly: boolean;
};

export type HandlePostMetadata = {
  embeds?: { embed: RawEmbed[]; postId: string }[];
  images?: { images: Dictionary<PostImage>; postId: string }[];
  prepareRowsOnly: boolean;
};

export type HandlePosts = {
  optType: OperationType;
  orders: string[];
  values: RawPost[];
  previousPostId?: string;
};

export type SanitizeReactions = {
  database: Database;
  post_id: string;
  rawReactions: RawReaction[];
};

export type ChainPosts = {
  orders: string[];
  rawPosts: RawPost[];
  previousPostId: string;
};

export type SanitizePosts = {
  posts: RawPost[];
  orders: string[];
};

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum IsolatedEntities {
  APP = 'app',
  GLOBAL = 'global',
  SERVERS = 'servers',
  CUSTOM_EMOJI = 'CustomEmoji',
  ROLE = 'Role',
  SYSTEM = 'System',
  TERMS_OF_SERVICE = 'TermsOfService',
}

export type IdenticalRecord = {
  existingRecord: Model;
  newValue: RecordValue;
  tableName: string;
}
