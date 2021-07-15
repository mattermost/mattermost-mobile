// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type AppInfo = {
    build_number: string;
    created_at: number;
    version_number: string;
};

type ChannelInfo = {
    channel_id: string;
    guest_count: number;
    header: string;
    member_count: number;
    pinned_post_count: number;
    purpose: string;
};

type Draft = {
    channel_id: string;
    files?: FileInfo[];
    message?: string;
    root_id: string;
};

type GroupMembership = {
    id?: string;
    user_id: string;
    group_id: string;
};

type MyTeam = {
    team_id: string;
    roles: string;
    is_unread: boolean;
    mentions_count: number;
};

type PostsInChannel = {
    channel_id: string;
    earliest: number;
    latest: number;
};

type PostsInThread = {
    earliest: number;
    latest?: number;
    post_id: string;
};

type Metadata = {
    data: PostMetadata;
    post_id: string;
}

type IdValue = {
    id: string;
    value: string;
};

type TeamChannelHistory = {
    team_id: string;
    channel_ids: string[];
};

type TeamSearchHistory = {
    created_at: number;
    display_term: string;
    term: string;
    team_id: string;
};

type TermsOfService = {
    id: string;
    accepted_at: number;
    create_at: number;
    user_id: string;
    text: string;
};

type RawValue =
  | AppInfo
  | Channel
  | ChannelInfo
  | ChannelMembership
  | CustomEmoji
  | Draft
  | FileInfo
  | Group
  | GroupMembership
  | GroupChannel
  | GroupTeam
  | IdValue
  | Metadata
  | MyTeam
  | Post
  | PostsInChannel
  | PostsInThread
  | PreferenceType
  | Reaction
  | Role
  | SlashCommand
  | Team
  | TeamChannelHistory
  | TeamMembership
  | TeamSearchHistory
  | TermsOfService
  | UserProfile
