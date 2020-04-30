// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import deepFreezeAndThrowOnMutation from '@mm-redux/utils/deep_freeze';
import TestHelper from 'test/test_helper';
import * as Selectors from '@mm-redux/selectors/entities/search';

describe('Selectors.Search', () => {
    const team1 = TestHelper.fakeTeamWithId();

    const team1CurrentSearch = {params: {page: 0, per_page: 20}, isEnd: true};

    const testState = deepFreezeAndThrowOnMutation({
        entities: {
            teams: {
                currentTeamId: team1.id,
            },
            search: {
                current: {[team1.id]: team1CurrentSearch},
            },
        },
    });

    it('should return current search for current team', () => {
        assert.deepEqual(Selectors.getCurrentSearchForCurrentTeam(testState), team1CurrentSearch);
    });

    it('getAllUserMentionKeys', () => {
        const userId = '1234';
        const notifyProps = {
            first_name: 'true',
        };
        const state = {
            entities: {
                users: {
                    currentUserId: userId,
                    profiles: {
                        [userId]: {id: userId, username: 'user', first_name: 'First', last_name: 'Last', notify_props: notifyProps},
                    },
                },
                groups: {
                    myGroups: {
                        test1: {
                            name: 'I-AM-THE-BEST!',
                            delete_at: 0,
                            allow_reference: true,
                        },
                        test2: {
                            name: 'Do-you-love-me?',
                            delete_at: 0,
                            allow_reference: true,
                        },
                        test3: {
                            name: 'Maybe?-A-little-bit-I-guess....',
                            delete_at: 0,
                            allow_reference: false,
                        },
                    },
                },
            },
        };

        assert.deepEqual(Selectors.getAllUserMentionKeys(state), [{key: 'First', caseSensitive: true}, {key: '@user'}, {key: '@I-AM-THE-BEST!'}, {key: '@Do-you-love-me?'}]);
    });

    describe('makeGetMentionKeysForPost', () => {
        const getMentionKeysForPost = Selectors.makeGetMentionKeysForPost();
        it('should return all mentionKeys', () => {
            const postProps = {
                disable_group_highlight: false,
                mentionHighlightDisabled: false,
            };
            const state = {
                entities: {
                    users: {
                        currentUserId: 'a123',
                        profiles: {
                            a123: {
                                username: 'a123',
                                notify_props: {
                                    channel: 'true',
                                },
                            },
                        },
                    },
                    groups: {
                        myGroups: {
                            developers: {
                                id: 123,
                                name: 'developers',
                                allow_reference: true,
                                delete_at: 0,
                            },
                        },
                    },
                },
            };
            const results = getMentionKeysForPost(state, postProps);
            const expected = [{key: '@channel'}, {key: '@all'}, {key: '@here'}, {key: '@a123'}, {key: '@developers'}];
            assert.deepEqual(results, expected);
        });

        it('should return mentionKeys without groups', () => {
            const postProps = {
                disable_group_highlight: true,
                mentionHighlightDisabled: false,
            };
            const state = {
                entities: {
                    users: {
                        currentUserId: 'a123',
                        profiles: {
                            a123: {
                                username: 'a123',
                                notify_props: {
                                    channel: 'true',
                                },
                            },
                        },
                    },
                    groups: {
                        myGroups: {
                            developers: {
                                id: 123,
                                name: 'developers',
                                allow_reference: true,
                                delete_at: 0,
                            },
                        },
                    },
                },
            };
            const results = getMentionKeysForPost(state, postProps);
            const expected = [{key: '@channel'}, {key: '@all'}, {key: '@here'}, {key: '@a123'}];
            assert.deepEqual(results, expected);
        });

        it('should return group mentions and all mentions without channel mentions', () => {
            const postProps = {
                disable_group_highlight: false,
                mentionHighlightDisabled: true,
            };
            const state = {
                entities: {
                    users: {
                        currentUserId: 'a123',
                        profiles: {
                            a123: {
                                username: 'a123',
                                notify_props: {
                                    channel: 'true',
                                },
                            },
                        },
                    },
                    groups: {
                        myGroups: {
                            developers: {
                                id: 123,
                                name: 'developers',
                                allow_reference: true,
                                delete_at: 0,
                            },
                        },
                    },
                },
            };
            const results = getMentionKeysForPost(state, postProps);
            const expected = [{key: '@a123'}, {key: '@developers'}];
            assert.deepEqual(results, expected);
        });

        it('should return all mentions without group mentions and channel mentions', () => {
            const postProps = {
                disable_group_highlight: true,
                mentionHighlightDisabled: true,
            };
            const state = {
                entities: {
                    users: {
                        currentUserId: 'a123',
                        profiles: {
                            a123: {
                                username: 'a123',
                                notify_props: {
                                    channel: 'true',
                                },
                            },
                        },
                    },
                    groups: {
                        myGroups: {
                            developers: {
                                id: 123,
                                name: 'developers',
                                allow_reference: true,
                                delete_at: 0,
                            },
                        },
                    },
                },
            };
            const results = getMentionKeysForPost(state, postProps);
            const expected = [{key: '@a123'}];
            assert.deepEqual(results, expected);
        });
    });
});
