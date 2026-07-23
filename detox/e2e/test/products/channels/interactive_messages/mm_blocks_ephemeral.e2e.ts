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
import {expect} from 'detox';

describe('Interactive mm_blocks (ephemeral post)', () => {
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        await MmBlocksTestHelper.requireWebhookSidecar();
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

    it('MM-T6230_1 - should render mm_blocks in an ephemeral post created via API', async () => {
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

    it('MM-T6231_1 - should show integration ephemeral after mm_blocks button in thread', async () => {
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

        await MmBlocksTestHelper.waitForIntegrationOkMessage();
        await MmBlocksTestHelper.expectOnlyVisibleToYou(true);

        await ThreadScreen.back();
    });

    it('MM-T6232_1 - should apply integration update to ephemeral mm_blocks post in thread', async () => {
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

    it('MM-T6233_1 - should keep username override after integration update in thread', async () => {
        await User.apiAdminLogin(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {EnablePostUsernameOverride: true},
        });

        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks anchor override');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks ephemeral override');
        const overrideAuthorName = 'Detox mm_blocks eph override';

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + override + apply update)',
            props: {
                from_webhook: 'true',
                override_username: overrideAuthorName,
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Apply update',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_apply_update_eph_override',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_apply_update_eph_override: {
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
        await MmBlocksTestHelper.expectPostAuthorName(overrideAuthorName, ephemeralMarker);

        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_apply_update_eph_override');
        await MmBlocksTestHelper.waitForPostText('DETOX_MM_BLOCKS_UPDATED');
        await MmBlocksTestHelper.expectPostAuthorName(overrideAuthorName, 'DETOX_MM_BLOCKS_UPDATED');

        await ThreadScreen.back();
    });

    it('MM-T6234_1 - should merge mm_blocks_actions query with block query on integration URL', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph query anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph query merge');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + query merge)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Run query merge',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_query_btn_eph',
                        query: {cli: 'from_block'},
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_query_btn_eph: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_query'),
                        query: {srv: 'from_action'},
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_query_btn_eph');

        await MmBlocksTestHelper.waitForTextMatching(/Detox mm_blocks query OK \(cli=from_block&srv=from_action\)/);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-T6235_1 - should let block query override duplicate mm_blocks_actions query keys', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph override anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph query override');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + query override)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Override dup key',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_query_override_eph',
                        query: {dup: 'from_block'},
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_query_override_eph: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_query'),
                        query: {dup: 'from_action'},
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_query_override_eph');

        await MmBlocksTestHelper.waitForTextMatching('Detox mm_blocks query OK (dup=from_block)');

        await ThreadScreen.back();
    });

    it('MM-T6236_1 - should merge static_select action and element query on integration URL', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph select query anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph static_select query');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + static_select query)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_static_select_query_eph',
                        placeholder: 'Pick a region',
                        query: {cli: 'from_block'},
                        options: [
                            {text: 'North', value: 'opt_north'},
                            {text: 'South', value: 'opt_south'},
                        ],
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_static_select_query_eph: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_query'),
                        query: {srv: 'from_action'},
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_static_select_query_eph');
        await MmBlocksTestHelper.selectStaticOption('North');

        await MmBlocksTestHelper.waitForTextMatching(/Detox mm_blocks query OK \(cli=from_block&srv=from_action\)/);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-T6237_1 - should send selected user id from static_select data_source users', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph ds users anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph static_select users');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + static_select users)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_ds_users_eph',
                        placeholder: 'Pick a user',
                        data_source: 'users',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_ds_users_eph: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_static_select'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_ds_users_eph');
        await MmBlocksTestHelper.selectIntegrationUser(testUser.id, testUser.username);

        await MmBlocksTestHelper.waitForStaticSelectOkMessage(testUser.id);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-T6238_1 - should send selected channel id from static_select data_source channels', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph ds channels anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph static_select channels');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + static_select channels)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'static_select',
                        action_id: 'detox_mm_blocks_ds_channels_eph',
                        placeholder: 'Pick a channel',
                        data_source: 'channels',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_ds_channels_eph: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_static_select'),
                        context: {},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksStaticSelect('detox_mm_blocks_ds_channels_eph');
        await MmBlocksTestHelper.selectIntegrationChannel(testChannel.id, testChannel.display_name);

        await MmBlocksTestHelper.waitForStaticSelectOkMessage(testChannel.id);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-T6239_1 - should send mm_blocks_actions context to integration', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph context anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph action_context');
        const contextMarker = MmBlocksTestHelper.randomMarker('ctx');

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + action context)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Verify context',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_echo_ctx_eph',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_echo_ctx_eph: {
                        type: 'external',
                        url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_context'),
                        context: {test_marker: contextMarker},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_echo_ctx_eph');

        await MmBlocksTestHelper.waitForContextOkMessage(contextMarker);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();

        await ThreadScreen.back();
    });

    it('MM-T6240_1 - should navigate via openURL action from ephemeral mm_blocks button', async () => {
        const anchorMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph openurl anchor');
        const ephemeralMarker = MmBlocksTestHelper.randomMarker('E2E mm_blocks eph openurl');

        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const targetChannelPath = `/${testTeam.name}/channels/${targetChannel.name}`;

        const {post: anchor} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: anchorMarker,
        });

        await User.apiAdminLogin(siteOneUrl);
        await Post.apiCreatePostEphemeral(siteOneUrl, testUser.id, {
            channel_id: testChannel.id,
            root_id: anchor.id,
            message: 'E2E mm_blocks (ephemeral + openURL)',
            props: {
                mm_blocks: [
                    {type: 'text', text: ephemeralMarker},
                    {
                        type: 'button',
                        text: 'Go to target channel',
                        style: 'primary',
                        action_id: 'detox_mm_blocks_openurl_eph',
                    },
                ],
                mm_blocks_actions: {
                    detox_mm_blocks_openurl_eph: {
                        type: 'openURL',
                        url: targetChannelPath,
                        query: {mm_openurl: 'from_action_eph'},
                    },
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(anchorMarker);
        await MmBlocksTestHelper.openThreadForPost(anchor.id, anchorMarker);
        await MmBlocksTestHelper.waitForPostText(ephemeralMarker);
        await MmBlocksTestHelper.tapMmBlocksButton('detox_mm_blocks_openurl_eph');

        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);
    });
});
