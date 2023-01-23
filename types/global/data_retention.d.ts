// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type GlobalDataRetentionPolicy = {
    file_deletion_enabled: boolean;
    file_retention_cutoff: number;
    message_deletion_enabled: boolean;
    message_retention_cutoff: number;
}

type TeamDataRetentionPolicy = {
    post_duration: number;
    team_id: string;
}

type ChannelDataRetentionPolicy = {
    post_duration: number;
    channel_id: string;
}
