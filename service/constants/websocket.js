// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const WebsocketEvents = {
    POSTED: 'posted',
    POST_EDITED: 'post_edited',
    POST_DELETED: 'post_deleted',
    CHANNEL_CREATED: 'channel_created',
    CHANNEL_DELETED: 'channel_deleted',
    DIRECT_ADDED: 'direct_added',
    LEAVE_TEAM: 'leave_team',
    USER_ADDED: 'user_added',
    USER_REMOVED: 'user_removed',
    USER_UPDATED: 'user_updated',
    TYPING: 'typing',
    STOP_TYPING: 'stop_typing',
    PREFERENCE_CHANGED: 'preference_changed',
    EPHEMERAL_MESSAGE: 'ephemeral_message',
    STATUS_CHANGED: 'status_change',
    HELLO: 'hello',
    WEBRTC: 'webrtc',
    REACTION_ADDED: 'reaction_added',
    REACTION_REMOVED: 'reaction_removed'
};

export default WebsocketEvents;
