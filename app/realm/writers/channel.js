// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {ChannelTypes} from 'app/realm/action_types';
import {channelDataToRealm, channelMemberDataToRealm} from 'app/realm/utils/channel';

function mapUserChannelMembership(data, user) {
    const channelMembersMap = new Map();

    if (data.channels?.length && data.channelMembers?.length) {
        data.channelMembers.forEach((member) => {
            const members = channelMembersMap.get(member.channel_id) || [];

            member.user = user;
            members.push(channelMemberDataToRealm(member));
            channelMembersMap.set(member.channel_id, members);
        });
    }

    return channelMembersMap;
}

function removeChannelMembershipsIfNeeded(realm, channelMembersMap) {
    const realmChannels = realm.objects('Channel');
    realmChannels.forEach((c) => {
        const channelMembers = channelMembersMap.get(c.id);
        if (!channelMembers || channelMembers[0]?.deleteAt) {
            realm.delete(realm.objects('ChannelMember').filtered('id BEGINSWITH $0', c.id));
        }
    });
}

function storeChannel(realm, channel) {
    channel.team = realm.objectForPrimaryKey('Team', channel.team_id) || null;
    realm.create('Channel', channelDataToRealm(channel), true);
}

function storeChannelAndMember(realm, channel, member) {
    const realmChannel = realm.objectForPrimaryKey('Channel', channel.id);

    if (realmChannel && member) {
        channel.members = realmChannel.members.map((m) => m);
        const index = channel.members.findIndex((m) => m.id === member.id);
        if (index >= 0) {
            // when the member is already part of the channel
            channel.members[index] = member;
        } else {
            // when we became a new member of this channel
            channel.members.push(member);
        }
    } else {
        // when we need to create a new channel
        channel.members = [member];
    }

    storeChannel(realm, channel);
}

function updateChannelUnreadCounts(realm, currentUserId, channelId, setLastViewed) {
    const realmChannel = realm.objectForPrimaryKey('Channel', channelId);
    const realmChannelMember = realm.objectForPrimaryKey('ChannelMember', `${channelId}-${currentUserId}`);
    const realmTeamMember = realm.objectForPrimaryKey('TeamMember', `${realmChannel.team?.id}-${currentUserId}`);

    if (realmChannelMember) {
        const channelMemberMsgCount = realmChannelMember.msgCount;
        const channelMemberMentionCount = realmChannelMember.mentionCount;

        realmChannelMember.msgCount = realmChannel.totalMsgCount;
        realmChannelMember.mentionCount = 0;

        if (realmTeamMember) {
            const teamMemberMsgCount = realmTeamMember.msgCount;
            const teamMemberMentionCount = realmTeamMember.mentionCount;

            realmTeamMember.msgCount = Math.max(teamMemberMsgCount - channelMemberMsgCount, 0);
            realmTeamMember.mentionCount = Math.max(teamMemberMentionCount - channelMemberMentionCount, 0);
        }

        if (setLastViewed) {
            realmChannelMember.lastViewAt = Date.now();
        }
    }
}

function channels(realm, action) {
    switch (action.type) {
    case ChannelTypes.LEAVE_CHANNEL: {
        const data = action.data || action.payload;
        const member = realm.objectForPrimaryKey('ChannelMember', `${data.id}-${data.userId}`);

        if (member) {
            realm.delete(member);
        }
        break;
    }

    case ChannelTypes.RECEIVED_MY_CHANNELS: {
        const data = action.data || action.payload;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const user = realm.objectForPrimaryKey('User', general?.currentUserId);

        if (user) {
            const channelMembersMap = mapUserChannelMembership(data, user);

            // Remove all memberships from channel if needed
            removeChannelMembershipsIfNeeded(realm, channelMembersMap);

            if (data.channels?.length) {
                data.channels.forEach((channelData) => {
                    const myMembers = channelMembersMap.get(channelData.id) || [];
                    storeChannelAndMember(realm, channelData, myMembers[0]);
                });
            }
        }
        break;
    }

    case ChannelTypes.RECEIVED_CHANNEL_STATS: {
        const data = action.data || action.payload;

        const channel = realm.objectForPrimaryKey('Channel', data.channel_id);
        if (channel) {
            channel.memberCount = data.member_count;
            channel.guestCount = data.guest_count;
            channel.pinnedCount = data.pinnedpost_count;
        }
        break;
    }

    case ChannelTypes.RECEIVED_CHANNEL_AND_MEMBER: {
        const data = action.data || action.payload;
        const {member, channel} = data;

        if (member) {
            const user = realm.objectForPrimaryKey('User', member.user_id);

            if (user) {
                member.user = user;
                storeChannelAndMember(realm, channel, channelMemberDataToRealm(member));
            }
        }

        break;
    }

    case ChannelTypes.CREATE_DIRECT_CHANNEL: {
        const data = action.data || action.payload;
        const {channel, members} = data;

        if (members?.length) {
            members.forEach((member) => {
                const user = realm.objectForPrimaryKey('User', member.user_id);

                if (user) {
                    member.user = user;
                    storeChannelAndMember(realm, channel, channelMemberDataToRealm(member));
                }
            });
        }
        break;
    }

    case ChannelTypes.RECEIVED_CHANNELS: {
        const data = action.data || action.payload;

        if (data.channels?.length) {
            data.channels.forEach((channel) => {
                const channelRealm = realm.objectForPrimaryKey('Channel', channel.id);
                if (!channelRealm || channel.update_at !== channelRealm.updateAt) {
                    storeChannel(realm, channel);
                }
            });
        }

        break;
    }

    case ChannelTypes.RECEIVED_CHANNEL: {
        const channel = action.data || action.payload;
        const channelRealm = realm.objectForPrimaryKey('Channel', channel.id);

        if (!channelRealm || channel.update_at !== channelRealm.updateAt) {
            storeChannel(realm, channel);
        }

        break;
    }

    case ChannelTypes.DELETED_CHANNEL: {
        const channel = action.data || action.payload;
        const channelRealm = realm.objectForPrimaryKey('Channel', channel.id);

        if (channelRealm) {
            channelRealm.deleteAt = Date.now();
        }
        break;
    }

    case ChannelTypes.RECEIVED_CHANNEL_PROPS: {
        const data = action.data || action.payload;
        const channelMember = realm.objectForPrimaryKey('ChannelMember', `${data.id}-${data.userId}`);

        if (channelMember) {
            channelMember.notifyProps = JSON.stringify(data.notifyProps);
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

        updateChannelUnreadCounts(realm, general.currentUserId, nextChannel.id, nextChannel.setLastViewed);

        if (previousChannel.id && previousChannel.id !== nextChannel.id) {
            updateChannelUnreadCounts(realm, general.currentUserId, previousChannel.id, true);
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
