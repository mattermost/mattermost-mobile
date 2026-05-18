// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MmBlocksTestHelper} from '@support/mm_blocks_test_helper';
import {
    Post,
    User,
} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {
    ChannelScreen,
    HomeScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Interactive mm_blocks (ephemeral post)', () => {
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const setup = await MmBlocksTestHelper.setupChannelTest();
        testChannel = setup.channel;
        testUser = setup.user;
    });

    afterAll(async () => {
        try {
            await ThreadScreen.back();
        } catch {
            // Thread may not be open
        }
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-TBD should render mm_blocks in an ephemeral post created via API', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks ephemeral');
        const secondLine = 'Second line after divider.';

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            message: 'E2E mm_blocks (ephemeral)',
            props: {
                mm_blocks: [
                    {type: 'text', text: marker},
                    {type: 'divider'},
                    {type: 'text', text: secondLine},
                ],
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await expect(element(by.text(secondLine))).toExist();
    });

    it('MM-TBD should show integration ephemeral after mm_blocks button in thread', async () => {
        const webhookReachable = await MmBlocksTestHelper.isWebhookSidecarReachable();
        if (!webhookReachable) {
            // eslint-disable-next-line no-console
            console.warn('Skipping: webhook sidecar not reachable at', MmBlocksTestHelper.WEBHOOK_BASE_URL);
            return;
        }

        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks ephemeral action');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + external action)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Ping integration',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_integration',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_integration: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_integration');

        await waitFor(element(by.text(/Detox mm_blocks integration OK \(user:/))).toExist().withTimeout(timeouts.TEN_SEC);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-TBD should apply integration update to ephemeral mm_blocks post in thread', async () => {
        const webhookReachable = await MmBlocksTestHelper.isWebhookSidecarReachable();
        if (!webhookReachable) {
            // eslint-disable-next-line no-console
            console.warn('Skipping: webhook sidecar not reachable at', MmBlocksTestHelper.WEBHOOK_BASE_URL);
            return;
        }

        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks ephemeral update');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + apply update)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Apply update',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_apply_update',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_apply_update: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_update'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_apply_update');

        await MmBlocksTestHelper.waitForPostText('DETOX_MM_BLOCKS_UPDATED');

        await ThreadScreen.back();
    });
});
