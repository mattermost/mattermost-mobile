// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {ChannelTypes} from 'app/realm/action_types';
import {channelDataToRealm, channelMemberDataToRealm} from 'app/realm/utils/channel';

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
        const nextTeamMember = realm.objectForPrimaryKey('TeamMember', `${nextRealmChannel.team.id}-${general.currentUserId}`);

        const nextMsgAmount = Math.abs(nextRealmChannel.totalMsgCount - nextChannelMember.msgCount);
        const nextChannelMemberMsgCount = nextChannelMember.msgCount;
        const nextTeamMemberMsgCount = nextTeamMember.msgCount;
        const nextChannelMemberMentionCount = nextChannelMember.mentionCount;
        const nextTeamMemberMentionCount = nextTeamMember.mentionCount;

        nextChannelMember.msgCount = Math.max(nextMsgAmount, 0);
        nextChannelMember.mentionCount = 0;
        nextTeamMember.msgCount = Math.max(nextTeamMemberMsgCount - nextChannelMemberMsgCount, 0);
        nextTeamMember.mentionCount = Math.max(nextTeamMemberMentionCount - nextChannelMemberMentionCount, 0);
        if (nextChannel.setLastViewed) {
            nextChannelMember.lastViewAt = Date.now();
        }

        if (previousChannel.id && previousChannel.id !== nextChannel.id) {
            const prevRealmChannel = realm.objectForPrimaryKey('Channel', previousChannel.id);
            const prevChannelMember = realm.objectForPrimaryKey('ChannelMember', `${previousChannel.id}-${general.currentUserId}`);
            const prevTeamMember = realm.objectForPrimaryKey('TeamMember', `${prevRealmChannel.team.id}-${general.currentUserId}`);

            if (prevTeamMember && prevChannelMember) {
                const prevMsgAmount = Math.abs(prevRealmChannel.totalMsgCount - prevChannelMember.msgCount);
                const prevChannelMemberMsgCount = prevChannelMember.msgCount;
                const prevTeamMemberMsgCount = prevTeamMember.msgCount;
                const prevChannelMemberMentionCount = prevChannelMember.mentionCount;
                const prevTeamMemberMentionCount = prevTeamMember.mentionCount;

                prevChannelMember.msgCount = Math.max(prevMsgAmount, 0);
                prevChannelMember.mentionCount = 0;
                nextTeamMember.msgCount = Math.max(prevTeamMemberMsgCount - prevChannelMemberMsgCount, 0);
                nextTeamMember.mentionCount = Math.max(prevTeamMemberMentionCount - prevChannelMemberMentionCount, 0);
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

    default:
        break;
    }
}

export default combineWriters([
    channels,
]);
