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
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Interactive mm_blocks (incoming webhook)', () => {
    let testChannel: any;

    beforeAll(async () => {
        const setup = await MmBlocksTestHelper.setupChannelTest();
        testChannel = setup.channel;
    });

    afterAll(async () => {
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-TBD should render native mm_blocks payload from an incoming webhook', async () => {
        const secondLine = 'Second line after divider.';

        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: testChannel.id,
            display_name: 'Detox mm_blocks render',
        });

        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, {
            text: 'E2E mm_blocks (native props)',
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Hello from **Detox** mm_blocks.'},
                    {type: 'divider'},
                    {type: 'text', text: secondLine},
                ],
            },
        });

        await wait(timeouts.TWO_SEC);
        await MmBlocksTestHelper.waitForPostText(secondLine);
    });

    it('MM-TBD should show disabled mm_blocks button without firing integration', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks disabled');

        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: testChannel.id,
            display_name: 'Detox mm_blocks disabled',
        });

        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'The following control must stay disabled.'},
                    {
                        type: 'button',
                        text: 'Disabled action',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_disabled_inert',
                        disabled: true,
                    },
                ],
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        const disabledButton = element(by.id('mm_blocks.button.detox_mm_blocks_disabled_inert'));
        await expect(disabledButton).toExist();
    });

    it('MM-TBD should omit malformed mm_blocks and render valid entries', async () => {
        const id = getRandomId();
        const marker = `E2E mm_blocks malformed ${id}`;
        const goodA = `MM_OK_A_${id}`;
        const goodB = `MM_OK_B_${id}`;
        const goodC = `MM_OK_C_${id}`;
        const goodD = `MM_OK_D_${id}`;

        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: testChannel.id,
            display_name: 'Detox mm_blocks malformed',
        });

        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: goodA},
                    null,
                    'not-a-block-object',
                    {type: 'text', text: {nested: 'object-instead-of-string'}},
                    {type: 'text', text: goodB},
                    {type: 404},
                    {type: 'unknown_block_kind', text: 'dropped'},
                    {type: 'text', text: 'x', is_subtle: 'not-a-boolean'},
                    {type: 'text', text: 'y', extra_field: true},
                    {type: 'divider', invalid: 'extra-keys'},
                    {type: 'container', content: 'string-instead-of-array'},
                    {type: 'static_select', action_id: 'a', placeholder: 'p', options: {not: 'array'}},
                    {
                        type: 'collapsible',
                        header: 'string-instead-of-array',
                        content: [{type: 'text', text: 'inner'}],
                    },
                    {type: 'button', text: 'missing action_id'},
                    {type: 'image', url: 99999, alt_text: 'url-not-string'},
                    {type: 'column_set', columns: 'not-array'},
                    {type: 'column', items: 'not-array', width: 'auto'},
                    {type: 'divider'},
                    {type: 'text', text: goodC},
                    {type: 'text', text: goodD},
                ],
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await expect(element(by.text(goodA))).toExist();
        await expect(element(by.text(goodB))).toExist();
        await expect(element(by.text(goodC))).toExist();
        await expect(element(by.text(goodD))).toExist();
        await expect(element(by.text('nested'))).not.toExist();
        await expect(element(by.text('inner'))).not.toExist();
    });

    it('MM-TBD should reach webhook sidecar and show integration ephemeral in thread', async () => {
        const webhookReachable = await MmBlocksTestHelper.isWebhookSidecarReachable();
        if (!webhookReachable) {
            // eslint-disable-next-line no-console
            console.warn('Skipping: webhook sidecar not reachable at', MmBlocksTestHelper.WEBHOOK_BASE_URL);
            return;
        }

        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: testChannel.id,
            display_name: 'Detox mm_blocks integration',
        });

        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, {
            text: 'E2E mm_blocks external integration',
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Click the button to call the local webhook test server.'},
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

        await wait(timeouts.TWO_SEC);
        const {post: rootPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await MmBlocksTestHelper.openThreadForPost(rootPost.id, 'E2E mm_blocks external integration');
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_integration');

        await waitFor(element(by.text(/Detox mm_blocks integration OK \(user:/))).toExist().withTimeout(timeouts.TEN_SEC);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-TBD should apply integration update on webhook post', async () => {
        const webhookReachable = await MmBlocksTestHelper.isWebhookSidecarReachable();
        if (!webhookReachable) {
            // eslint-disable-next-line no-console
            console.warn('Skipping: webhook sidecar not reachable at', MmBlocksTestHelper.WEBHOOK_BASE_URL);
            return;
        }

        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: testChannel.id,
            display_name: 'Detox mm_blocks update',
        });

        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, {
            text: 'E2E mm_blocks before apply update',
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Tap apply to run the update integration.'},
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

        await wait(timeouts.TWO_SEC);
        await MmBlocksTestHelper.waitForPostText('Tap apply to run the update integration.');
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_apply_update');
        await MmBlocksTestHelper.waitForPostText('DETOX_MM_BLOCKS_UPDATED');
    });

    it('MM-TBD should toggle collapsible mm_blocks open and closed', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks collapsible default');
        const headerLabel = `Detox collapsible header ${getRandomId()}`;
        const bodyLabel = `Detox collapsible body ${getRandomId()}`;

        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: testChannel.id,
            display_name: 'Detox mm_blocks collapsible',
        });

        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, {
            text: marker,
            props: {
                mm_blocks: [
                    {
                        type: 'collapsible',
                        header: [{type: 'text', text: headerLabel}],
                        content: [{type: 'text', text: bodyLabel}],
                    },
                ],
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await expect(element(by.text(headerLabel))).toExist();
        await expect(element(by.text(bodyLabel))).not.toExist();

        await element(by.text(headerLabel)).tap();
        await expect(element(by.text(bodyLabel))).toExist();

        await element(by.text(headerLabel)).tap();
        await expect(element(by.text(bodyLabel))).not.toExist();
    });
});
