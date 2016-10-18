// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import fetchMock from 'fetch_mock';
import Client from 'client/client.js';
import Config from 'config/config.js';

const fakeUserId = '146677bbcefgjjmmnpqqrruxyz';
const fakeTeamId = '1378899bbcddefghknnpqsttyz';
const fakeChannelId = '1335568899aaccefkkmmpprtwz';
const fakePostId = '346aabceeffhhikopruuwxyyyy';
const fakeTimestamp = Date.now();

const fakeTeamRespBody = {
    id: fakeTeamId,
    create_at: fakeTimestamp,
    update_at: fakeTimestamp,
    delete_at: 0,
    display_name: `est-eam-${fakeTimestamp}`,
    name: `est-eam-${fakeTimestamp}`,
    email: '',
    type: 'O',
    company_name: '',
    allowed_domains: '',
    invite_id: '',
    allow_open_invite: false
};
const fakeChannelRespBody = {
    id: fakeChannelId,
    create_at: fakeTimestamp,
    update_at: fakeTimestamp,
    delete_at: 0,
    team_id: fakeTeamId,
    type: 'O',
    display_name: 'bestchannel',
    name: 'bestchannel',
    header: '',
    purpose: '',
    last_post_at: 0,
    total_msg_count: 0,
    extra_update_at: fakeTimestamp,
    creator_id: fakeUserId
};
const fakePostRespBody = {
    id: fakePostId,
    create_at: fakeTimestamp,
    update_at: fakeTimestamp,
    delete_at: 0,
    user_id: fakeUserId,
    channel_id: fakeChannelId,
    root_id: '',
    parent_id: '',
    original_id: '',
    message: 'TEST POST',
    type: '',
    props: {},
    hashtags: '',
    pending_post_id: ''
};
const fakeUserRespBody = {
    id: fakeUserId,
    create_at: fakeTimestamp,
    update_at: fakeTimestamp,
    delete_at: 0,
    username: 'testuser',
    auth_data: '',
    auth_service: '',
    email: 'testuser',
    nickname: '',
    first_name: '',
    last_name: '',
    roles: 'system_user',
    allow_marketing: true,
    notify_props: {
        channel: 'true',
        desktop: 'all',
        desktop_sound: 'true',
        email: 'true',
        first_name: 'false',
        mention_keys: 'testuser,@testuser',
        push: 'mention'
    },
    last_password_update: fakeTimestamp,
    locale: 'en'
};
const fakeClientConfig = {
    Version: '3.4.0',
    BuildNumber: 'dev',
    BuildDate: 'Wed Dec 14 23:59:59 UTC 2016',
    BuildHash: '01111123555566677788888888abbbbcccccdeff'
};
const fakeInitLoadRespBody = {
    user: fakeUserRespBody,
    team_members: [{
        team_id: fakeTeamId,
        user_id: fakeUserId,
        roles: 'team_user team_admin',
        delete_at: 0
    }],
    teams: [fakeTeamRespBody],
    direct_profiles: {},
    preferences: [{
        user_id: fakeUserId,
        category: 'last',
        name: 'channel',
        value: fakeChannelId
    }, {
        user_id: fakeUserId,
        category: 'tutorial_step',
        name: fakeUserId,
        value: '1'
    }],
    client_cfg: fakeClientConfig,
    license_cfg: {
        IsLicensed: 'false'
    },
    no_accounts: false
};

fetchMock.post(/\/users\/create$/, (url, opts) => ({
    headers: {'Content-Type': 'application/json'},
    body: {...fakeUserRespBody, ...JSON.parse(opts.body)}
}));
fetchMock.post(/\/users\/login$/, (url, opts) => {
    const reqBody = JSON.parse(opts.body);
    return {
        headers: {
            'Content-Type': 'application/json',
            token: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        },
        body: {...fakeUserRespBody,
            email: reqBody.login_id
        }
    };
});
fetchMock.post(/\/teams\/create/, (url, opts) => ({
    headers: {'Content-Type': 'application/json'},
    body: {...fakeTeamRespBody, ...JSON.parse(opts.body)}
}));
fetchMock.post(/\/channels\/create/, (url, opts) => ({
    headers: {'Content-Type': 'application/json'},
    body: {...fakeChannelRespBody, ...JSON.parse(opts.body)}
}));
fetchMock.post(/\/posts\/create$/, {
    headers: {'Content-Type': 'application/json'},
    body: fakePostRespBody
});
fetchMock.get(/\/users\/initial_load$/, {
    headers: {'Content-Type': 'application/json'},
    body: fakeInitLoadRespBody
});
fetchMock.get(/\/general\/client_props$/, {
    headers: {'Content-Type': 'application/json'},
    body: fakeClientConfig
});

const PASSWORD = 'password1';

class TestHelper {
    constructor() {
        this.basicClient = null;

        this.basicUser = null;
        this.basicTeam = null;
        this.basicChannel = null;
        this.basicPost = null;
    }

    assertStatusOkay = (data) => {
        assert(data);
        assert(data.status === 'OK');
    }

    generateId = () => {
        // Implementation taken from http://stackoverflow.com/a/2117523
        let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

        id = id.replace(/[xy]/g, (c) => {
            const r = Math.floor(Math.random() * 16);

            let v;
            if (c === 'x') {
                v = r;
            } else {
                v = (r & 0x3) | 0x8;
            }

            return v.toString(16);
        });

        return 'uid' + id;
    }

    createClient = () => {
        const client = new Client();

        client.setUrl(Config.DefaultServerUrl);

        return client;
    }

    fakeEmail = () => {
        return 'success' + this.generateId() + '@simulator.amazonses.com';
    }

    fakeUser = () => {
        return {
            email: this.fakeEmail(),
            allow_marketing: true,
            password: PASSWORD,
            username: this.generateId()
        };
    }

    fakeTeam = () => {
        const name = this.generateId();

        return {
            name,
            display_name: `Unit Test ${name}`,
            type: 'O',
            email: this.fakeEmail(),
            allowed_domains: ''
        };
    }

    fakeChannel = (teamId) => {
        const name = this.generateId();

        return {
            name,
            team_id: teamId,
            display_name: `Unit Test ${name}`,
            type: 'O'
        };
    }

    fakePost = (channelId) => {
        return {
            channel_id: channelId,
            message: `Unit Test ${this.generateId()}`
        };
    }

    initBasic = async (client = this.createClient()) => {
        client.setUrl(Config.DefaultServerUrl);
        this.basicClient = client;

        this.basicUser = await client.createUser(this.fakeUser());
        await client.login(this.basicUser.email, PASSWORD);

        this.basicTeam = await client.createTeam(this.fakeTeam());
        client.setTeamId(this.basicTeam.id);

        this.basicChannel = await client.createChannel(this.fakeChannel(this.basicTeam.id));
        this.basicPost = await client.createPost(this.fakePost(this.basicChannel.id));

        return {
            client: this.basicClient,
            user: this.basicUser,
            team: this.basicTeam,
            channel: this.basicChannel,
            post: this.basicPost
        };
    }
}

export default new TestHelper();
