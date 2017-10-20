// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import {
    DATE_LINE,
    makePreparePostIdsForPostList,
    START_OF_NEW_MESSAGES
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
                            1002: {id: '1002', create_at: 1, type: Posts.POST_TYPES.JOIN_CHANNEL}
                        }
                    },
                    preferences: {
                        myPreferences: {}
                    },
                    users: {
                        currentUserId: '1234'
                    }
                }
            };
            const lastViewedAt = Number.POSITIVE_INFINITY;
            const postIds = ['1001', '1002'];

            // Defaults to show post
            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') !== -1);

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
                                value: 'true'
                            }
                        }
                    }
                }
            };

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') !== -1);

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
                                value: 'false'
                            }
                        }
                    }
                }
            };

            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
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
                1006: {id: '1006', create_at: (25 * 60 * 60 * 1000) + 10, type: Posts.POST_TYPES.JOIN_CHANNEL}
            };
            let state = {
                entities: {
                    posts: {
                        posts: initialPosts
                    },
                    preferences: {
                        myPreferences: {
                            [getPreferenceKey(Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE)]: {
                                category: Preferences.CATEGORY_ADVANCED_SETTINGS,
                                name: Preferences.ADVANCED_FILTER_JOIN_LEAVE,
                                value: 'true'
                            }
                        }
                    },
                    users: {
                        currentUserId: '1234'
                    }
                }
            };

            let postIds = ['1001', '1003', '1004', '1006'];
            let lastViewedAt = initialPosts['1001'].create_at + 1;

            let now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            // No changes
            let prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            // lastViewedAt changed slightly
            lastViewedAt = initialPosts['1001'].create_at + 2;

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            // lastViewedAt changed a lot
            lastViewedAt += initialPosts['1003'].create_at + 1;

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.notEqual(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);

            // postIds changed, but still shallowly equal
            postIds = [...postIds];

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            // Post changed, not in postIds
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    posts: {
                        ...state.entities.posts,
                        posts: {
                            ...state.entities.posts.posts,
                            1007: {id: '1007', create_at: 7 * 60 * 60 * 7 * 1000}
                        }
                    }
                }
            };

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            // Post changed, in postIds
            state = {
                ...state,
                entities: {
                    ...state.entities,
                    posts: {
                        ...state.entities.posts,
                        posts: {
                            ...state.entities.posts.posts,
                            1006: {...state.entities.posts.posts['1006'], message: 'abcd'}
                        }
                    }
                }
            };

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') !== -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

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
                                value: 'false'
                            }
                        }
                    }
                }
            };

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.notEqual(now, prev);
            assert.ok(now.indexOf('1001') !== -1);
            assert.ok(now.indexOf('1002') === -1);
            assert.ok(now.indexOf('1003') !== -1);
            assert.ok(now.indexOf('1004') !== -1);
            assert.ok(now.indexOf('1005') === -1);
            assert.ok(now.indexOf('1006') === -1);
            assert.ok(now.findIndex((id) => id.startsWith(DATE_LINE)) !== -1);
            assert.ok(now.indexOf(START_OF_NEW_MESSAGES) !== -1);

            prev = now;
            now = preparePostIdsForPostList(state, {postIds, lastViewedAt});
            assert.equal(now, prev);
        });
    });
});
