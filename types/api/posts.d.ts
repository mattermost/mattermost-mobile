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
    embeds?: PostEmbed[];
    emojis?: CustomEmoji[];
    files?: FileInfo[];
    images?: Dictionary<PostImage>;
    reactions?: Reaction[];
};

type Post = {
    id: string;
    create_at: number;
    update_at: number;
    edit_at: number;
    delete_at: number;
    is_pinned: boolean;
    user_id: string;
    channel_id: string;
    root_id: string;
    parent_id: string;
    original_id: string;
    message: string;
    type: PostType;
    props: Record<string, any>;
    hashtags: string;
    pending_post_id: string;
    reply_count: number;
    file_ids?: any[];
    metadata: PostMetadata;
    last_reply_at?: number;
    failed?: boolean;
    user_activity_posts?: Post[];
    state?: 'DELETED';
    ownPost?: boolean;
    prev_post_id?: string;
    participants: null|string[];
};

type PostWithFormatData = Post & {
    isFirstReply: boolean;
    isLastReply: boolean;
    previousPostIsComment: boolean;
    commentedOnPost?: Post;
    consecutivePostByUser: boolean;
    replyCount: number;
    isCommentMention: boolean;
    highlight: boolean;
};

type PostOrderBlock = {
    order: string[];
    recent?: boolean;
    oldest?: boolean;
};

type MessageHistory = {
    messages: string[];
    index: {
        post: number;
        comment: number;
    };
};

type PostsState = {
    posts: IDMappedObjects<Post>;
    postsInChannel: Dictionary<PostOrderBlock[]>;
    postsInThread: RelationOneToMany<Post, Post>;
    reactions: RelationOneToOne<Post, Dictionary<Reaction>>;
    openGraph: RelationOneToOne<Post, any>;
    pendingPostIds: string[];
    selectedPostId: string;
    currentFocusedPostId: string;
    messagesHistory: MessageHistory;
    expandedURLs: Dictionary<string>;
};

type PostProps = {
    disable_group_highlight?: boolean;
    mentionHighlightDisabled: boolean;
};

type PostResponse = PostOrderBlock & {
    posts: IDMappedObjects<Post>;
};
