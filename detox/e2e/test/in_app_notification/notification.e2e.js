// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {logoutUser, toChannelScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {Setup} from '@support/server_api';

const DetoxConstants = require('detox').DetoxConstants;

function getNotification(channel, team, user) {
    if (isAndroid()) {
        return {
            payload: {
                ack_id: 'ack-e2e-test-id',
                type: 'message',
                badge: 1,
                version: '2',
                channel_id: channel.id,
                channel_name: channel.name,
                team_id: team.id,
                sender_id: user.id,
                sender_name: user.name,
                message: 'This is an e2e test message',
                post_id: 'post-e2e-test-id',
                root_id: '',
            },
        };
    }
    return {
        trigger: {
            type: DetoxConstants.userNotificationTriggers.push,
        },
        badge: 1,
        body: 'This is an e2e test message',
        payload: {
            ack_id: 'ack-e2e-test-id',
            type: 'message',
            version: '2',
            channel_id: channel.id,
            channel_name: channel.name,
            team_id: team.id,
            sender_id: user.id,
            sender_name: user.name,
            post_id: 'post-e2e-test-id',
            root_id: '',
        },
    };
}

describe('in-app Notification', () => {
    let testNotification;
    let testChannel;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit();
        testChannel = channel;
        testNotification = getNotification(channel, team, user);
        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('MM-TXXXX should render an in-app notification', async () => {
        // # When a push notification is received
        await device.sendUserNotification(testNotification);
        await wait(timeouts.HALF_SEC);

        // * in-app notification shows
        await expect(element(by.id('in_app_notification'))).toBeVisible();
        await expect(element(by.id('in_app_notification.icon'))).toBeVisible();
        await expect(element(by.id('in_app_notification.title'))).toHaveText(testChannel.name);
        await expect(element(by.id('in_app_notification.message'))).toHaveText('This is an e2e test message');

        // # Wait for some profiles to load
        await wait(5 * timeouts.ONE_SEC);

        // * in-app notification hides
        await expect(element(by.id('in_app_notification'))).not.toBeVisible();
    });
});
