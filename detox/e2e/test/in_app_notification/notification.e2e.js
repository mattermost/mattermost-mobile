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

    it('MM-T3440 should render an in-app notification', async () => {
        const message = Date.now().toString();

        // # Type a message
        const postInput = await element(by.id('post_input'));
        await postInput.tap();
        await postInput.typeText(message);

        // # Tap the send button
        await element(by.id('send_button')).tap();

        // # Open Add reaction screen
        await element(by.text(message)).longPress();
        await element(by.id('reaction_picker.open')).tap();
        await element(by.id('screen.add_reaction.close')).tap();

        // # Skip on Android for now
        if (isAndroid()) {
            // eslint-disable-next-line no-console
            console.log('Skipping on Android until https://github.com/wix/Detox/issues/2141');
            return;
        }

        // # When a push notification is received
        await device.sendUserNotification(testNotification);
        await wait(timeouts.HALF_SEC);

        // * Verify in-app notification is shown
        await expect(element(by.id('in_app_notification'))).toBeVisible();
        await expect(element(by.id('in_app_notification.icon'))).toBeVisible();
        await expect(element(by.id('in_app_notification.title'))).toHaveText(testChannel.name);
        await expect(element(by.id('in_app_notification.message'))).toHaveText('This is an e2e test message');

        // # Wait for some profiles to load
        await wait(5 * timeouts.ONE_SEC);

        // * Verify in-app notification is hidden
        await expect(element(by.id('in_app_notification'))).not.toBeVisible();
    });
});
