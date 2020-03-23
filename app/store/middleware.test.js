// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-nested-callbacks */

import assert from 'assert';

import {ViewTypes} from 'app/constants';
import {
    cleanUpPostsInChannel,
    cleanUpState,
    getAllFromPostsInChannel,
    middlewares,
} from 'app/store/middleware';

describe('messageRetention', () => {
    const messageRetention = middlewares[0];

    describe('should chain the same incoming action type', () => {
        const actions = [
            {
                type: 'persist/REHYDRATE',
                payload: {
                    views: {
                        team: {
                        },
                    },
                },
            },
            {
                type: ViewTypes.DATA_CLEANUP,
                payload: {
                    entities: {
                        channels: {
                        },
                        posts: {
                        },
                    },
                    views: {
                        team: {
                        },
                    },
                },
            },
            {
                type: 'other',
            },
        ];

        actions.forEach((action) => {
            it(`for action type ${action.type}`, () => {
                const store = {};
                const next = (a) => a;

                const nextAction = messageRetention(store)(next)(action);
                assert.equal(action.type, nextAction.type);
            });
        });
    });
});

describe('cleanUpState', () => {
    test('should remove post because of data retention', () => {
        const state = {
            entities: {
                channels: {
                    currentChannelId: 'channel1',
                },
                files: {
                    fileIdsByPostId: {},
                },
                general: {
                    dataRetentionPolicy: {
                        message_deletion_enabled: true,
                        message_retention_cutoff: 1000,
                    },
                },
                posts: {
                    posts: {
                        post1: {id: 'post1', channel_id: 'channel1', create_at: 1000},
                        post2: {id: 'post2', channel_id: 'channel1', create_at: 999},
                    },
                    postsInChannel: {
                        channel1: [
                            {order: ['post1', 'post2'], recent: true},
                        ],
                    },
                    postsInThread: {},
                    reactions: {},
                },
                search: {
                    results: ['post1', 'post2'],
                    flagged: ['post1', 'post2', 'post3'],
                },
            },
            views: {
                team: {
                    lastChannelForTeam: {
                        team1: ['channel1'],
                    },
                },
            },
        };

        const result = cleanUpState({payload: state});

        expect(result.payload.entities.posts.posts.post1).toBeDefined();
        expect(result.payload.entities.posts.posts.post2).toBeUndefined();
        expect(result.payload.entities.posts.postsInChannel.channel1).toEqual([{order: ['post1'], recent: true}]);
        expect(result.payload.entities.search.results).toEqual(['post1', 'post2']);
        expect(result.payload.entities.search.flagged).toEqual(['post1', 'post2', 'post3']);
    });

    test('should keep failed pending post', () => {
        const state = {
            entities: {
                channels: {
                    currentChannelId: 'channel1',
                },
                files: {
                    fileIdsByPostId: {},
                },
                posts: {
                    pendingPostIds: ['pending'],
                    posts: {
                        pending: {id: 'pending', pending_post_id: 'pending', channel_id: 'channel1', failed: true},
                        post1: {id: 'post1', channel_id: 'channel1'},
                        post2: {id: 'post2', channel_id: 'channel1'},
                    },
                    postsInChannel: {
                        channel1: [
                            {order: ['pending', 'post1', 'post2'], recent: true},
                        ],
                    },
                    postsInThread: {},
                    reactions: {},
                },
            },
            views: {
                team: {
                    lastChannelForTeam: {
                        team1: ['channel1'],
                    },
                },
            },
        };

        const result = cleanUpState({payload: state});

        expect(result.payload.entities.posts.pendingPostIds).toEqual(['pending']);
        expect(result.payload.entities.posts.posts.pending).toBeDefined();
        expect(result.payload.entities.posts.postsInChannel.channel1).toEqual([{order: ['pending', 'post1', 'post2'], recent: true}]);
    });

    test('should remove non-failed pending post', () => {
        const state = {
            entities: {
                channels: {
                    currentChannelId: 'channel1',
                },
                files: {
                    fileIdsByPostId: {},
                },
                posts: {
                    pendingPostIds: ['pending'],
                    posts: {
                        pending: {id: 'pending', pending_post_id: 'pending', channel_id: 'channel1'},
                        post1: {id: 'post1', channel_id: 'channel1'},
                        post2: {id: 'post2', channel_id: 'channel1'},
                    },
                    postsInChannel: {
                        channel1: [
                            {order: ['pending', 'post1', 'post2'], recent: true},
                        ],
                    },
                    postsInThread: {},
                    reactions: {},
                },
            },
            views: {
                team: {
                    lastChannelForTeam: {
                        team1: ['channel1'],
                    },
                },
            },
        };

        const result = cleanUpState({payload: state});

        expect(result.payload.entities.posts.pendingPostIds).toEqual([]);
        expect(result.payload.entities.posts.posts.pending).toBeUndefined();
        expect(result.payload.entities.posts.postsInChannel.channel1).toEqual([{order: ['post1', 'post2'], recent: true}]);
    });

    test('should remove non-existent pending post', () => {
        const state = {
            entities: {
                channels: {
                    currentChannelId: 'channel1',
                },
                files: {
                    fileIdsByPostId: {},
                },
                posts: {
                    pendingPostIds: ['pending'],
                    posts: {
                        post1: {id: 'post1', channel_id: 'channel1'},
                        post2: {id: 'post2', channel_id: 'channel1'},
                    },
                    postsInChannel: {
                        channel1: [
                            {order: ['post1', 'post2'], recent: true},
                        ],
                    },
                    postsInThread: {},
                    reactions: {},
                },
            },
            views: {
                team: {
                    lastChannelForTeam: {
                        team1: ['channel1'],
                    },
                },
            },
        };

        const result = cleanUpState({payload: state});

        expect(result.payload.entities.posts.pendingPostIds).toEqual([]);
        expect(result.payload.entities.posts.postsInChannel.channel1).toEqual([{order: ['post1', 'post2'], recent: true}]);
    });
});

