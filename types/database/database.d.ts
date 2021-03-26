// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';
import {Migration} from '@nozbe/watermelondb/Schema/migrations';
import {Class} from '@nozbe/watermelondb/utils/common';

import {DatabaseType, IsolatedEntities} from './enums';

export type MigrationEvents = {
  onSuccess: () => void;
  onStarted: () => void;
  onFailure: (error: string) => void;
};

export type MMAdaptorOptions = {
  dbPath: string;
  schema: AppSchema;
  migrationSteps?: Migration[];
  migrationEvents?: MigrationEvents;
};

export type DatabaseConfigs = {
  actionsEnabled?: boolean;
  dbName: string;
  dbType?: DatabaseType.DEFAULT | DatabaseType.SERVER;
  serverUrl?: string;
};

export type DefaultNewServer = {
  databaseFilePath: string;
  displayName: string;
  serverUrl: string;
};

// A database connection is of type 'Database'; unless it fails to be initialize and in which case it becomes 'undefined'
export type DatabaseInstance = Database | undefined;

export type RawApp = {
  buildNumber: string;
  createdAt: number;
  id: string;
  versionNumber: string;
};

export type RawGlobal = {
  id: string;
  name: string;
  value: string;
};

export type RawServers = {
  dbPath: string;
  displayName: string;
  id: string;
  mentionCount: number;
  unreadCount: number;
  url: string;
};

export type RawCustomEmoji = {
  id?: string;
  name: string;
  create_at?: number;
  update_at?: number;
  delete_at?: number;
  creator_id?: string;
};

export type RawRole = {
  id: string;
  name: string;
  permissions: [];
};

export type RawSystem = {
  id: string;
  name: string;
  value: string;
};

export type RawTermsOfService = {
  id: string;
  acceptedAt: number;
};

export type RawDraft = {
  id?: string;
  channel_id: string;
  files?: FileInfo[];
  message?: string;
  root_id?: string;
};

export type RawEmbed = { data: {}; type: string; url: string };

export type RawPostMetadata = {
  data: any;
  type: string;
  postId: string;
  id?: string;
};

interface PostMetadataTypes {
  embeds: PostEmbed;
  images: Dictionary<PostImage>;
}

export type RawFile = {
  create_at: number;
  delete_at: number;
  extension: string;
  has_preview_image?: boolean;
  height: number;
  id?: string;
  localPath?: string;
  mime_type?: string;
  mini_preview?: string; // thumbnail
  name: string;
  post_id: string;
  size: number;
  update_at: number;
  user_id: string;
  width?: number;
};

export type RawReaction = {
  id?: string;
  create_at: number;
  delete_at: number;
  emoji_name: string;
  post_id: string;
  update_at: number;
  user_id: string;
};

export type RawPostsInChannel = {
  id?: string;
  channel_id: string;
  earliest: number;
  latest: number;
};

interface PostEmbed {
  type: PostEmbedType;
  url: string;
  data: Record<string, any>;
}

interface PostImage {
  height: number;
  width: number;
  format?: string;
  frame_count?: number;
}

interface PostImageMetadata extends PostImage {
  url: string;
}

export type PostMetadataData = Record<string, any> | PostImageMetadata;

export type PostMetadataType = 'images' | 'embeds';

// The RawPost describes the shape of the object received from a getPosts request
export type RawPost = {
  channel_id: string;
  create_at: number;
  delete_at: number;
  edit_at: number;
  file_ids?: string[];
  filenames?: string[];
  hashtags: string;
  id: string;
  is_pinned?: boolean;
  last_reply_at?: number;
  message: string;
  original_id: string;
  parent_id: string;
  participants?: null;
  pending_post_id: string;
  prev_post_id?: string; // taken from getPosts API call; outside of post object
  props: object;
  reply_count?: number;
  root_id: string;
  type: string;
  update_at: number;
  user_id: string;
  metadata?: {
    embeds?: RawEmbed[];
    emojis?: RawCustomEmoji[];
    files?: RawFile[];
    images?: Dictionary<PostImage>;
    reactions?: RawReaction[];
  };
};

export type RawChannelMembers = {
  channel_id: string;
  explicit_roles: string;
  last_update_at: number;
  last_viewed_at: number;
  mention_count: number;
  msg_count: number;
  notify_props: NotifyProps;
  roles: string;
  scheme_admin: boolean;
  scheme_guest: boolean;
  scheme_user: boolean;
  user_id: string;
};

export type ChannelType = 'D' | 'O' | 'G' | 'P';

export type RawChannel = {
  create_at: number;
  creator_id: string;
  delete_at: number;
  display_name: string;
  extra_update_at: number;
  group_constrained: boolean | null;
  header: string;
  id: string;
  last_post_at: number;
  name: string;
  props: null;
  purpose: string;
  scheme_id: null;
  shared: null;
  team_id: string;
  total_msg_count: number;
  type: ChannelType;
  update_at: number;
};

export type RawPostsInThread = {
  id?: string;
  earliest: number;
  latest?: number;
  post_id: string;
};

export type RecordValue =
  | RawApp
  | RawCustomEmoji
  | RawDraft
  | RawFile
  | RawGlobal
  | RawPost
  | RawPostMetadata
  | RawPostsInChannel
  | RawPostsInThread
  | RawReaction
  | RawRole
  | RawServers
  | RawSystem
  | RawTermsOfService;

export type Operator = {
  database: Database;
  value: RecordValue;
};

export type RecordOperator = (operator: Operator) => Promise<Model | null>;

export type BaseOperator = Operator & {
  generator: (model: Model) => void;
  tableName: string;
};

export type ExecuteRecords = {
  tableName: string;
  values: RecordValue[];
  recordOperator: RecordOperator;
};

export type PrepareRecords = ExecuteRecords & { database: Database };

export type BatchOperations = { database: Database; models: Model[] };

export type HandleIsolatedEntityData = {
  tableName: IsolatedEntities;
  values: RecordValue[];
};

export type Models = Class<Model>[];

// The elements needed to create a new connection
export type DatabaseConnection = {
  configs: DatabaseConfigs;
  shouldAddToDefaultDatabase: boolean;
};

// The elements required to switch to another active server database
export type ActiveServerDatabase = { displayName: string; serverUrl: string };

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

export type IdenticalRecord = {
  existingRecord: Model;
  newValue: RecordValue;
  tableName: string;
};
