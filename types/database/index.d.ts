// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NotifyProps {
    channel: boolean;
    desktop: string;
    desktop_sound: boolean;
    email: boolean;
    first_name: boolean;
    mention_keys: string;
    push: string;
}

interface UserProps {
    [userPropsName: string]: any;
}

interface Timezone {
    automaticTimezone: string;
    manualTimezone: string;
    useAutomaticTimezone: boolean;
}

interface FileInfo {
    id?: string;
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

type PostType =
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
