// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare class Notification {
    fireDate?: number | string;
    identifier: string;
    payload?: any;
    title: string;
    body: string;
    sound: string;
    badge: number;
    type: string;
    thread: string;
}

interface NotificationUserInfo {
    local: boolean;
    test?: boolean;
}

interface NotificationData {
    ack_id?: string;
    body?: string;
    channel_id: string;
    channel_name?: string;
    identifier?: string;
    from_webhook?: string;
    message?: string;
    override_icon_url?: string;
    override_username?: string;
    post_id: string;
    root_id?: string;
    sender_id?: string;
    sender_name?: string;
    server_id?: string;
    server_url?: string;
    team_id?: string;
    type: string;
    sub_type?: string;
    use_user_icon?: string;
    userInfo?: NotificationUserInfo;
    version: string;
    isCRTEnabled: boolean;
    data?: NotificationExtraData;
}

interface NotificationExtraData {
    channel?: Channel;
    myChannel?: ChannelMembership;
    categories?: CategoriesWithOrder;
    categoryChannels?: CategoryChannel[];
    team?: Team;
    myTeam?: TeamMembership;
    users?: UserProfile[];
    posts?: PostResponse;
    threads?: Thread[];
}

interface NotificationWithData extends Notification {
    payload?: NotificationData;
    foreground?: boolean;
    userInteraction?: boolean;
}

declare class NotificationWithChannel extends Notification {
    channel_id?: string;
    root_id?: string;
}
