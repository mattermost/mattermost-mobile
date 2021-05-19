// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';

import Config from '@assets/config.json';
import {Client} from '@client/rest';
import CONSTANTS from '@mm-redux/constants/general';
import {generateId} from '@mm-redux/utils/helpers';
import {Channel, ChannelMembership} from '@mm-redux/types/channels';
import {Post} from '@mm-redux/types/posts';
import {Team, TeamMembership} from '@mm-redux/types/teams';
import {UserProfile} from '@mm-redux/types/users';
import {IncomingWebhook, OAuthApp, OutgoingWebhook} from '@mm-redux/types/integrations';
import {FileInfo} from '@mm-redux/types/files';
import {Bot} from '@mm-redux/types/bots';
import {Role} from '@mm-redux/types/roles';
import {Dictionary} from '@mm-redux/types/utilities';

class TestHelper {
    basicUser: UserProfile | null;
    basicTeam: Team | null;
    basicTeamMember: TeamMembership | null;
    basicChannel: Channel | null;
    basicChannelMember: ChannelMembership | null;
    basicPost: Post | null;
    basicRoles: Dictionary<Role> | null;
    basicClient: Client | null;
    basicClient4: Client | null;

    constructor() {
        this.basicClient = null;
        this.basicClient4 = null;

        this.basicUser = null;
        this.basicTeam = null;
        this.basicTeamMember = null;
        this.basicChannel = null;
        this.basicChannelMember = null;
        this.basicPost = null;
        this.basicRoles = null;
    }

    activateMocking() {
        if (!nock.isActive()) {
            nock.activate();
        }
    }

    // TODO improve typing
    assertStatusOkay = (data: any) => {
        assert(data);
        assert(data.status === 'OK');
    };

    generateId = () => {
        return generateId();
    };

    createClient = () => {
        const client = new Client();

        client.setUrl(Config.DefaultServerUrl || Config.TestServerUrl);

        return client;
    };

    fakeChannel = (teamId: string) => {
        const name = this.generateId();

        return {
            name,
            team_id: teamId,
            display_name: `Unit Test ${name}`,
            type: 'O',
            delete_at: 0,
            total_msg_count: 0,
            scheme_id: this.generateId(),
        } as Channel;
    };

    fakeChannelWithId = (teamId: string) => {
        return {
            ...this.fakeChannel(teamId),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        } as Channel;
    };

    fakeDmChannel = (userId: string, otherUserId: string) => {
        return {
            name: userId > otherUserId ? otherUserId + '__' + userId : userId + '__' + otherUserId,
            team_id: '',
            display_name: `${otherUserId}`,
            type: 'D',
            status: 'offline',
            teammate_id: `${otherUserId}`,
            id: this.generateId(),
            delete_at: 0,
        } as Channel;
    }

    fakeChannelMember = (userId: string, channelId: string) => {
        return {
            user_id: userId,
            channel_id: channelId,
            notify_props: {},
            roles: 'system_user',
            msg_count: 0,
            mention_count: 0,
            scheme_user: false,
            scheme_admin: false,
        } as ChannelMembership;
    };

    fakeEmail = () => {
        return 'success' + this.generateId() + '@simulator.amazonses.com';
    };

    fakePost = (channelId: string) => {
        const time = Date.now();

        return {
            id: this.generateId(),
            channel_id: channelId,
            create_at: time,
            update_at: time,
            message: `Unit Test ${this.generateId()}`,
            type: '',
        } as Post;
    };

    fakePostWithId = (channelId: string) => {
        return {
            ...this.fakePost(channelId),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        } as Post;
    };

    fakeTeam = () => {
        const name = this.generateId();
        let inviteId = this.generateId();
        if (inviteId.length > 32) {
            inviteId = inviteId.substring(0, 32);
        }

        return {
            name,
            display_name: `Unit Test ${name}`,
            type: 'O',
            email: this.fakeEmail(),
            allowed_domains: '',
            invite_id: inviteId,
            scheme_id: this.generateId(),
        } as Team;
    };

    fakeTeamWithId = () => {
        return {
            ...this.fakeTeam(),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        } as Team;
    };

    fakeTeamMember = (userId: string, teamId: string) => {
        return {
            user_id: userId,
            team_id: teamId,
            roles: 'team_user',
            delete_at: 0,
            scheme_user: false,
            scheme_admin: false,
        } as TeamMembership;
    };

    fakeUser = () => {
        return {
            email: this.fakeEmail(),

            // allow_marketing: true,
            // password: PASSWORD,
            locale: CONSTANTS.DEFAULT_LOCALE,
            username: this.generateId(),
            first_name: this.generateId(),
            last_name: this.generateId(),
            create_at: Date.now(),
            delete_at: 0,
            roles: 'system_user',
        } as UserProfile;
    };

    fakeUserWithId = (id = this.generateId()) => {
        return {
            ...this.fakeUser(),
            id,
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        } as UserProfile;
    };

    fakeOutgoingHook = (teamId: string) => {
        return {
            team_id: teamId,
        } as OutgoingWebhook;
    };

    fakeOutgoingHookWithId = (teamId: string) => {
        return {
            ...this.fakeOutgoingHook(teamId),
            id: this.generateId(),
        } as OutgoingWebhook;
    };

    fakeFiles = (count: number) => {
        const files: FileInfo[] = [];
        while (files.length < count) {
            files.push({
                id: this.generateId(),
            } as FileInfo);
        }

        return files;
    };

