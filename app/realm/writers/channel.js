// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {ChannelTypes} from 'app/realm/action_types';
import {channelDataToRealm, channelMemberDataToRealm} from 'app/realm/utils/channel';

function storeChannelAndMember(realm, channel, member) {
    const user = realm.objectForPrimaryKey('User', member?.user_id); //eslint-disable-line camelcase

    if (user && channel) {
        const channelRealm = realm.objectForPrimaryKey('Channel', channel.id);
        if (channelRealm) {
            // when the channel already exists
            let memberRealm = channelRealm.members.find((m) => m.id === `${channel.id}-${user.id}`);
            if (memberRealm) {
                // when the member already exists
                memberRealm = channelMemberDataToRealm(member);
            } else {
                channelRealm.members.push(channelMemberDataToRealm(member));
            }
        } else {
            channel.team = realm.objectForPrimaryKey('Team', channel.team_id);
            channel.members = [channelMemberDataToRealm(member)];
            realm.create('Channel', channelDataToRealm(channel), true);
        }
    }
}

function channels(realm, action) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_MY_CHANNELS: {
        const data = action.data || action.payload;
        const channelMembersMap = new Map();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const user = realm.objectForPrimaryKey('User', general?.currentUserId);

        if (user) {
            if (data.channels?.length && data.channelMembers?.length) {
                data.channelMembers.forEach((member) => {
                    const members = channelMembersMap.get(member.channel_id) || [];

                    member.user = user;
                    members.push(channelMemberDataToRealm(member));
                    channelMembersMap.set(member.channel_id, members);
                });
            }

            // Remove all memberships from channel if needed
            const realmChannels = realm.objects('Channel');
            realmChannels.forEach((c) => {
                const channelMembers = channelMembersMap.get(c.id);
                if (!channelMembers || channelMembers[0]?.deleteAt) {
                    realm.delete(realm.objects('ChannelMember').filtered('id BEGINSWITH $0', c.id));
                }
            });

            if (data.channels?.length) {
                data.channels.forEach((channelData) => {
                    const realmChannel = realm.objectForPrimaryKey('Channel', channelData.id);

                    channelData.team = realm.objectForPrimaryKey('Team', channelData.team_id);

                    // the member part is tricky as we store all the channel members no only your own
                    const myMembers = channelMembersMap.get(channelData.id) || [];
                    if (realmChannel && myMembers.length) {
                        channelData.members = realmChannel.members.map((m) => m);
                        const index = channelData.members.findIndex((m) => m.id === myMembers[0].id);
                        if (index >= 0) {
                            // when the member is already part of the channel
                            channelData.members[index] = myMembers[0];
                        } else {
                            // when we became a new member of this channel
                            channelData.members.push(myMembers);
                        }
                    } else {
                        // when we need to create a new channel
                        channelData.members = myMembers;
                    }

                    realm.create('Channel', channelDataToRealm(channelData), true);
                });
            }
        }

        break;
    }

    case ChannelTypes.SELECT_CHANNEL: {
        const {data} = action;
        const {nextChannel, previousChannel} = data;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        general.currentChannelId = nextChannel.id;
        if (data.teamId) {
            general.currentTeamId = data.teamId;
        }

        const nextRealmChannel = realm.objectForPrimaryKey('Channel', nextChannel.id);
        const nextChannelMember = realm.objectForPrimaryKey('ChannelMember', `${nextChannel.id}-${general.currentUserId}`);
        const nextTeamMember = realm.objectForPrimaryKey('TeamMember', `${nextRealmChannel.team?.id}-${general.currentUserId}`);

        const nextChannelMemberMsgCount = nextChannelMember.msgCount;
        const nextChannelMemberMentionCount = nextChannelMember.mentionCount;

        nextChannelMember.msgCount = nextRealmChannel.totalMsgCount;
        nextChannelMember.mentionCount = 0;

        if (nextTeamMember) {
            const nextTeamMemberMsgCount = nextTeamMember.msgCount;
            const nextTeamMemberMentionCount = nextTeamMember.mentionCount;

            nextTeamMember.msgCount = Math.max(nextTeamMemberMsgCount - nextChannelMemberMsgCount, 0);
            nextTeamMember.mentionCount = Math.max(nextTeamMemberMentionCount - nextChannelMemberMentionCount, 0);
        }

        if (nextChannel.setLastViewed) {
            nextChannelMember.lastViewAt = Date.now();
        }

        if (previousChannel.id && previousChannel.id !== nextChannel.id) {
            const prevRealmChannel = realm.objectForPrimaryKey('Channel', previousChannel.id);
            const prevChannelMember = realm.objectForPrimaryKey('ChannelMember', `${previousChannel.id}-${general.currentUserId}`);
            const prevTeamMember = realm.objectForPrimaryKey('TeamMember', `${prevRealmChannel.team?.id}-${general.currentUserId}`);

            if (prevChannelMember) {
                const prevChannelMemberMsgCount = prevChannelMember.msgCount;
                const prevChannelMemberMentionCount = prevChannelMember.mentionCount;

                if (prevTeamMember) {
                    const prevTeamMemberMsgCount = prevTeamMember.msgCount;
                    const prevTeamMemberMentionCount = prevTeamMember.mentionCount;

                    prevTeamMember.msgCount = Math.max(prevTeamMemberMsgCount - prevChannelMemberMsgCount, 0);
                    prevTeamMember.mentionCount = Math.max(prevTeamMemberMentionCount - prevChannelMemberMentionCount, 0);
                }

                prevChannelMember.msgCount = prevRealmChannel.totalMsgCount;
                prevChannelMember.mentionCount = 0;
                prevChannelMember.lastViewAt = Date.now();
            }
        }
        break;
    }

    case ChannelTypes.RECEIVED_CHANNEL_STATS: {
        const data = action.data || action.payload;

        const channel = realm.objectForPrimaryKey('Channel', data.channel_id);
        if (channel) {
            channel.memberCount = data.member_count;
        }
        break;
    }

    case ChannelTypes.RECEIVED_CHANNEL_AND_MEMBER: {
        const data = action.data || action.payload;
        const {member, channel} = data;

        storeChannelAndMember(realm, channel, member);

        break;
    }

    case ChannelTypes.CREATE_DIRECT_CHANNEL: {
        const data = action.data || action.payload;
        const {channel, members} = data;

        if (members?.length) {
            members.forEach((member) => storeChannelAndMember(realm, channel, member));
        }
        break;
    }
    default:
        break;
    }
}

export default combineWriters([
    channels,
]);
