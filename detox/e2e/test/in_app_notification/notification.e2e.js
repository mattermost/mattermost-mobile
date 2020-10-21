// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {logoutUser, toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';
import {isAndroid, timeouts, wait} from '@support/utils';

let notification;
if (isAndroid()) {
    notification = {
        payload: {
            ack_id: 'ack-e2e-test-id',
            type: 'message',
            badge: 1,
            version: '2',
            channel_id: 'channel-e2e-test-id',
            team_id: 'team-e2e-test-id',
            sender_id: 'sender-e2e-test-id',
            sender_name: 'E2E Sender',
            message: 'This is an e2e test message',
            channel_name: 'E2E Channel',
            post_id: 'post-e2e-test-id',
            root_id: '',
        },
    };
} else {
    notification = {
        trigger: 'push',
        badge: 1,
        title: 'E2E Channel',
        body: 'This is an e2e test message',
        payload: {
            ack_id: 'ack-e2e-test-id',
            type: 'message',
            version: '2',
            channel_id: 'channel-e2e-test-id',
            team_id: 'team-e2e-test-id',
            sender_id: 'sender-e2e-test-id',
            sender_name: 'E2E Sender',
            channel_name: 'E2E Channel',
            post_id: 'post-e2e-test-id',
            root_id: '',
        },
    };
}

describe('in-app Notification', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('MM-TXXXX should render an in-app notification', async () => {
        // # When a push notification is received
        await device.sendUserNotification(notification);
        await wait(timeouts.HALF_SEC);

        // * in-app notification shows
        await expect(element(by.id('in_app_notification'))).toBeVisible();
        await expect(element(by.id('in_app_notification.con'))).toBeVisible();
        await expect(element(by.id('in_app_notification.title'))).toHaveText('E2E Channel');
        await expect(element(by.id('in_app_notification.message'))).toHaveText('This is an e2e test message');

        // # Wait for some profiles to load
        await wait(5 * timeouts.ONE_SEC);

        // * in-app notification hides
        await expect(element(by.id('in_app_notification'))).not.toBeVisible();
    });
});