describe('cleanUpPostsInChannel', () => {
    test('should only keep posts for recently viewed channels', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b'], recent: true},
            ],
            channel2: [
                {order: ['c', 'd'], recent: true},
            ],
        };
        const lastChannelForTeam = {
            team1: ['channel1'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam);

        expect(nextPostsInChannel).toEqual({
            channel1: [
                {order: ['a', 'b'], recent: true},
            ],
        });
    });

    test('should keep posts for recently viewed channels across multiple teams', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b'], recent: true},
            ],
            channel2: [
                {order: ['c', 'd'], recent: true},
            ],
        };
        const lastChannelForTeam = {
            team1: ['channel1'],
            team2: ['channel2'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam);

        expect(nextPostsInChannel).toEqual({
            channel1: [
                {order: ['a', 'b'], recent: true},
            ],
            channel2: [
                {order: ['c', 'd'], recent: true},
            ],
        });
    });

    test('should only keep the last X posts in each channel', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
            channel2: [
                {order: ['e', 'f', 'g', 'h'], recent: true},
            ],
        };
        const lastChannelForTeam = {
            team1: ['channel1', 'channel2'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam, '', 2);

        expect(nextPostsInChannel).toEqual({
            channel1: [
                {order: ['a', 'b'], recent: true},
            ],
            channel2: [
                {order: ['e', 'f'], recent: true},
            ],
        });
    });

    test('should only keep the most recent posts in a channel', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
                {order: ['e', 'f', 'g', 'h']},
            ],
        };
        const lastChannelForTeam = {
            team1: ['channel1'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam, '');

        expect(nextPostsInChannel).toEqual({
            channel1: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
        });
    });

    test('should keep all posts in the current channel, if specified', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
            channel2: [
                {order: ['e', 'f', 'g', 'h'], recent: true},
            ],
        };
        const lastChannelForTeam = {
            team1: ['channel1', 'channel2'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam, 'channel2', 2);

        expect(nextPostsInChannel).toEqual({
            channel1: [
                {order: ['a', 'b'], recent: true},
            ],
            channel2: [
                {order: ['e', 'f', 'g', 'h'], recent: true},
            ],
        });
    });

    test('should not error when a DM/GM channel appears on multiple teams', () => {
        const postsInChannel = {
            dmChannel: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
        };
        const lastChannelForTeam = {
            team1: ['dmChannel'],
            team2: ['dmChannel'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam);

        expect(nextPostsInChannel).toEqual({
            dmChannel: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
        });
    });

    test('should not error when a recent channel is missing', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
        };
        const lastChannelForTeam = {
            team1: ['channel1', 'channel2'],
        };

        const nextPostsInChannel = cleanUpPostsInChannel(postsInChannel, lastChannelForTeam);

        expect(nextPostsInChannel).toEqual({
            channel1: [
                {order: ['a', 'b', 'c', 'd'], recent: true},
            ],
        });
    });
});

describe('getAllFromPostsInChannel', () => {
    test('should return every post ID', () => {
        const postsInChannel = {
            channel1: [
                {order: ['a', 'b']},
                {order: ['c', 'd']},
            ],
            channel2: [
                {order: ['e', 'f']},
            ],
            channel3: [
                {order: ['g', 'h']},
            ],
        };

        const postIds = getAllFromPostsInChannel(postsInChannel);

        expect(postIds).toMatchObject(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    });
});
