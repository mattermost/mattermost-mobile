// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {
    makePreparePostIdsForPostList,
    makePreparePostIdsForSearchPosts,
    START_OF_NEW_MESSAGES,
} from 'app/selectors/post_list';

import {Posts, Preferences} from 'mattermost-redux/constants';
import {getPreferenceKey} from 'mattermost-redux/utils/preference_utils';

/* eslint-disable max-nested-callbacks */

describe('Selectors.PostList', () => {
    describe('makePreparePostIdsForPostList', () => {
        it('filter join/leave posts', () => {
            const preparePostIdsForPostList = makePreparePostIdsForPostList();

            let state = {
                entities: {
                    posts: {
                        posts: {
                            1001: {id: '1001', create_at: 0, type: ''},
                            1002: {id: '1002', create_at: 1, type: Posts.POST_TYPES.JOIN_CHANNEL},
                        },
                    },
                    preferences: {
                        myPreferences: {},
                    },
                    users: {
                        currentUserId: '1234',
                        profiles: {
                            1234: {id: '1234', username: 'user'},
                        },
                    },
                },
            };
            const lastViewedAt = Number.POSITIVE_INFINITY;
            const postIds = ['1002', '1001'];
            const indicateNewMessages = true;

            // Defaults to show post
            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages});
            assert.deepEqual(now, [
                '1002',
                '1001',
                'date-0',
            ]);

            // Show join/leave posts
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    preferences: {
                        ...state.entities.preferences,
                        myPreferences: {
                            ...state.entities.preferences.myPreferences,
                            [getPreferenceKey(Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE)]: {
                                category: Preferences.CATEGORY_ADVANCED_SETTINGS,
                                name: Preferences.ADVANCED_FILTER_JOIN_LEAVE,
                                value: 'true',
                            },
                        },
                    },
                },
            };

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages});
            assert.deepEqual(now, [
                '1002',
                '1001',
                'date-0',
            ]);

            // Hide join/leave posts
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    preferences: {
                        ...state.entities.preferences,
                        myPreferences: {
                            ...state.entities.preferences.myPreferences,
                            [getPreferenceKey(Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE)]: {
                                category: Preferences.CATEGORY_ADVANCED_SETTINGS,
                                name: Preferences.ADVANCED_FILTER_JOIN_LEAVE,
                                value: 'false',
                            },
                        },
                    },
                },
            };

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages});
            assert.deepEqual(now, [
                '1001',
                'date-0',
            ]);

            // always show join/leave posts for the current user
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    posts: {
                        ...state.entities.posts,
                        posts: {
                            ...state.entities.posts.posts,
                            1002: {id: '1002', create_at: 1, type: Posts.POST_TYPES.JOIN_CHANNEL, props: {username: 'user'}},
                        },
                    },
                },
            };

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages});

            assert.deepEqual(now, [
                '1002',
                '1001',
                'date-0',
            ]);
        });

        it('new messages indicator', () => {
            const preparePostIdsForPostList = makePreparePostIdsForPostList();

            const state = {
                entities: {
                    posts: {
                        posts: {
                            1000: {id: '1000', create_at: 1000, type: ''},
                            1005: {id: '1005', create_at: 1005, type: ''},
                            1010: {id: '1010', create_at: 1010, type: ''},
                        },
                    },
                    preferences: {
                        myPreferences: {},
                    },
                    users: {
                        currentUserId: '1234',
                        profiles: {
                            1234: {id: '1234', username: 'user'},
                        },
                    },
                },
            };

            const postIds = ['1010', '1005', '1000']; // Remember that we list the posts backwards

            // Do not show new messages indicator before all posts
            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 0, indicateNewMessages: true});
            assert.deepEqual(now, [
                '1010',
                '1005',
                '1000',
                'date-1000',
            ]);

            now = preparePostIdsForPostList(state, {postIds, indicateNewMessages: true});
            assert.deepEqual(now, [
                '1010',
                '1005',
                '1000',
                'date-1000',
            ]);

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 999, indicateNewMessages: false});
            assert.deepEqual(now, [
                '1010',
                '1005',
                '1000',
                'date-1000',
            ]);

            // Show new messages indicator before all posts
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 999, indicateNewMessages: true});
            assert.deepEqual(now, [
                '1010',
                '1005',
                '1000',
                START_OF_NEW_MESSAGES,
                'date-1000',
            ]);

            // Show indicator between posts
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 1003, indicateNewMessages: true});
            assert.deepEqual(now, [
                '1010',
                '1005',
                START_OF_NEW_MESSAGES,
                '1000',
                'date-1000',
            ]);

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 1006, indicateNewMessages: true});
            assert.deepEqual(now, [
                '1010',
                START_OF_NEW_MESSAGES,
                '1005',
                '1000',
                'date-1000',
            ]);

            // Don't show indicator when all posts are read
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 1020});
            assert.deepEqual(now, [
                '1010',
                '1005',
                '1000',
                'date-1000',
            ]);
        });

        it('memoization', () => {
            const preparePostIdsForPostList = makePreparePostIdsForPostList();

            // Posts 7 hours apart so they should appear on multiple days
            const initialPosts = {
                1001: {id: '1001', create_at: 1 * 60 * 60 * 1000, type: ''},
                1002: {id: '1002', create_at: (1 * 60 * 60 * 1000) + 5, type: ''},
                1003: {id: '1003', create_at: (1 * 60 * 60 * 1000) + 10, type: ''},
                1004: {id: '1004', create_at: 25 * 60 * 60 * 1000, type: ''},
                1005: {id: '1005', create_at: (25 * 60 * 60 * 1000) + 5, type: ''},
                1006: {id: '1006', create_at: (25 * 60 * 60 * 1000) + 10, type: Posts.POST_TYPES.JOIN_CHANNEL},
            };
            let state = {
                entities: {
                    posts: {
                        posts: initialPosts,
                    },
                    preferences: {
                        myPreferences: {
                            [getPreferenceKey(Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE)]: {
                                category: Preferences.CATEGORY_ADVANCED_SETTINGS,
                                name: Preferences.ADVANCED_FILTER_JOIN_LEAVE,
                                value: 'true',
                            },
                        },
                    },
                    users: {
                        currentUserId: '1234',
                        profiles: {
                            1234: {id: '1234', username: 'user'},
                        },
                    },
                },
            };

            let postIds = [
                '1006',
                '1004',
                '1003',
                '1001',
            ];
            let lastViewedAt = initialPosts['1001'].create_at + 1;

            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.deepEqual(now, [
                '1006',
                '1004',
                'date-90000000',
                '1003',
                START_OF_NEW_MESSAGES,
                '1001',
                'date-3600000',
            ]);

            // No changes
            let prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                'date-90000000',
                '1003',
                START_OF_NEW_MESSAGES,
                '1001',
                'date-3600000',
            ]);

            // lastViewedAt changed slightly
            lastViewedAt = initialPosts['1001'].create_at + 2;

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                'date-90000000',
                '1003',
                START_OF_NEW_MESSAGES,
                '1001',
                'date-3600000',
            ]);

            // lastViewedAt changed a lot
            lastViewedAt += initialPosts['1003'].create_at + 1;

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.notEqual(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);

            // postIds changed, but still shallowly equal
            postIds = [...postIds];

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);

            // Post changed, not in postIds
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    posts: {
                        ...state.entities.posts,
                        posts: {
                            ...state.entities.posts.posts,
                            1007: {id: '1007', create_at: 7 * 60 * 60 * 7 * 1000},
                        },
                    },
                },
            };

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);

            // Post changed, in postIds
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    posts: {
                        ...state.entities.posts,
                        posts: {
                            ...state.entities.posts.posts,
                            1006: {...state.entities.posts.posts['1006'], message: 'abcd'},
                        },
                    },
                },
            };

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1006',
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);

            // Filter changed
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    preferences: {
                        ...state.entities.preferences,
                        myPreferences: {
                            ...state.entities.preferences.myPreferences,
                            [getPreferenceKey(Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE)]: {
                                category: Preferences.CATEGORY_ADVANCED_SETTINGS,
                                name: Preferences.ADVANCED_FILTER_JOIN_LEAVE,
                                value: 'false',
                            },
                        },
                    },
                },
            };

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.notEqual(now, prev);
            assert.deepEqual(now, [
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(now, [
                '1004',
                START_OF_NEW_MESSAGES,
                'date-90000000',
                '1003',
                '1001',
                'date-3600000',
            ]);
        });
    });

    describe('makePreparePostIdsForSearchPosts', () => {
        it('should return an empty array if there are no posts specified', () => {
            const preparePostIdsForSearchPosts = makePreparePostIdsForSearchPosts();

            const state = {
                entities: {
                    posts: {
                        posts: {
                            1001: {id: '1001', create_at: 0, type: ''},
                            1002: {id: '1002', create_at: 1, type: ''},
                        },
                    },
                    users: {
                        currentUserId: '1234',
                        profiles: {
                            1234: {id: '1234', username: 'user'},
                        },
                    },
                },
            };

            const postIds = [];
            const actual = preparePostIdsForSearchPosts(state, postIds);
            assert.deepEqual(actual, []);
        });

        it('should return an empty array if there are no matching posts', () => {
            const preparePostIdsForSearchPosts = makePreparePostIdsForSearchPosts();

            const state = {
                entities: {
                    posts: {
                        posts: {},
                    },
                    users: {
                        currentUserId: '1234',
                        profiles: {
                            1234: {id: '1234', username: 'user'},
                        },
                    },
                },
            };

            const postIds = ['1002', '1001'];
            const actual = preparePostIdsForSearchPosts(state, postIds);
            assert.deepEqual(actual, []);
        });

        it('should return results when there are posts', () => {
            const preparePostIdsForSearchPosts = makePreparePostIdsForSearchPosts();

            const state = {
                entities: {
                    posts: {
                        posts: {
                            1001: {id: '1001', create_at: 0, type: ''},
                            1002: {id: '1002', create_at: 1000, type: ''},

                            // Same timestamp as 1002
                            1003: {id: '1003', create_at: 1000, type: ''},
                        },
                    },
                    users: {
                        currentUserId: '1234',
                        profiles: {
                            1234: {id: '1234', username: 'user'},
                        },
                    },
                },
            };

            const postIds = ['1003', '1002', '1001'];
            const actual = preparePostIdsForSearchPosts(state, postIds);
            assert.deepEqual(actual, [
                'date-1000-index-0',
                '1003',
                'date-1000-index-1',
                '1002',
                'date-0-index-2',
                '1001',
            ]);
        });
    });
});
