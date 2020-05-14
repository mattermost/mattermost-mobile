// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {PostTypes, SearchTypes} from '@mm-redux/action_types';
import reducer from '@mm-redux/reducers/entities/search';

describe('reducers.entities.search', () => {
    describe('results', () => {
        it('initial state', () => {
            const inputState = undefined; // eslint-disable-line no-undef
            const action = {};
            const expectedState = [];

            const actualState = reducer({results: inputState}, action);
            assert.deepEqual(actualState.results, expectedState);
        });

        describe('SearchTypes.RECEIVED_SEARCH_POSTS', () => {
            it('first results received', () => {
                const inputState = [];
                const action = {
                    type: SearchTypes.RECEIVED_SEARCH_POSTS,
                    data: {
                        order: ['abcd', 'efgh'],
                        posts: {
                            abcd: {id: 'abcd'},
                            efgh: {id: 'efgh'},
                        },
                    },
                };
                const expectedState = ['abcd', 'efgh'];

                const actualState = reducer({results: inputState}, action);
                assert.deepEqual(actualState.results, expectedState);
            });

            it('multiple results received', () => {
                const inputState = ['1234', '1235'];
                const action = {
                    type: SearchTypes.RECEIVED_SEARCH_POSTS,
                    data: {
                        order: ['abcd', 'efgh'],
                        posts: {
                            abcd: {id: 'abcd'},
                            efgh: {id: 'efgh'},
                        },
                    },
                };
                const expectedState = ['abcd', 'efgh'];

                const actualState = reducer({results: inputState}, action);
                assert.deepEqual(actualState.results, expectedState);
            });
        });

        describe('PostTypes.POST_REMOVED', () => {
            it('post in results', () => {
                const inputState = ['abcd', 'efgh'];
                const action = {
                    type: PostTypes.POST_REMOVED,
                    data: {
                        id: 'efgh',
                    },
                };
                const expectedState = ['abcd'];

                const actualState = reducer({results: inputState}, action);
                assert.deepEqual(actualState.results, expectedState);
            });

            it('post not in results', () => {
                const inputState = ['abcd', 'efgh'];
                const action = {
                    type: PostTypes.POST_REMOVED,
                    data: {
                        id: '1234',
                    },
                };
                const expectedState = ['abcd', 'efgh'];

                const actualState = reducer({results: inputState}, action);
                assert.deepEqual(actualState.results, expectedState);
                assert.equal(actualState.results, inputState);
            });
        });

        describe('SearchTypes.REMOVE_SEARCH_POSTS', () => {
            const inputState = ['abcd', 'efgh'];
            const action = {
                type: SearchTypes.REMOVE_SEARCH_POSTS,
            };
            const expectedState = [];

            const actualState = reducer({results: inputState}, action);
            assert.deepEqual(actualState.results, expectedState);
        });
    });

    describe('matches', () => {
        it('initial state', () => {
            const inputState = undefined; // eslint-disable-line no-undef
            const action = {};
            const expectedState = {};

            const actualState = reducer({matches: inputState}, action);
            assert.deepEqual(actualState.matches, expectedState);
        });

        describe('SearchTypes.RECEIVED_SEARCH_POSTS', () => {
            it('no matches received', () => {
                const inputState = {};
                const action = {
                    type: SearchTypes.RECEIVED_SEARCH_POSTS,
                    data: {
                        order: ['abcd', 'efgh'],
                        posts: {
                            abcd: {id: 'abcd'},
                            efgh: {id: 'efgh'},
                        },
                    },
                };
                const expectedState = {};

                const actualState = reducer({matches: inputState}, action);
                assert.deepEqual(actualState.matches, expectedState);
            });

            it('first results received', () => {
                const inputState = {};
                const action = {
                    type: SearchTypes.RECEIVED_SEARCH_POSTS,
                    data: {
                        order: ['abcd', 'efgh'],
                        posts: {
                            abcd: {id: 'abcd'},
                            efgh: {id: 'efgh'},
                        },
                        matches: {
                            abcd: ['test', 'testing'],
                            efgh: ['tests'],
                        },
                    },
                };
                const expectedState = {
                    abcd: ['test', 'testing'],
                    efgh: ['tests'],
                };

                const actualState = reducer({matches: inputState}, action);
                assert.deepEqual(actualState.matches, expectedState);
            });

            it('multiple results received', () => {
                const inputState = {
                    1234: ['foo', 'bar'],
                    5678: ['foo'],
                };
                const action = {
                    type: SearchTypes.RECEIVED_SEARCH_POSTS,
                    data: {
                        order: ['abcd', 'efgh'],
                        posts: {
                            abcd: {id: 'abcd'},
                            efgh: {id: 'efgh'},
                        },
                        matches: {
                            abcd: ['test', 'testing'],
                            efgh: ['tests'],
                        },
                    },
                };
                const expectedState = {
                    abcd: ['test', 'testing'],
                    efgh: ['tests'],
                };

                const actualState = reducer({matches: inputState}, action);
                assert.deepEqual(actualState.matches, expectedState);
            });
        });

        describe('PostTypes.POST_REMOVED', () => {
            it('post in results', () => {
                const inputState = {
                    abcd: ['test', 'testing'],
                    efgh: ['tests'],
                };
                const action = {
                    type: PostTypes.POST_REMOVED,
                    data: {
                        id: 'efgh',
                    },
                };
                const expectedState = {
                    abcd: ['test', 'testing'],
                };

                const actualState = reducer({matches: inputState}, action);
                assert.deepEqual(actualState.matches, expectedState);
            });

            it('post not in results', () => {
                const inputState = {
                    abcd: ['test', 'testing'],
                    efgh: ['tests'],
                };
                const action = {
                    type: PostTypes.POST_REMOVED,
                    data: {
                        id: '1234',
                    },
                };
                const expectedState = {
                    abcd: ['test', 'testing'],
                    efgh: ['tests'],
                };

                const actualState = reducer({matches: inputState}, action);
                assert.deepEqual(actualState.matches, expectedState);
                assert.equal(actualState.matches, inputState);
            });
        });

        describe('SearchTypes.REMOVE_SEARCH_POSTS', () => {
            const inputState = {
                abcd: ['test', 'testing'],
                efgh: ['tests'],
            };
            const action = {
                type: SearchTypes.REMOVE_SEARCH_POSTS,
            };
            const expectedState = [];

            const actualState = reducer({matches: inputState}, action);
            assert.deepEqual(actualState.matches, expectedState);
        });
    });

    describe('pinned', () => {
        it('do not show multiples of the same post', () => {
            const inputState = {
                abcd: ['1234', '5678'],
            };
            const action = {
                type: PostTypes.RECEIVED_POST,
                data: {
                    id: '5678',
                    is_pinned: true,
                    channel_id: 'abcd',
                },
            };

            const actualState = reducer({pinned: inputState}, action);
            assert.deepEqual(actualState.pinned, inputState);
        });
    });
});
