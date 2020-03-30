// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {PostTypes} from '@mm-redux/action_types';
import {customEmoji as customEmojiReducer} from '@mm-redux/reducers/entities/emojis';
import deepFreeze from '@mm-redux/utils/deep_freeze';

describe('reducers/entities/emojis', () => {
    describe('customEmoji', () => {
        const testForSinglePost = (actionType) => () => {
            it('no post metadata', () => {
                const state = deepFreeze({});
                const action = {
                    type: actionType,
                    data: {
                        id: 'post',
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.equal(nextState, state);
            });

            it('no emojis in post metadata', () => {
                const state = deepFreeze({});
                const action = {
                    type: actionType,
                    data: {
                        id: 'post',
                        metadata: {},
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.equal(nextState, state);
            });

            it('should save custom emojis', () => {
                const state = deepFreeze({});
                const action = {
                    type: actionType,
                    data: {
                        id: 'post',
                        metadata: {
                            emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.notEqual(nextState, state);
                assert.deepEqual(nextState, {
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                });
            });

            it('should not save custom emojis that are already loaded', () => {
                const state = deepFreeze({
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                });
                const action = {
                    type: actionType,
                    data: {
                        id: 'post',
                        metadata: {
                            emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.equal(nextState, state);
            });

            it('should handle a mix of custom emojis that are and are not loaded', () => {
                const state = deepFreeze({
                    emoji1: {id: 'emoji1'},
                });
                const action = {
                    type: actionType,
                    data: {
                        id: 'post',
                        metadata: {
                            emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.notEqual(nextState, state);
                assert.deepEqual(nextState, {
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                });
            });
        };

        describe('RECEIVED_NEW_POST', testForSinglePost(PostTypes.RECEIVED_NEW_POST));
        describe('RECEIVED_POST', testForSinglePost(PostTypes.RECEIVED_POST));

        describe('RECEIVED_POSTS', () => {
            it('no post metadata', () => {
                const state = deepFreeze({});
                const action = {
                    type: PostTypes.RECEIVED_POSTS,
                    data: {
                        posts: {
                            post: {
                                id: 'post',
                            },
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.equal(nextState, state);
            });

            it('no emojis in post metadata', () => {
                const state = deepFreeze({});
                const action = {
                    type: PostTypes.RECEIVED_POSTS,
                    data: {
                        posts: {
                            post: {
                                id: 'post',
                                metadata: {},
                            },
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.equal(nextState, state);
            });

            it('should save custom emojis', () => {
                const state = deepFreeze({});
                const action = {
                    type: PostTypes.RECEIVED_POSTS,
                    data: {
                        posts: {
                            post: {
                                id: 'post',
                                metadata: {
                                    emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                                },
                            },
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.notEqual(nextState, state);
                assert.deepEqual(nextState, {
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                });
            });

            it('should not save custom emojis that are already loaded', () => {
                const state = deepFreeze({
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                });
                const action = {
                    type: PostTypes.RECEIVED_POSTS,
                    data: {
                        posts: {
                            post: {
                                id: 'post',
                                metadata: {
                                    emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                                },
                            },
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.equal(nextState, state);
            });

            it('should handle a mix of custom emojis that are and are not loaded', () => {
                const state = deepFreeze({
                    emoji1: {id: 'emoji1'},
                });
                const action = {
                    type: PostTypes.RECEIVED_POSTS,
                    data: {
                        posts: {
                            post: {
                                id: 'post',
                                metadata: {
                                    emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                                },
                            },
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.notEqual(nextState, state);
                assert.deepEqual(nextState, {
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                });
            });

            it('should save emojis from multiple posts', () => {
                const state = deepFreeze({
                    emoji1: {id: 'emoji1'},
                });
                const action = {
                    type: PostTypes.RECEIVED_POSTS,
                    data: {
                        posts: {
                            post1: {
                                id: 'post1',
                                metadata: {
                                    emojis: [{id: 'emoji1'}, {id: 'emoji2'}],
                                },
                            },
                            post2: {
                                id: 'post2',
                                metadata: {
                                    emojis: [{id: 'emoji1'}, {id: 'emoji3'}],
                                },
                            },
                        },
                    },
                };

                const nextState = customEmojiReducer(state, action);

                assert.notEqual(nextState, state);
                assert.deepEqual(nextState, {
                    emoji1: {id: 'emoji1'},
                    emoji2: {id: 'emoji2'},
                    emoji3: {id: 'emoji3'},
                });
            });
        });
    });
});
