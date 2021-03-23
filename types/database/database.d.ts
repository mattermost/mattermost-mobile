// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';
import {Migration} from '@nozbe/watermelondb/Schema/migrations';
import {Class} from '@nozbe/watermelondb/utils/common';

import {DatabaseType, IsolatedEntities, OperationType} from './enums';

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

export type MMDatabaseConnection = {
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
  id: string;
  name: string;
  create_at?: number;
  update_at?: number;
  delete_at?: number;
  creator_id?: string;
};

export type RawRole = {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  scheme_managed: boolean;
};

export type RawSystem = {
  id: string;
  name: string;
  value: string;
};

export type RawTermsOfService = {
  id: string,
  acceptedAt: number;
  create_at: number,
  user_id: string,
  text: string
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

export type RawUser = {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  username: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  email_verified: boolean;
  auth_service: string;
  roles: string;
  locale: string;
  notify_props: {
    email: boolean;
    push: string;
    desktop: string;
    desktop_sound: boolean;
    mention_keys: string;
    channel: boolean;
    first_name: boolean;
    auto_responder_active: boolean;
    auto_responder_message: string;
    comments: string;
    push_status: string;
    desktop_notification_sound: string; // Not in use by the mobile app
  };
  last_password_update: number;
  last_picture_update: number;
  timezone: {
    useAutomaticTimezone: boolean;
    manualTimezone: string;
    automaticTimezone: string;
  };
  props: UserProps;
  position?: string;
  failed_attempts?: number;
  mfa_active?: boolean;
  terms_of_service_id?: string;
  terms_of_service_create_at?: number;
};

export type RawPreference = {
  id?: string;
  user_id: string;
  category: string;
  name: string;
  value: string;
};

export type RawTeamMembership = {
  delete_at: number;
  explicit_roles: string;
  id?: string;
  roles: string;
  scheme_admin: boolean;
  scheme_guest: boolean;
  scheme_user: boolean;
  team_id: string;
  user_id: string;
};

export type RawGroupMembership = {
  id?: string;
  user_id: string;
  group_id: string;
};

export type RawChannelMembership = {
  id?: string;
  channel_id: string;
  user_id: string;
  roles: string;
  last_viewed_at: number;
  msg_count: number;
  mention_count: number;
  notify_props: {
    desktop: string;
    email: string;
    ignore_channel_mentions: string;
    mark_unread: string;
    push: string;
  };
  last_update_at: number;
  scheme_guest: boolean;
  scheme_user: boolean;
  scheme_admin: boolean;
  explicit_roles: string;
};

export type RawValue =
  | RawApp
  | RawChannelMembership
  | RawCustomEmoji
  | RawDraft
  | RawFile
  | RawGlobal
  | RawGroupMembership
  | RawPost
  | RawPostMetadata
  | RawPostsInChannel
  | RawPostsInThread
  | RawPreference
  | RawReaction
  | RawRole
  | RawServers
  | RawSystem
  | RawTeamMembership
  | RawTermsOfService
  | RawUser;

export type MatchExistingRecord = { record?: Model, raw: RawValue }

export type DataFactory = {
  database: Database;
  generator?: (model: Model) => void;
  tableName?: string;
  value: MatchExistingRecord;
  action: OperationType;
};

export type HandleBaseData = {
  database?: Database;
  tableName: string;
  createRaws?: MatchExistingRecord[],
  updateRaws?: MatchExistingRecord[];
  recordOperator: (DataFactory) => void;
};

export type BatchOperations = { database: Database; models: Model[] };

export type HandleIsolatedEntityData = {
  tableName: IsolatedEntities;
  values: RawValue[];
};

export type Models = Class<Model>[];

// The elements needed to create a new connection
export type DatabaseConnection = {
  databaseConnection: MMDatabaseConnection;
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
  newValue: RawValue;
  tableName: string;
};

export type MatchingRecords = {
  database: Database;
  tableName: string;
  condition: any;
};

export type RawWithNoId =
  | RawPreference
  | RawTeamMembership
  | RawCustomEmoji
  | RawGroupMembership
  | RawChannelMembership;

export type DiscardDuplicates = {
  rawValues: RawValue[];
  tableName: string;
  oneOfField: string;
  finder: (existing: Model, newElement: RawValue) => boolean;
};

export type HandleEntityRecords = {
  finder: (existing: Model, newElement: RawValue) => boolean;
  oneOfField: string;
  operator: (DataFactory) => Promise<Model | null>;
  rawValues: RawValue[];
  tableName: string;
};
