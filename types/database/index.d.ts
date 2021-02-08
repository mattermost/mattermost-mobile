// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';
import {OperationType} from '../../app/database/admin/data_operator';

interface NotifyProps {
    channel: true;
    desktop: string;
    desktop_sound: true;
    email: true;
    first_name: true
    mention_keys: string;
    push: string;
}

interface UserProps {
    [userPropsName: string]: any
}

interface Timezone {
    automaticTimezone: string
    manualTimezone: string,
    useAutomaticTimezone: true,
}

interface PostEmbed {
    type: PostEmbedType;
    url: string;
    data: Record<string, any>;
}

interface CustomEmoji {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    creator_id: string;
    name: string;
    category: 'custom';
}

interface FileInfo {
    id: string;
    user_id: string;
    post_id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    name: string;
    extension: string;
    size: number;
    mime_type: string;
    width: number;
    height: number;
    has_preview_image: boolean;
    clientId: string;
    localPath?: string;
    uri?: string;
    loading?: boolean;
}

type PostEmbedType = 'image' | 'message_attachment' | 'opengraph';

interface PostImage {
    height: number;
    width: number;
    format?: string;
    frame_count?: number;
}

interface Reaction {
    user_id: string;
    post_id: string;
    emoji_name: string;
    create_at: number;
}

interface PostMetadataTypes {
    embeds: Array<PostEmbed>;
    emojis: Array<CustomEmoji>;
    files: Array<FileInfo>;
    images: Dictionary<PostImage>;
    reactions: Array<Reaction>;
}

type PostType = 'system_add_remove' |
    'system_add_to_channel' |
    'system_add_to_team' |
    'system_channel_deleted' |
    'system_channel_restored' |
    'system_displayname_change' |
    'system_convert_channel' |
    'system_ephemeral' |
    'system_header_change' |
    'system_join_channel' |
    'system_join_leave' |
    'system_leave_channel' |
    'system_purpose_change' |
    'system_remove_from_channel';

type RawApp = {
    buildNumber: string,
    createdAt: number,
    id: string,
    versionNumber: string,
}

type RecordValue = RawApp | any

type DataFactory = {
    db: Database,
    generator? : (model: Model) => void,
    optType?: OperationType,
    tableName: string,
    value: RecordValue,
}
