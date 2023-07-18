// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PostType =
    | ''
    | 'system_add_remove'
    | 'system_add_to_channel'
    | 'system_add_to_team'
    | 'system_channel_deleted'
    | 'system_channel_restored'
    | 'system_displayname_change'
    | 'system_convert_channel'
    | 'system_ephemeral'
    | 'system_header_change'
    | 'system_join_channel'
    | 'system_join_leave'
    | 'system_leave_channel'
    | 'system_purpose_change'
    | 'system_remove_from_channel';

type PostEmbedType = 'image' | 'message_attachment' | 'opengraph';

type PostAcknowledgement = {
    post_id: string;
    user_id: string;
    acknowledged_at: number;
}

type PostPriority = {
    priority: '' | 'urgent' | 'important';
    requested_ack?: boolean;
    persistent_notifications?: boolean;
};

type PostEmbed = {
    type: PostEmbedType;
    url: string;
    data: Record<string, any>;
};

type PostImage = {
    height: number;
    width: number;
    format?: string;
    frame_count?: number;
};

type PostMetadata = {
    acknowledgements?: PostAcknowledgement[];
    embeds?: PostEmbed[];
    emojis?: CustomEmoji[];
    files?: FileInfo[];
    images?: Dictionary<PostImage | undefined>;
    reactions?: Reaction[];
    priority?: PostPriority;
};

type Post = {
    id: string;
    create_at: number;
    update_at: number;
    edit_at: number;
    delete_at: number;
    is_following?: boolean;
    is_pinned: boolean;
    user_id: string;
    channel_id: string;
    root_id: string;
    original_id: string;
    message: string;
    message_source?: string;
    type: PostType;
    participants?: null | UserProfile[]|string[];
    props: Record<string, any>;
    hashtags: string;
    pending_post_id: string;
    reply_count: number;
    file_ids?: any[];
    metadata: PostMetadata;
    last_reply_at?: number;
    user_activity_posts?: Post[];
    state?: 'DELETED';
    prev_post_id?: string;
};

type PostProps = {
    disable_group_highlight?: boolean;
    mentionHighlightDisabled: boolean;
};

type PostResponse = {
    order: string[];
    posts: IDMappedObjects<Post>;
    prev_post_id?: string;
};

type SearchMatches = {[key: $ID<Post>]: string[]};

type SearchPostResponse = PostResponse & {
    matches?: SearchMatches;
}

type ProcessedPosts = {
    order: string[];
    posts: Post[];
    previousPostId?: string;
}

type MessageAttachment = {
    id: number;
    fallback: string;
    color: string;
    pretext: string;
    author_name: string;
    author_link: string;
    author_icon: string;
    title: string;
    title_link: string;
    text: string;
    fields: MessageAttachmentField[];
    image_url: string;
    thumb_url: string;
    footer: string;
    footer_icon: string;
    timestamp: number | string;
    actions?: PostAction[];
};

type MessageAttachmentField = {
    title: string;
    value: any;
    short: boolean;
}

type PostSearchParams = {
    terms: string;
    is_or_search: boolean;
    include_deleted_channels?: boolean;
    time_zone_offset?: number;
    page?: number;
    per_page?: number;
};

type FetchPaginatedThreadOptions = {
    fetchThreads?: boolean;
    collapsedThreads?: boolean;
    collapsedThreadsExtended?: boolean;
    direction?: 'up'|'down';
    fetchAll?: boolean;
    perPage?: number;
    fromCreateAt?: number;
    fromPost?: string;
}
