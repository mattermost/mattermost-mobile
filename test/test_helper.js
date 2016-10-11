// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import Client from 'client/client.js';

class TestHelper {
    constructor() {
        this.basicClient = null;
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

        client.setUrl('http://localhost:8065');

        return client;
    }

    fakeEmail = () => {
        return 'success' + this.generateId() + '@simulator.amazonses.com';
    }

    fakeUser = () => {
        return {
            email: this.fakeEmail(),
            allow_marketing: true,
            password: 'password1',
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

    fakeChannel = () => {
        const name = this.generateId();

        return {
            name,
            display_name: `Unit Test ${name}`,
            type: 'O'
        };
    }

    fakePost = () => {
        return {
            message: `Unit Test ${this.generateId()}`
        };
    }

    initBasic = (callback) => {
        const client = this.createClient();

        callback({client});
    }
}

export default new TestHelper();