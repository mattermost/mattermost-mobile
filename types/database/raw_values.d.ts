// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type AppInfo = {
    build_number: string;
    created_at: number;
    version_number: string;
};

type ChannelInfo = {
    id: string;
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

type MyTeam = {
    id: string;
    roles: string;
};

type PostsInChannel = {
    id?: string;
    channel_id: string;
    earliest: number;
    latest: number;
};

type PostsInThread = {
    id?: string;
    earliest: number;
    latest: number;
    root_id: string;
};

type Metadata = {
    data: PostMetadata;
    id: string;
}

type ReactionsPerPost = {
    post_id: string;
    reactions: Reaction[];
}

type IdValue = {
    id: string;
    value: unknown;
};

type ParticipantsPerThread = {
    thread_id: string;
    participants: ThreadParticipant[];
};

type TeamChannelHistory = {
    id: string;
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

type ThreadInTeam = {
    thread_id: string;
    team_id: string;
    loaded_in_global_threads: boolean;
};

type RawValue =
  | AppInfo
  | Category
  | CategoryChannel
  | Channel
  | ChannelInfo
  | ChannelMember
  | ChannelMembership
  | CustomEmoji
  | Draft
  | FileInfo
  | Group
  | GroupChannel
  | GroupTeam
  | GroupMembership
  | IdValue
  | Metadata
  | MyTeam
  | Post
  | PostsInChannel
  | PostsInThread
  | PreferenceType
  | Reaction
  | Role
  | Team
  | TeamChannelHistory
  | TeamMembership
  | TeamSearchHistory
  | Thread
  | ThreadInTeam
  | ThreadParticipant
  | UserProfile
  | Pick<ChannelMembership, 'channel_id' | 'user_id'>
