// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {device} from 'detox';

export type PushTapTarget = {
    serverUrl: string;
    channelId: string;

    // Empty for a direct or group message: the app treats a push without a team as one.
    teamId: string;
    postId: string;
    senderName: string;
    message: string;
};

/**
 * The `userNotification` to pass to `device.launchApp` to simulate tapping a push notification.
 */
export const buildTapPayload = ({serverUrl, channelId, teamId, postId, senderName, message}: PushTapTarget) => {
    // The fields convertToNotificationData reads (app/utils/notification/index.ts) and
    // openNotification needs: type=message selects handleMessageNotification, server_url is
    // the registered server key, channel_id/team_id drive switchToChannelById.
    const fields = {
        type: 'message',
        version: '2',
        server_url: serverUrl,
        channel_id: channelId,
        team_id: teamId,
        post_id: postId,
        sender_name: senderName,
        message,
    };

    return {
        trigger: {type: 'push'},
        title: senderName,
        body: message,
        payload: device.getPlatform() === 'ios' ? fields : {pushNotification: fields},
    };
};
