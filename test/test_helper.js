// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import Client from 'client/client.js';

const PASSWORD = 'password1';

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

    initBasic = (callback) => {
        const client = this.createClient();

        client.createUser(
            this.fakeUser(),
            null,
            (user) => {
                this.basicUser = user;

                client.login(
                    user.email,
                    PASSWORD,
                    '',
                    null,
                    () => {
                        client.createTeam(
                            this.fakeTeam(),
                            null,
                            (team) => {
                                this.basicTeam = team;

                                client.setTeamId(team.id);

                                client.createChannel(
                                    this.fakeChannel(this.basicTeam.id),
                                    null,
                                    (channel) => {
                                        this.basicChannel = channel;

                                        client.createPost(
                                            this.fakePost(this.basicChannel.id),
                                            null,
                                            (post) => {
                                                this.basicPost = post;

                                                callback({
                                                    client,
                                                    user: this.basicUser,
                                                    team: this.basicTeam,
                                                    channel: this.basicChannel,
                                                    post: this.basicPost
                                                });
                                            },
                                            (err) => {
                                                console.error(err);
                                                throw err;
                                            }
                                        );
                                    },
                                    (err) => {
                                        console.error(err);
                                        throw err;
                                    }
                                );
                            },
                            (err) => {
                                console.error(err);
                                throw err;
                            }
                        );
                    },
                    (err) => {
                        console.error(err);
                        throw err;
                    }
                );
            },
            (err) => {
                throw err;
            }
        );
    }
}

export default new TestHelper();