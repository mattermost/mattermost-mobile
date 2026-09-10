// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Post, Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

// A real push cannot reach the CI app: the PR test servers have no push proxy (the harness
// already dismisses "Notifications cannot be received from this server" at four sites) and
// simulators/emulators receive no APNs/FCM. What CAN be exercised is everything the app does
// once a notification is tapped, which is the product logic MM-T3271/MM-T3272 protect:
// the tap -> onNotificationOpened -> processNotification -> openNotification ->
// switchToChannelById path (app/init/push_notifications.ts, app/actions/remote/notifications.ts).
//
// Detox delivers a synthetic notification as the app's launch reason:
//   device.launchApp({newInstance: false, userNotification})  == tap a push while backgrounded
//   device.launchApp({newInstance: true,  userNotification})  == tap a push while closed
// On iOS the framework hands `payload` to the app as the notification's userInfo. On Android
// NotificationDataParser turns `payload` into a Bundle and LaunchIntentsFactory spreads it as
// Intent extras; react-native-notifications' NotificationIntentAdapter then requires the
// fields under a "pushNotification" sub-bundle (otherwise it falls back to ALL extras, which
// would include Detox's own launch args). Hence the platform branch in buildTapPayload.
//
// Not covered here, deliberately: that a real post *produces* a real push. That needs a push
// proxy and a physical device and stays manual.

type TapTarget = {
    serverUrl: string;
    channelId: string;
    teamId: string;
    postId: string;
    senderName: string;
    message: string;
};

const buildTapPayload = ({serverUrl, channelId, teamId, postId, senderName, message}: TapTarget) => {
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
        payload: isIos() ? fields : {pushNotification: fields},
    };
};

describe('Notifications - Open App via Push Notification', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3271 - should open the channel the notification came from when tapped from the background', async () => {
        // # Open a channel, then send the app to the background.
        // Android: Detox's sendToHome is a plain HOME keypress (AndroidDriver -> uiDevice.pressHome)
        // with no in-app wait. iOS: deliberately not called. Detox implements it as an in-app
        // "waitForBackground" with no timeout (client/actions/actions.js), and on the iOS 26.x
        // simulator that callback never fires even though SpringBoard does come to the front --
        // the first run of this spec sat on "(id = 76) waitForBackground" until the 240 s test
        // timeout with the home screen in testFnFailure.png. The relaunch below resumes the
        // running app with the notification instead; the path it exercises
        // (onNotificationOpened -> processNotification -> openNotification) is the same.
        await ChannelScreen.open(channelsCategory, testChannel.name);
        if (isAndroid()) {
            await device.sendToHome();
        }

        // # Another user posts in the channel -- the post the notification is about
        const message = `push background ${getRandomId()}`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message});

        // # Tap the notification: bring the app back with it as the open reason.
        // Android has to use newInstance: true. With false, Detox builds an implicit
        // MAIN/LAUNCHER intent (LaunchIntentsFactory.intentWithNotificationData,
        // initialLaunch=false) that the OS refuses: "No Activity found to handle Intent
        // { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] ... }".
        // The fresh-process launch resolves the component explicitly, and the HOME press
        // above still makes this a real return from the background at the OS level.
        await device.launchApp({
            newInstance: isAndroid(),
            userNotification: buildTapPayload({
                serverUrl: serverOneUrl,
                channelId: testChannel.id,
                teamId: testTeam.id,
                postId: post.id,
                senderName: 'admin',
                message,
            }),
        });

        // # A fresh process shows the scheduled-post tooltip over the channel; its backdrop
        // fails the visibility check below, so clear it first (no-op when absent).
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify the app is on the channel the notification came from, showing that post
        await ChannelScreen.toBeVisible(timeouts.ONE_MIN);
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await ChannelScreen.hasPostMessage(post.id, message);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3272 - should open the channel and load all new posts when tapped from a closed app', async () => {
        // # Close the app
        await device.terminateApp();

        // # Another user makes several posts while the app is closed, then the one that
        // "triggers" the notification
        const olderMessages = [1, 2, 3].map((n) => `push closed ${n} ${getRandomId()}`);
        const olderPosts: any[] = [];
        for (const message of olderMessages) {
            // eslint-disable-next-line no-await-in-loop -- posts must land in order
            const {post} = await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message});
            olderPosts.push({id: post.id, message});
        }
        const triggerMessage = `push closed trigger ${getRandomId()}`;
        const {post: triggerPost} = await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: triggerMessage});

        // # Tap the notification: cold-start the app with it as the launch reason
        await device.launchApp({
            newInstance: true,
            userNotification: buildTapPayload({
                serverUrl: serverOneUrl,
                channelId: testChannel.id,
                teamId: testTeam.id,
                postId: triggerPost.id,
                senderName: 'admin',
                message: triggerMessage,
            }),
        });

        // # A fresh process shows the scheduled-post tooltip over the channel; its backdrop
        // fails the visibility check below, so clear it first (no-op when absent).
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify the app opened the channel the notification came from
        await ChannelScreen.toBeVisible(timeouts.ONE_MIN);
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // * Verify the notification's post and every post made while the app was closed loaded
        await ChannelScreen.hasPostMessage(triggerPost.id, triggerMessage);
        for (const {id, message} of olderPosts) {
            // eslint-disable-next-line no-await-in-loop -- sequential assertions on one list
            await ChannelScreen.hasPostMessage(id, message);
        }

        // # Go back to channel list screen so afterAll can reach the account tab
        await ChannelScreen.back();
        await wait(timeouts.ONE_SEC);
    });
});
