// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import Config from 'assets/config.json';

import Client from 'mattermost-redux/client/client';

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
    };

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
    };

    createClient = () => {
        const client = new Client();

        client.setUrl(Config.DefaultServerUrl);

        return client;
    };

    fakeEmail = () => {
        return 'success' + this.generateId() + '@simulator.amazonses.com';
    };

    fakeUser = () => {
        return {
            email: this.fakeEmail(),
            allow_marketing: true,
            password: PASSWORD,
            username: this.generateId(),
        };
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
        };
    };

    fakeChannel = (teamId) => {
        const name = this.generateId();

        return {
            name,
            team_id: teamId,
            display_name: `Unit Test ${name}`,
            type: 'O',
        };
    };

    fakeChannelMember = (userId, channelId) => {
        return {
            user_id: userId,
            channel_id: channelId,
            notify_props: {},
            roles: 'system_user',
        };
    };

    fakePost = (channelId) => {
        return {
            channel_id: channelId,
            message: `Unit Test ${this.generateId()}`,
        };
    };

    initBasic = async (client = this.createClient()) => {
        client.setUrl(Config.TestServerUrl || Config.DefaultServerUrl);
        this.basicClient = client;

        this.basicUser = await client.createUser(this.fakeUser());
        await client.login(this.basicUser.email, PASSWORD);

        this.basicTeam = await client.createTeam(this.fakeTeam());

        this.basicChannel = await client.createChannel(this.fakeChannel(this.basicTeam.id));
        this.basicPost = await client.createPost(this.basicTeam.id, this.fakePost(this.basicChannel.id));

        return {
            client: this.basicClient,
            user: this.basicUser,
            team: this.basicTeam,
            channel: this.basicChannel,
            post: this.basicPost,
        };
    };

    wait = () => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), 1000);
        });
    }
}

export default new TestHelper();
