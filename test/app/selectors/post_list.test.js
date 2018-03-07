// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import {
    DATE_LINE,
    makePreparePostIdsForPostList,
    START_OF_NEW_MESSAGES,
} from 'app/selectors/post_list';

import {Posts, Preferences} from 'mattermost-redux/constants';
import {getPreferenceKey} from 'mattermost-redux/utils/preference_utils';

describe('Selectors.PostList', () => {
    describe('makePreparePostIdsForPostList', () => {
        it('filter join/leave posts', () => {
            const preparePostIdsForPostList = makePreparePostIdsForPostList();

            let state = {
                entities: {
                    posts: {
                        posts: {
                            1001: {id: '1001', create_at: 0},
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
            assert.deepEqual(removeDateLines(now), ['1002', '1001']);

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
            assert.deepEqual(removeDateLines(now), ['1002', '1001']);

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
            assert.deepEqual(removeDateLines(now), ['1001']);

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

            assert.deepEqual(removeDateLines(now), ['1002', '1001']);
        });

        it('new messages indicator', () => {
            const preparePostIdsForPostList = makePreparePostIdsForPostList();

            const state = {
                entities: {
                    posts: {
                        posts: {
                            1000: {id: '1000', create_at: 1000},
                            1005: {id: '1005', create_at: 1005},
                            1010: {id: '1010', create_at: 1010},
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

            // Show new messages indicator before all posts
            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 0, indicateNewMessages: true});
            assert.deepEqual(removeDateLines(now), ['1010', '1005', '1000', START_OF_NEW_MESSAGES]);

            // Show indicator between posts
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 1003, indicateNewMessages: true});
            assert.deepEqual(removeDateLines(now), ['1010', '1005', START_OF_NEW_MESSAGES, '1000']);

            // Don't show indicator when all posts are read
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt: 1020});
            assert.deepEqual(removeDateLines(now), ['1010', '1005', '1000']);
        });

        it('memoization', () => {
            const preparePostIdsForPostList = makePreparePostIdsForPostList();

            // Posts 7 hours apart so they should appear on multiple days
            const initialPosts = {
                1001: {id: '1001', create_at: 1 * 60 * 60 * 1000},
                1002: {id: '1002', create_at: (1 * 60 * 60 * 1000) + 5},
                1003: {id: '1003', create_at: (1 * 60 * 60 * 1000) + 10},
                1004: {id: '1004', create_at: 25 * 60 * 60 * 1000},
                1005: {id: '1005', create_at: (25 * 60 * 60 * 1000) + 5},
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

            let postIds = ['1006', '1004', '1003', '1001'];
            let lastViewedAt = initialPosts['1001'].create_at + 1;

            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.deepEqual(removeDateLines(now), ['1006', '1004', '1003', START_OF_NEW_MESSAGES, '1001']);

            // No changes
            let prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(removeDateLines(now), ['1006', '1004', '1003', START_OF_NEW_MESSAGES, '1001']);

            // lastViewedAt changed slightly
            lastViewedAt = initialPosts['1001'].create_at + 2;

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(removeDateLines(now), ['1006', '1004', '1003', START_OF_NEW_MESSAGES, '1001']);

            // lastViewedAt changed a lot
            lastViewedAt += initialPosts['1003'].create_at + 1;

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.notEqual(now, prev);
            assert.deepEqual(removeDateLines(now), ['1006', '1004', START_OF_NEW_MESSAGES, '1003', '1001']);

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(removeDateLines(now), ['1006', '1004', START_OF_NEW_MESSAGES, '1003', '1001']);

            // postIds changed, but still shallowly equal
            postIds = [...postIds];

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(removeDateLines(now), ['1006', '1004', START_OF_NEW_MESSAGES, '1003', '1001']);

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
            assert.deepEqual(removeDateLines(now), ['1006', '1004', START_OF_NEW_MESSAGES, '1003', '1001']);

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
            assert.deepEqual(removeDateLines(now), ['1006', '1004', START_OF_NEW_MESSAGES, '1003', '1001']);

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
            assert.deepEqual(removeDateLines(now), ['1004', START_OF_NEW_MESSAGES, '1003', '1001']);

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt, indicateNewMessages: true});
            assert.equal(now, prev);
            assert.deepEqual(removeDateLines(now), ['1004', START_OF_NEW_MESSAGES, '1003', '1001']);
        });
    });
});

// Remove date lines when checking equality since those depend on time-zone of the computer running the tests
function removeDateLines(list) {
    return list.filter((item) => !item.startsWith(DATE_LINE));
}
