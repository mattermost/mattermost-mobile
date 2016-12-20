// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/channels';
import {getProfiles} from 'service/actions/users';
import Client from 'service/client';
import configureStore from 'app/store';
import {RequestStatus} from 'service/constants';
import TestHelper from 'test/test_helper';

describe('Actions.Channels', () => {
    it('createChannel', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;

                const createRequest = store.getState().requests.channels.createChannel;
                const membersRequest = store.getState().requests.channels.myMembers;

                if (createRequest.status === RequestStatus.SUCCESS && membersRequest.status === RequestStatus.SUCCESS) {
                    const channelsCount = Object.keys(channels).length;
                    const membersCount = Object.keys(members).length;
                    assert.ok(channels);
                    assert.ok(members);
                    assert.ok(channels[Object.keys(members)[0]]);
                    assert.ok(members[Object.keys(channels)[0]]);
                    assert.equal(members[Object.keys(channels)[0]].user_id, TestHelper.basicUser.id);
                    assert.equal(channelsCount, membersCount);
                    assert.equal(channelsCount, 1);
                    assert.equal(membersCount, 1);
                    done();
                } else if (createRequest.status === RequestStatus.FAILURE && membersRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(createRequest.error)));
                }
            });

            const channel = {
                team_id: TestHelper.basicTeam.id,
                name: 'redux-test',
                display_name: 'Redux Test',
                purpose: 'This is to test redux',
                header: 'MM with Redux',
                type: 'O'
            };

            Actions.createChannel(channel, TestHelper.basicUser.id)(store.dispatch, store.getState);
        });
    });

    it('createDirectChannel', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            store.subscribe(() => {
                const state = store.getState();
                const channels = state.entities.channels.channels;
                const members = state.entities.channels.myMembers;
                const profiles = state.entities.users.profiles;
                const preferences = state.entities.preferences.myPreferences;

                const createRequest = state.requests.channels.createChannel;

                if (createRequest.status === RequestStatus.SUCCESS || createRequest.status === RequestStatus.FAILURE) {
                    if (createRequest.error) {
                        done(new Error(JSON.stringify(createRequest.error)));
                    }

                    const channelsCount = Object.keys(channels).length;
                    const membersCount = Object.keys(members).length;
                    assert.ok(channels, 'channels is empty');
                    assert.ok(members, 'members is empty');
                    assert.ok(profiles[user.id], 'profiles does not have userId');
                    assert.ok(Object.keys(preferences).length, 'preferences is empty');
                    assert.ok(channels[Object.keys(members)[0]], 'channels should have the member');
                    assert.ok(members[Object.keys(channels)[0]], 'members should belong to channel');
                    assert.equal(members[Object.keys(channels)[0]].user_id, TestHelper.basicUser.id);
                    assert.equal(channelsCount, membersCount);
                    assert.equal(channels[Object.keys(channels)[0]].type, 'D');
                    assert.equal(channelsCount, 1);
                    assert.equal(membersCount, 1);
                    done();
                }
            });

            await getProfiles(0)(store.dispatch, store.getState);
            Actions.createDirectChannel(TestHelper.basicTeam.id, TestHelper.basicUser.id, user.id)(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('updateChannel', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const updateRequest = store.getState().requests.channels.updateChannel;

                if (updateRequest.status === RequestStatus.SUCCESS) {
                    const channelId = Object.keys(channels)[0];
                    const channel = channels[channelId];
                    assert.ok(channelId);
                    assert.ok(channel);
                    assert.equal(channel.header, 'MM with Redux');
                    done();
                } else if (updateRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(updateRequest.error)));
                }
            });

            const channel = {
                ...TestHelper.basicChannel,
                purpose: 'This is to test redux',
                header: 'MM with Redux'
            };

            Actions.updateChannel(channel)(store.dispatch, store.getState);
        });
    });

    it('getChannel', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;

                const channelRequest = store.getState().requests.channels.getChannel;

                if (channelRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(channels[TestHelper.basicChannel.id]);
                    assert.ok(members[TestHelper.basicChannel.id]);
                    done();
                } else if (channelRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(channelRequest.error)));
                }
            });

            Actions.getChannel(TestHelper.basicTeam.id, TestHelper.basicChannel.id)(store.dispatch, store.getState);
        });
    });

    it('fetchMyChannelsAndMembers', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;

                const channelsRequest = store.getState().requests.channels.getChannels;
                const membersRequest = store.getState().requests.channels.myMembers;

                if (channelsRequest.status === RequestStatus.SUCCESS && membersRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(channels);
                    assert.ok(members);
                    assert.ok(channels[Object.keys(members)[0]]);
                    assert.ok(members[Object.keys(channels)[0]]);
                    assert.equal(Object.keys(channels).length, Object.keys(members).length);
                    done();
                } else if (channelsRequest.status === RequestStatus.FAILURE && membersRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(channelsRequest.error)));
                }
            });

            Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
        });
    });

    it('updateChannelNotifyProps', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const members = store.getState().entities.channels.myMembers;
                const updateRequest = store.getState().requests.channels.updateChannelNotifyProps;

                if (updateRequest.status === RequestStatus.SUCCESS) {
                    const member = members[TestHelper.basicChannel.id];
                    assert.ok(member);
                    assert.equal(member.notify_props.mark_unread, 'mention');
                    assert.equal(member.notify_props.desktop, 'none');
                    done();
                } else if (updateRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(updateRequest.error)));
                }
            });

            const notifyProps = {
                mark_unread: 'mention',
                desktop: 'none'
            };

            await Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
            Actions.updateChannelNotifyProps(
                TestHelper.basicUser.id,
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                notifyProps)(store.dispatch, store.getState);
        });
    });

    it('leaveChannel', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;
                const leaveRequest = store.getState().requests.channels.leaveChannel;

                if (leaveRequest.status === RequestStatus.SUCCESS) {
                    const channel = channels[TestHelper.basicChannel.id];
                    const member = members[TestHelper.basicChannel.id];

                    assert.ifError(channel);
                    assert.ifError(member);
                    done();
                } else if (leaveRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(leaveRequest.error)));
                }
            });

            Actions.leaveChannel(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id)(store.dispatch, store.getState);
        });
    });

    it('joinChannel', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const secondClient = TestHelper.createClient();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );
            await secondClient.login(user.email, 'password1');

            const secondChannel = await secondClient.createChannel(
                TestHelper.fakeChannel(TestHelper.basicTeam.id));

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;
                const joinRequest = store.getState().requests.channels.joinChannel;

                if (joinRequest.status === RequestStatus.SUCCESS) {
                    const channel = channels[secondChannel.id];
                    const member = members[secondChannel.id];

                    assert.ok(channel);
                    assert.ok(member);
                    done();
                } else if (joinRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(joinRequest.error)));
                }
            });

            Actions.joinChannel(
                TestHelper.basicUser.id,
                TestHelper.basicTeam.id,
                secondChannel.id)(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('joinChannelByName', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const secondClient = TestHelper.createClient();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );
            await secondClient.login(user.email, 'password1');

            const secondChannel = await secondClient.createChannel(
                TestHelper.fakeChannel(TestHelper.basicTeam.id));

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;
                const joinRequest = store.getState().requests.channels.joinChannel;

                if (joinRequest.status === RequestStatus.SUCCESS) {
                    const channel = channels[secondChannel.id];
                    const member = members[secondChannel.id];

                    assert.ok(channel);
                    assert.ok(member);
                    done();
                } else if (joinRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(joinRequest.error)));
                }
            });

            Actions.joinChannel(
                TestHelper.basicUser.id,
                TestHelper.basicTeam.id,
                null,
                secondChannel.name)(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('deleteChannel', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;
                const deleteRequest = store.getState().requests.channels.deleteChannel;

                if (deleteRequest.status === RequestStatus.SUCCESS) {
                    const channel = channels[TestHelper.basicChannel.id];
                    const member = members[TestHelper.basicChannel.id];

                    assert.ifError(channel);
                    assert.ifError(member);
                    done();
                } else if (deleteRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(deleteRequest.error)));
                }
            });

            Actions.deleteChannel(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id)(store.dispatch, store.getState);
        });
    });

    it('updateLastViewedAt', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            let lastViewed;

            store.subscribe(() => {
                const members = store.getState().entities.channels.myMembers;
                const updateRequest = store.getState().requests.channels.updateLastViewedAt;
                let member;

                if (updateRequest.status === RequestStatus.STARTED) {
                    member = members[TestHelper.basicChannel.id];
                    assert.ok(member);
                    lastViewed = member.last_viewed_at;
                } else if (updateRequest.status === RequestStatus.SUCCESS) {
                    member = members[TestHelper.basicChannel.id];
                    assert.ok(member.last_viewed_at > lastViewed);

                    done();
                } else if (updateRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(updateRequest.error)));
                }
            });

            await Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
            Actions.updateLastViewedAt(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id, true)(store.dispatch, store.getState);
        });
    });

    it('getMoreChannels', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const secondClient = TestHelper.createClient();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );
            await secondClient.login(user.email, 'password1');

            const secondChannel = await secondClient.createChannel(
                TestHelper.fakeChannel(TestHelper.basicTeam.id));

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;
                const moreRequest = store.getState().requests.channels.getMoreChannels;

                if (moreRequest.status === RequestStatus.SUCCESS) {
                    const channel = channels[secondChannel.id];

                    assert.ok(channel);
                    assert.ifError(members[channel.id]);
                    done();
                } else if (moreRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(moreRequest.error)));
                }
            });

            Actions.getMoreChannels(TestHelper.basicTeam.id, 0)(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getChannelStats', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const stats = store.getState().entities.channels.stats;
                const statsRequest = store.getState().requests.channels.getChannelStats;

                if (statsRequest.status === RequestStatus.SUCCESS) {
                    const stat = stats[TestHelper.basicChannel.id];
                    assert.ok(stat);
                    assert.equal(stat.member_count, 1);
                    done();
                } else if (statsRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(statsRequest.error)));
                }
            });

            Actions.getChannelStats(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id
            )(store.dispatch, store.getState);
        });
    });

    it('addChannelMember', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            store.subscribe(() => {
                const profilesInChannel = store.getState().entities.users.profilesInChannel;
                const profilesNotInChannel = store.getState().entities.users.profilesNotInChannel;
                const addRequest = store.getState().requests.channels.addChannelMember;

                if (addRequest.status === RequestStatus.SUCCESS) {
                    const channel = profilesInChannel[TestHelper.basicChannel.id];
                    const notChannel = profilesNotInChannel[TestHelper.basicChannel.id];
                    assert.ok(channel);
                    assert.ok(notChannel);
                    assert.ok(channel.has(user.id));
                    assert.ifError(notChannel.has(user.id));
                    done();
                } else if (addRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(addRequest.error)));
                }
            });

            Actions.addChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id
            )(store.dispatch, store.getState);
        });
    });

    it('removeChannelMember', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            store.subscribe(() => {
                const profilesInChannel = store.getState().entities.users.profilesInChannel;
                const profilesNotInChannel = store.getState().entities.users.profilesNotInChannel;
                const removeRequest = store.getState().requests.channels.removeChannelMember;

                if (removeRequest.status === RequestStatus.SUCCESS) {
                    const channel = profilesInChannel[TestHelper.basicChannel.id];
                    const notChannel = profilesNotInChannel[TestHelper.basicChannel.id];
                    assert.ok(channel);
                    assert.ok(notChannel);
                    assert.ok(notChannel.has(user.id));
                    assert.ifError(channel.has(user.id));
                    done();
                } else if (removeRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(removeRequest.error)));
                }
            });

            await Actions.addChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id
            )(store.dispatch, store.getState);

            Actions.removeChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id
            )(store.dispatch, store.getState);
        });
    });
});
