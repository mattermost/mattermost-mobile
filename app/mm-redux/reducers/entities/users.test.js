// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {UserTypes, ChannelTypes} from '@mm-redux/action_types';
import reducer from '@mm-redux/reducers/entities/users';

describe('Reducers.users', () => {
    describe('profilesInChannel', () => {
        it('initial state', () => {
            const state = undefined;
            const action = {};
            const expectedState = {
                profilesInChannel: {},
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_IN_CHANNEL, no existing profiles', () => {
            const state = {
                profilesInChannel: {},
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'user_id',
                },
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set().add('user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_IN_CHANNEL, existing profiles', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'user_id',
                },
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set().add('old_user_id').add('user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL, no existing profiles', () => {
            const state = {
                profilesInChannel: {},
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL,
                id: 'id',
                data: [
                    {
                        id: 'user_id',
                    },
                    {
                        id: 'user_id_2',
                    },
                ],
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set().add('user_id').add('user_id_2'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL, existing profiles', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL,
                id: 'id',
                data: [
                    {
                        id: 'user_id',
                    },
                    {
                        id: 'user_id_2',
                    },
                ],
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set().add('old_user_id').add('user_id').add('user_id_2'),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_IN_CHANNEL, no existing profiles', () => {
            const state = {
                profilesInChannel: {},
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_IN_CHANNEL,
                id: 'id',
                data: {
                    user_id: {
                        id: 'user_id',
                    },
                    user_id_2: {
                        id: 'user_id_2',
                    },
                },
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set().add('user_id').add('user_id_2'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_IN_CHANNEL, existing profiles', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_IN_CHANNEL,
                id: 'id',
                data: {
                    user_id: {
                        id: 'user_id',
                    },
                    user_id_2: {
                        id: 'user_id_2',
                    },
                },
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set().add('old_user_id').add('user_id').add('user_id_2'),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL, unknown user id', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'unknkown_user_id',
                },
            };
            const expectedState = state;

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL, known user id', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'old_user_id',
                },
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set(),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('ChannelTypes.CHANNEL_MEMBER_REMOVED, unknown user id', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: ChannelTypes.CHANNEL_MEMBER_REMOVED,
                data: {
                    channel_id: 'id',
                    user_id: 'unknkown_user_id',
                },
            };
            const expectedState = state;

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });

        it('ChannelTypes.CHANNEL_MEMBER_REMOVED, known user id', () => {
            const state = {
                profilesInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: ChannelTypes.CHANNEL_MEMBER_REMOVED,
                data: {
                    channel_id: 'id',
                    user_id: 'old_user_id',
                },
            };
            const expectedState = {
                profilesInChannel: {
                    id: new Set(),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesInChannel, expectedState.profilesInChannel);
        });
    });

    describe('profilesNotInChannel', () => {
        it('initial state', () => {
            const state = undefined;
            const action = {};
            const expectedState = {
                profilesNotInChannel: {},
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL, no existing profiles', () => {
            const state = {
                profilesNotInChannel: {},
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'user_id',
                },
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set().add('user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL, existing profiles', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'user_id',
                },
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id').add('user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL, no existing profiles', () => {
            const state = {
                profilesNotInChannel: {},
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL,
                id: 'id',
                data: [
                    {
                        id: 'user_id',
                    },
                    {
                        id: 'user_id_2',
                    },
                ],
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set().add('user_id').add('user_id_2'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL, existing profiles', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL,
                id: 'id',
                data: [
                    {
                        id: 'user_id',
                    },
                    {
                        id: 'user_id_2',
                    },
                ],
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id').add('user_id').add('user_id_2'),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_NOT_IN_CHANNEL, no existing profiles', () => {
            const state = {
                profilesNotInChannel: {},
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_NOT_IN_CHANNEL,
                id: 'id',
                data: {
                    user_id: {
                        id: 'user_id',
                    },
                    user_id_2: {
                        id: 'user_id_2',
                    },
                },
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set().add('user_id').add('user_id_2'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILES_NOT_IN_CHANNEL, existing profiles', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILES_NOT_IN_CHANNEL,
                id: 'id',
                data: {
                    user_id: {
                        id: 'user_id',
                    },
                    user_id_2: {
                        id: 'user_id_2',
                    },
                },
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id').add('user_id').add('user_id_2'),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_IN_CHANNEL, unknown user id', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'unknkown_user_id',
                },
            };
            const expectedState = state;

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('UserTypes.RECEIVED_PROFILE_IN_CHANNEL, known user id', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL,
                data: {
                    id: 'id',
                    user_id: 'old_user_id',
                },
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set(),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('ChannelTypes.CHANNEL_MEMBER_ADDED, unknown user id', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: ChannelTypes.CHANNEL_MEMBER_ADDED,
                data: {
                    channel_id: 'id',
                    user_id: 'unknkown_user_id',
                },
            };
            const expectedState = state;

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });

        it('ChannelTypes.CHANNEL_MEMBER_ADDED, known user id', () => {
            const state = {
                profilesNotInChannel: {
                    id: new Set().add('old_user_id'),
                    other_id: new Set().add('other_user_id'),
                },
            };
            const action = {
                type: ChannelTypes.CHANNEL_MEMBER_ADDED,
                data: {
                    channel_id: 'id',
                    user_id: 'old_user_id',
                },
            };
            const expectedState = {
                profilesNotInChannel: {
                    id: new Set(),
                    other_id: new Set().add('other_user_id'),
                },
            };

            const newState = reducer(state, action);
            assert.deepEqual(newState.profilesNotInChannel, expectedState.profilesNotInChannel);
        });
    });
});