    fakeOAuthApp = () => {
        return {
            name: this.generateId(),
            callback_urls: ['http://localhost/notrealurl'],
            homepage: 'http://localhost/notrealurl',
            description: 'fake app',
            is_trusted: false,
            icon_url: 'http://localhost/notrealurl',
            update_at: 1507841118796,
        } as OAuthApp;
    };

    fakeOAuthAppWithId = () => {
        return {
            ...this.fakeOAuthApp(),
            id: this.generateId(),
        } as OAuthApp;
    };

    fakeBot = () => {
        return {
            user_id: this.generateId(),
            username: this.generateId(),
            display_name: 'Fake bot',
            owner_id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        } as Bot;
    }

    mockLogin = () => {
        if (!this.basicClient4) {
            return;
        }

        nock(this.basicClient4.getBaseRoute()).
            post('/users/login').
            reply(200, this.basicUser || '', {'X-Version-Id': 'Server Version'});

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/teams/members').
            reply(200, [this.basicTeamMember]);

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/teams/unread').
            reply(200, [{team_id: this.basicTeam?.id, msg_count: 0, mention_count: 0}]);

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/teams').
            reply(200, [this.basicTeam]);

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/preferences').
            reply(200, [{user_id: this.basicUser?.id, category: 'tutorial_step', name: this.basicUser?.id, value: '999'}]);
    }

    initMockEntities = () => {
        this.basicUser = this.fakeUserWithId();
        this.basicUser.roles = 'system_user system_admin';
        this.basicTeam = this.fakeTeamWithId();
        this.basicTeamMember = this.fakeTeamMember(this.basicUser.id, this.basicTeam.id);
        this.basicChannel = this.fakeChannelWithId(this.basicTeam.id);
        this.basicChannelMember = this.fakeChannelMember(this.basicUser.id, this.basicChannel.id);
        this.basicPost = {...this.fakePostWithId(this.basicChannel.id), create_at: 1507841118796};
        this.basicRoles = {
            system_admin: {
                id: this.generateId(),
                name: 'system_admin',
                display_name: 'authentication.roles.global_admin.name',
                description: 'authentication.roles.global_admin.description',
                permissions: [
                    'system_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            } as Role,
            system_user: {
                id: this.generateId(),
                name: 'system_user',
                display_name: 'authentication.roles.global_user.name',
                description: 'authentication.roles.global_user.description',
                permissions: [
                    'system_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            } as Role,
            team_admin: {
                id: this.generateId(),
                name: 'team_admin',
                display_name: 'authentication.roles.team_admin.name',
                description: 'authentication.roles.team_admin.description',
                permissions: [
                    'team_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            } as Role,
            team_user: {
                id: this.generateId(),
                name: 'team_user',
                display_name: 'authentication.roles.team_user.name',
                description: 'authentication.roles.team_user.description',
                permissions: [
                    'team_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            } as Role,
            channel_admin: {
                id: this.generateId(),
                name: 'channel_admin',
                display_name: 'authentication.roles.channel_admin.name',
                description: 'authentication.roles.channel_admin.description',
                permissions: [
                    'channel_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            } as Role,
            channel_user: {
                id: this.generateId(),
                name: 'channel_user',
                display_name: 'authentication.roles.channel_user.name',
                description: 'authentication.roles.channel_user.description',
                permissions: [
                    'channel_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            } as Role,
        };
    }

    initBasic = async (client = this.createClient()) => {
        client.setUrl(Config.TestServerUrl || Config.DefaultServerUrl);
        this.basicClient = client;
        this.basicClient4 = client;

        this.initMockEntities();
        this.activateMocking();

        return {
            client: this.basicClient,
            client4: this.basicClient4,
            user: this.basicUser,
            team: this.basicTeam,
            channel: this.basicChannel,
            post: this.basicPost,
        };
    };

    testIncomingHook = () => {
        return {
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
            user_id: this.basicUser?.id,
            channel_id: this.basicChannel?.id,
            team_id: this.basicTeam?.id,
            display_name: 'test',
            description: 'test',
        } as IncomingWebhook;
    };

    testOutgoingHook = () => {
        return {
            id: this.generateId(),
            token: this.generateId(),
            create_at: 1507841118796,
            update_at: 1507841118796,
            delete_at: 0,
            creator_id: this.basicUser?.id,
            channel_id: this.basicChannel?.id,
            team_id: this.basicTeam?.id,
            trigger_words: ['testword'],
            trigger_when: 0,
            callback_urls: ['http://localhost/notarealendpoint'],
            display_name: 'test',
            description: '',
            content_type: 'application/x-www-form-urlencoded',
        } as OutgoingWebhook;
    }

    testCommand = (teamId: string) => {
        return {
            trigger: this.generateId(),
            method: 'P',
            create_at: 1507841118796,
            update_at: 1507841118796,
            delete_at: 0,
            creator_id: this.basicUser?.id,
            team_id: teamId,
            username: 'test',
            icon_url: 'http://localhost/notarealendpoint',
            auto_complete: true,
            auto_complete_desc: 'test',
            auto_complete_hint: 'test',
            display_name: 'test',
            description: 'test',
            url: 'http://localhost/notarealendpoint',
        };
    };

    tearDown = async () => {
        nock.restore();

        this.basicClient = null;
        this.basicClient4 = null;
        this.basicUser = null;
        this.basicTeam = null;
        this.basicTeamMember = null;
        this.basicChannel = null;
        this.basicChannelMember = null;
        this.basicPost = null;
    }

    wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
}

export default new TestHelper();
