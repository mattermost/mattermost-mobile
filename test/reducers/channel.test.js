// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import deepFreeze from 'deep-freeze';
import TestHelper from 'test_helper.js';

import reduceChannel from 'reducers/channel';

import {ChannelTypes} from 'constants';

describe('reducers/channel.js', () => {
    it('initial state', () => {
        const store = reduceChannel(undefined, {type: ''});

        const expected = {
            channels: {},
            channelIdsByTeamId: {},
            channelMembers: {}
        };

        assert.deepEqual(store, expected, 'initial state of store');
    });

    describe('CHANNEL_RECEIVED', () => {
        let store = deepFreeze(reduceChannel(undefined, {type: ''}));

        const teamId = TestHelper.generateId();
        const channel1 = {
            id: TestHelper.generateId(),
            ...TestHelper.fakeChannel(teamId)
        };
        const channel2 = {
            id: TestHelper.generateId(),
            ...TestHelper.fakeChannel(teamId)
        };

        it('first channel received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_RECEIVED,
                channel: channel1
            });

            assert.deepEqual(store.channels, {
                [channel1.id]: channel1
            });
            assert.deepEqual(store.channelIdsByTeamId, {
                [teamId]: {
                    [channel1.id]: channel1.id
                }
            });
            assert.deepEqual(store.channelMembers, {});
        });

        store = deepFreeze(store);

        it('second channel received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_RECEIVED,
                channel: channel2
            });

            assert.deepEqual(store.channels, {
                [channel1.id]: channel1,
                [channel2.id]: channel2
            });
            assert.deepEqual(store.channelIdsByTeamId, {
                [teamId]: {
                    [channel1.id]: channel1.id,
                    [channel2.id]: channel2.id
                }
            });
            assert.deepEqual(store.channelMembers, {});
        });

        store = deepFreeze(store);

        const channel1a = {
            ...channel1,
            name: channel1.name + 'test'
        };

        it('first channel received again', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_RECEIVED,
                channel: channel1a
            });

            assert.deepEqual(store.channels, {
                [channel1.id]: channel1a,
                [channel2.id]: channel2
            });
            assert.deepEqual(store.channelIdsByTeamId, {
                [teamId]: {
                    [channel1.id]: channel1.id,
                    [channel2.id]: channel2.id
                }
            });
            assert.deepEqual(store.channelMembers, {});
        });
    });

    describe('CHANNELS_RECEIVED', () => {
        let store = deepFreeze(reduceChannel(undefined, {type: ''}));

        const teamId = TestHelper.generateId();
        const channel1 = {
            id: TestHelper.generateId(),
            ...TestHelper.fakeChannel(teamId)
        };
        const channel2 = {
            id: TestHelper.generateId(),
            ...TestHelper.fakeChannel(teamId)
        };

        it('first set of channels received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNELS_RECEIVED,
                channels: [channel1, channel2]
            });

            assert.deepEqual(store.channels, {
                [channel1.id]: channel1,
                [channel2.id]: channel2
            });
            assert.deepEqual(store.channelIdsByTeamId, {
                [teamId]: {
                    [channel1.id]: channel1.id,
                    [channel2.id]: channel2.id
                }
            });
            assert.deepEqual(store.channelMembers, {});
        });

        store = deepFreeze(store);

        const channel2a = {
            ...channel2,
            name: channel2.name + 'test'
        };
        const channel3 = {
            id: TestHelper.generateId(),
            ...TestHelper.fakeChannel(teamId)
        };

        it('second set of channels received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNELS_RECEIVED,
                channels: [channel2a, channel3]
            });

            assert.deepEqual(store.channels, {
                [channel1.id]: channel1,
                [channel2.id]: channel2a,
                [channel3.id]: channel3
            });
            assert.deepEqual(store.channelIdsByTeamId, {
                [teamId]: {
                    [channel1.id]: channel1.id,
                    [channel2.id]: channel2.id,
                    [channel3.id]: channel3.id
                }
            });
            assert.deepEqual(store.channelMembers, {});
        });
    });

    describe('CHANNEL_MEMBER_RECEIVED', () => {
        let store = deepFreeze(reduceChannel(undefined, {type: ''}));

        const member1 = TestHelper.fakeChannelMember(TestHelper.generateId(), TestHelper.generateId());
        const member2 = TestHelper.fakeChannelMember(TestHelper.generateId(), TestHelper.generateId());

        it('first channel member received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_MEMBER_RECEIVED,
                channelMember: member1
            });

            assert.deepEqual(store.channels, {});
            assert.deepEqual(store.channelIdsByTeamId, {});
            assert.deepEqual(store.channelMembers, {
                [`${member1.channel_id}-${member1.user_id}`]: member1
            });
        });

        store = deepFreeze(store);

        it('second channel member received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_MEMBER_RECEIVED,
                channelMember: member2
            });

            assert.deepEqual(store.channels, {});
            assert.deepEqual(store.channelIdsByTeamId, {});
            assert.deepEqual(store.channelMembers, {
                [`${member1.channel_id}-${member1.user_id}`]: member1,
                [`${member2.channel_id}-${member2.user_id}`]: member2
            });
        });

        store = deepFreeze(store);

        const member1a = {
            ...member1,
            roles: 'system_admin system_user'
        };

        it('first channel member received again', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_MEMBER_RECEIVED,
                channelMember: member1a
            });

            assert.deepEqual(store.channels, {});
            assert.deepEqual(store.channelIdsByTeamId, {});
            assert.deepEqual(store.channelMembers, {
                [`${member1.channel_id}-${member1.user_id}`]: member1a,
                [`${member2.channel_id}-${member2.user_id}`]: member2
            });
        });
    });

    describe('CHANNEL_MEMBERS_RECEIVED', () => {
        let store = deepFreeze(reduceChannel(undefined, {type: ''}));

        const member1 = TestHelper.fakeChannelMember(TestHelper.generateId(), TestHelper.generateId());
        const member2 = TestHelper.fakeChannelMember(TestHelper.generateId(), TestHelper.generateId());

        it('first set of channel members received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_MEMBERS_RECEIVED,
                channelMembers: [member1, member2]
            });

            assert.deepEqual(store.channels, {});
            assert.deepEqual(store.channelIdsByTeamId, {});
            assert.deepEqual(store.channelMembers, {
                [`${member1.channel_id}-${member1.user_id}`]: member1,
                [`${member2.channel_id}-${member2.user_id}`]: member2
            });
        });

        store = deepFreeze(store);

        const member2a = {
            ...member2,
            roles: 'system_admin system_user'
        };
        const member3 = TestHelper.fakeChannelMember(TestHelper.generateId(), TestHelper.generateId());

        it('second set of channel members received', () => {
            store = reduceChannel(store, {
                type: ChannelTypes.CHANNEL_MEMBERS_RECEIVED,
                channelMembers: [member2a, member3]
            });

            assert.deepEqual(store.channels, {});
            assert.deepEqual(store.channelIdsByTeamId, {});
            assert.deepEqual(store.channelMembers, {
                [`${member1.channel_id}-${member1.user_id}`]: member1,
                [`${member2.channel_id}-${member2.user_id}`]: member2a,
                [`${member3.channel_id}-${member3.user_id}`]: member3
            });
        });
    });
});
