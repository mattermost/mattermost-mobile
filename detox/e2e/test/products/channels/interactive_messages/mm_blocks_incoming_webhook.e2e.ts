// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MmBlocksTestHelper} from '@support/mm_blocks_test_helper';
import {
    Channel,
    Post,
    System,
    User,
} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {
    ChannelScreen,
    HomeScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Interactive mm_blocks (incoming webhook)', () => {
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const setup = await MmBlocksTestHelper.setupChannelTest();
        testChannel = setup.channel;
        testTeam = setup.team;
        testUser = setup.user;
    });

    afterAll(async () => {
        await MmBlocksTestHelper.ensureOnChannelScreen();
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T6214 should render native mm_blocks payload from an incoming webhook', async () => {
        const secondLine = 'Second line after divider.';

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks render', {
            text: 'E2E mm_blocks (native props)',
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Hello from **Detox** mm_blocks.'},
                    {type: 'divider'},
                    {type: 'text', text: secondLine},
                ],
            },
        });

        await MmBlocksTestHelper.waitForPostText(secondLine);
    });

    it('MM-T6215 should show disabled mm_blocks button without firing integration', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks disabled');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks disabled', {
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
        await expect(element(by.id('mm_blocks.button.detox_mm_blocks_disabled_inert'))).toExist();
    });

    it('MM-T6216 should omit malformed mm_blocks and render valid entries', async () => {
        const id = getRandomId();
        const marker = `E2E mm_blocks malformed ${id}`;
        const goodA = `MM_OK_A_${id}`;
        const goodB = `MM_OK_B_${id}`;
        const goodC = `MM_OK_C_${id}`;
        const goodD = `MM_OK_D_${id}`;

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks malformed', {
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
                    {type: 'static_select', placeholder: 'p', options: {not: 'array'}},
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
        await expect(element(by.text('missing action_id'))).not.toExist();
    });

    it('MM-T6217 should reach webhook sidecar and show integration ephemeral in thread', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = 'E2E mm_blocks external integration';

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks integration', {
            text: marker,
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

        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_integration');
        await MmBlocksTestHelper.waitForIntegrationOkMessage();
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6218 should apply integration update on webhook post', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks update', {
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

        await MmBlocksTestHelper.waitForPostText('Tap apply to run the update integration.');
        const {post: updatePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_apply_update');
        await MmBlocksTestHelper.waitForTextInChannelPost(updatePost.id, 'DETOX_MM_BLOCKS_UPDATED');
    });

    it('MM-T6219 should keep webhook username override after integration update', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        await User.apiAdminLogin(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {EnablePostUsernameOverride: true},
        });

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks override author');
        const overrideAuthorName = 'Detox mm_blocks override';

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks override author', {
            username: overrideAuthorName,
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Tap apply; author label must stay overridden.'},
                    {
                        type: 'button',
                        text: 'Apply update',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_apply_update_override',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_apply_update_override: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_update'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        const {post: overridePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await MmBlocksTestHelper.expectPostAuthorName(overrideAuthorName, marker, 'channel');
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_apply_update_override');
        await MmBlocksTestHelper.waitForTextInChannelPost(overridePost.id, 'DETOX_MM_BLOCKS_UPDATED');
        await MmBlocksTestHelper.expectChannelPostAuthorName(overrideAuthorName, overridePost.id);
    });

    it('MM-T6220 should send selected_option from static_select to integration', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks static_select');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks static_select', {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Choose a menu option to verify selected_option is POSTed.'},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_static_select',
                        placeholder: 'Pick a region',
                        options: [
                            {text: 'North', value: 'opt_north'},
                            {text: 'South', value: 'opt_south'},
                        ],
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_static_select: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_static_select'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_static_select');
        await MmBlocksTestHelper.selectStaticOption('South');
        await MmBlocksTestHelper.waitForStaticSelectOkMessage('opt_south');
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6221 should send selected user id from static_select data_source users', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks static_select users');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks static_select users', {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Pick a user; selected_option should be the user id.'},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_ds_users',
                        placeholder: 'Pick a user',
                        data_source: 'users',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_ds_users: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_static_select'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_ds_users');
        await MmBlocksTestHelper.selectIntegrationUser(testUser.id, testUser.username);
        await MmBlocksTestHelper.waitForStaticSelectOkMessage(testUser.id);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6222 should send selected channel id from static_select data_source channels', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks static_select channels');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks static_select channels', {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Pick a channel; selected_option should be the channel id.'},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_ds_channels',
                        placeholder: 'Pick a channel',
                        data_source: 'channels',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_ds_channels: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_static_select'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_ds_channels');
        await MmBlocksTestHelper.selectIntegrationChannel(testChannel.id, testChannel.display_name);
        await MmBlocksTestHelper.waitForStaticSelectOkMessage(testChannel.id);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6223 should send mm_blocks_actions context to integration', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks action_context');
        const contextMarker = MmBlocksTestHelper.randomMarker('ctx');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks context', {
            text: marker,
            props: {
                mm_blocks: [
                    {
                        type: 'text',
                        text: 'Tap the button; the integration should receive mm_blocks_actions.context.',
                    },
                    {
                        type: 'button',
                        text: 'Verify context',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_echo_ctx',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_echo_ctx: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_context'),
                        context: {test_marker: contextMarker},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_echo_ctx');
        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.waitForContextOkMessage(contextMarker);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6224 should navigate via openURL action from mm_blocks button', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks openURL');
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks openURL', {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Use the button to jump to the target channel via openURL.'},
                    {
                        type: 'button',
                        text: 'Go to target channel',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_openurl',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_openurl: {
                        type: 'openURL',
                        url: `/${testTeam.name}/channels/${targetChannel.name}`,
                        query: {mm_openurl: 'from_action'},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_openurl');
        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);
        await ChannelScreen.back();
        await ChannelScreen.open(MmBlocksTestHelper.CHANNELS_CATEGORY, testChannel.name);
    });

    it('MM-T6225 should merge mm_blocks_actions query with block query on integration URL', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks button query');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks button query', {
            text: marker,
            props: {
                mm_blocks: [
                    {
                        type: 'text',
                        text: 'Button merges action-level and block-level query into the integration URL.',
                    },
                    {
                        type: 'button',
                        text: 'Run query merge',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_query_btn',
                        query: {cli: 'from_block'},
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_query_btn: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_query'),
                        query: {srv: 'from_action'},
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_query_btn');
        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.waitForTextMatching(/Detox mm_blocks query OK \(cli=from_block&srv=from_action\)/);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6226 should let block query override duplicate mm_blocks_actions query keys', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks query override');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks query override', {
            text: marker,
            props: {
                mm_blocks: [
                    {
                        type: 'button',
                        text: 'Override dup key',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_query_override',
                        query: {dup: 'from_block'},
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_query_override: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_query'),
                        query: {dup: 'from_action'},
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_query_override');
        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.waitForTextMatching('Detox mm_blocks query OK (dup=from_block)');
        await ThreadScreen.back();
    });

    it('MM-T6227 should merge static_select action and element query on integration URL', async () => {
        if (!(await MmBlocksTestHelper.isWebhookSidecarReachableOrSkip())) {
            return;
        }

        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks static_select query');

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks select query', {
            text: marker,
            props: {
                mm_blocks: [
                    {type: 'text', text: 'Pick a region; the integration URL should include action + block query.'},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_static_select_query',
                        placeholder: 'Pick a region',
                        query: {cli: 'from_block'},
                        options: [
                            {text: 'North', value: 'opt_north'},
                            {text: 'South', value: 'opt_south'},
                        ],
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_static_select_query: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_query'),
                        query: {srv: 'from_action'},
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.openThreadForLastChannelPost(testChannel.id, marker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_static_select_query');
        await MmBlocksTestHelper.selectStaticOption('North');
        await MmBlocksTestHelper.waitForTextMatching(/Detox mm_blocks query OK \(cli=from_block&srv=from_action\)/);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    it('MM-T6228 should toggle collapsible mm_blocks open and closed', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks collapsible default');
        const headerLabel = `Detox collapsible header ${getRandomId()}`;
        const bodyLabel = `Detox collapsible body ${getRandomId()}`;

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks collapsible', {
            text: marker,
            props: {
                mm_blocks: [{
                    type: 'collapsible',
                    header: [{type: 'text', text: headerLabel}],
                    content: [{type: 'text', text: bodyLabel}],
                }],
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await expect(element(by.text(headerLabel))).toExist();
        await MmBlocksTestHelper.expectCollapsibleBodyVisibility(bodyLabel, false);
        await MmBlocksTestHelper.tapCollapsibleHeader(headerLabel);
        await MmBlocksTestHelper.expectCollapsibleBodyVisibility(bodyLabel, true);
        await MmBlocksTestHelper.tapCollapsibleHeader(headerLabel);
        await MmBlocksTestHelper.expectCollapsibleBodyVisibility(bodyLabel, false);
    });

    it('MM-T6229 should start expanded when collapsible collapsed is false', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks collapsible expanded');
        const headerLabel = `Detox collapsible open header ${getRandomId()}`;
        const bodyLabel = `Detox collapsible open body ${getRandomId()}`;

        await MmBlocksTestHelper.postIncomingWebhookBlocks(testChannel.id, 'Detox mm_blocks collapsible expanded', {
            text: marker,
            props: {
                mm_blocks: [{
                    type: 'collapsible',
                    collapsed: false,
                    header: [{type: 'text', text: headerLabel}],
                    content: [{type: 'text', text: bodyLabel}],
                }],
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker);
        await expect(element(by.text(headerLabel))).toExist();
        await MmBlocksTestHelper.expectCollapsibleBodyVisibility(bodyLabel, true);
        await MmBlocksTestHelper.tapCollapsibleHeader(headerLabel);
        await MmBlocksTestHelper.expectCollapsibleBodyVisibility(bodyLabel, false);
        await MmBlocksTestHelper.tapCollapsibleHeader(headerLabel);
        await MmBlocksTestHelper.expectCollapsibleBodyVisibility(bodyLabel, true);
    });
});
