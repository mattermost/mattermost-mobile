// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';
import {ChannelTypes, UserTypes, SchemeTypes, GroupTypes} from '@mm-redux/action_types';
import {General} from '../../constants';
import {GenericAction} from '@mm-redux/types/actions';
import {Channel, ChannelMembership, ChannelStats} from '@mm-redux/types/channels';
import {RelationOneToMany, RelationOneToOne, IDMappedObjects, UserIDMappedObjects} from '@mm-redux/types/utilities';
import {Team} from '@mm-redux/types/teams';

function removeMemberFromChannel(state: RelationOneToOne<Channel, UserIDMappedObjects<ChannelMembership>>, channelId: string, userId: string) {
    const members = state[channelId] || {};
    Reflect.deleteProperty(members, userId);
    return {
        ...state,
        [channelId]: members,
    };
}

function removeMemberFromChannels(state: RelationOneToOne<Channel, UserIDMappedObjects<ChannelMembership>>, userId: string) {
    const nextState = {...state};
    Object.keys(state).forEach((channel) => {
        delete nextState[channel][userId];
    });
    return nextState;
}

function channelListToSet(state: any, action: GenericAction) {
    const nextState = {...state};

    action.data.forEach((channel: Channel) => {
        const nextSet = new Set(nextState[channel.team_id]);
        nextSet.add(channel.id);
        nextState[channel.team_id] = nextSet;
    });

    return nextState;
}

function removeChannelFromSet(state: any, channelId: string, teamId: string) {
    const nextSet = new Set(state[teamId]);
    nextSet.delete(channelId);
    return {
        ...state,
        [teamId]: nextSet,
    };
}

function currentChannelId(state = '', action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.SELECT_CHANNEL:
        return action.data;
    default:
        return state;
    }
}

function channels(state: IDMappedObjects<Channel> = {}, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL:
        if (state[action.data.id] && action.data.type === General.DM_CHANNEL) {
            action.data.display_name = action.data.display_name || state[action.data.id].display_name;
        }
        return {
            ...state,
            [action.data.id]: action.data,
        };
    case ChannelTypes.RECEIVED_CHANNELS:
    case ChannelTypes.RECEIVED_ALL_CHANNELS:
    case SchemeTypes.RECEIVED_SCHEME_CHANNELS: {
        const nextState = {...state};

        for (const channel of action.data) {
            if (state[channel.id] && channel.type === General.DM_CHANNEL) {
                channel.display_name = channel.display_name || state[channel.id].display_name;
            }
            nextState[channel.id] = channel;
        }
        return nextState;
    }
    case ChannelTypes.RECEIVED_CHANNEL_DELETED: {
        const {id, deleteAt} = action.data;

        if (!state[id]) {
            return state;
        }

        return {
            ...state,
            [id]: {
                ...state[id],
                delete_at: deleteAt,
            },
        };
    }
    case ChannelTypes.RECEIVED_CHANNEL_UNARCHIVED: {
        const {id} = action.data;

        if (!state[id]) {
            return state;
        }

        return {
            ...state,
            [id]: {
                ...state[id],
                delete_at: 0,
            },
        };
    }
    case ChannelTypes.UPDATE_CHANNEL_HEADER: {
        const {channelId, header} = action.data;

        if (!state[channelId]) {
            return state;
        }

        return {
            ...state,
            [channelId]: {
                ...state[channelId],
                header,
            },
        };
    }
    case ChannelTypes.UPDATE_CHANNEL_PURPOSE: {
        const {channelId, purpose} = action.data;

        if (!state[channelId]) {
            return state;
        }

        return {
            ...state,
            [channelId]: {
                ...state[channelId],
                purpose,
            },
        };
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const {id, type} = action.data;
        if (type === General.PRIVATE_CHANNEL) {
            const nextState = {...state};
            Reflect.deleteProperty(nextState, id);
            return nextState;
        }
        return state;
    }
    case ChannelTypes.INCREMENT_TOTAL_MSG_COUNT: {
        const {channelId, amount} = action.data;
        const channel = state[channelId];

        if (!channel) {
            return state;
        }

        return {
            ...state,
            [channelId]: {
                ...channel,
                total_msg_count: channel.total_msg_count + amount,
            },
        };
    }
    case ChannelTypes.UPDATED_CHANNEL_SCHEME: {
        const {channelId, schemeId} = action.data;
        const channel = state[channelId];

        if (!channel) {
            return state;
        }

        return {...state, [channelId]: {...channel, scheme_id: schemeId}};
    }

    case ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS: { // Used by the mobile app
        const nextState = {...state};
        const myChannels: Array<Channel> = action.data.channels;
        let hasNewValues = false;

        if (myChannels && myChannels.length) {
            hasNewValues = true;
            myChannels.forEach((c: Channel) => {
                nextState[c.id] = c;
            });
        }

        return hasNewValues ? nextState : state;
    }

    default:
        return state;
    }
}

function channelsInTeam(state: RelationOneToMany<Team, Channel> = {}, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL: {
        const nextSet = new Set(state[action.data.team_id]);
        nextSet.add(action.data.id);
        return {
            ...state,
            [action.data.team_id]: nextSet,
        };
    }
    case ChannelTypes.RECEIVED_CHANNELS: {
        return channelListToSet(state, action);
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const {id, type, team_id} = action.data;
        if (type === General.PRIVATE_CHANNEL) {
            return removeChannelFromSet(state, id, team_id);
        }
        return state;
    }
    case ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS: { // Used by the mobile app
        const values: GenericAction = {
            type: action.type,
            teamId: action.data.teamId,
            sync: action.data.sync,
            data: action.data.channels,
        };
        return channelListToSet(state, values);
    }
    default:
        return state;
    }
}

function myMembers(state: RelationOneToOne<Channel, ChannelMembership> = {}, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER: {
        const channelMember = action.data;
        return {
            ...state,
            [channelMember.channel_id]: channelMember,
        };
    }
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS: {
        const nextState: any = {...state};

        const removeChannelIds = action.removeChannelIds as string[];
        if (removeChannelIds) {
            removeChannelIds.forEach((channelId: string) => {
                Reflect.deleteProperty(nextState, channelId);
            });
        }

        for (const cm of action.data) {
            nextState[cm.channel_id] = cm;
        }

        return nextState;
    }
    case ChannelTypes.RECEIVED_CHANNEL_PROPS: {
        const member = {...state[action.data.channel_id]};
        member.notify_props = action.data.notifyProps;

        return {
            ...state,
            [action.data.channel_id]: member,
        };
    }
    case ChannelTypes.INCREMENT_UNREAD_MSG_COUNT: {
        const {channel, amount, onlyMentions} = action.data;
        const member = state[channel.id];

        if (!member) {
            // Don't keep track of unread posts until we've loaded the actual channel member
            return state;
        }

        if (!onlyMentions) {
            // Incrementing the msg_count marks the channel as read, so don't do that if these posts should be unread
            return state;
        }

        return {
            ...state,
            [channel.id]: {
                ...member,
                msg_count: member.msg_count + amount,
            },
        };
    }
    case ChannelTypes.DECREMENT_UNREAD_MSG_COUNT: {
        const {channel, amount} = action.data;

        const member = state[channel.id];

        if (!member) {
            // Don't keep track of unread posts until we've loaded the actual channel member
            return state;
        }

        return {
            ...state,
            [channel.id]: {
                ...member,
                msg_count: member.msg_count + amount,
            },
        };
    }
    case ChannelTypes.INCREMENT_UNREAD_MENTION_COUNT: {
        const {channel, amount} = action.data;
        const member = state[channel.id];

        if (!member) {
            // Don't keep track of unread posts until we've loaded the actual channel member
            return state;
        }

        return {
            ...state,
            [channel.id]: {
                ...member,
                mention_count: member.mention_count + amount,
            },
        };
    }
    case ChannelTypes.DECREMENT_UNREAD_MENTION_COUNT: {
        const {channel, amount} = action.data;
        const member = state[channel.id];

        if (!member) {
            // Don't keep track of unread posts until we've loaded the actual channel member
            return state;
        }

        return {
            ...state,
            [channel.id]: {
                ...member,
                mention_count: Math.max(member.mention_count - amount, 0),
            },
        };
    }
    case ChannelTypes.RECEIVED_LAST_VIEWED_AT: {
        const {data} = action;
        let member = state[data.channel_id];

        member = {
            ...member,
            last_viewed_at: data.last_viewed_at,
        };

        return {
            ...state,
            [action.data.channel_id]: member,
        };
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const nextState = {...state};
        const {id} = action.data;
        if (id) {
            Reflect.deleteProperty(nextState, id);
            return nextState;
        }

        return state;
    }
    case ChannelTypes.POST_UNREAD_SUCCESS: {
        const data = action.data;
        const channelState = state[data.channelId];

        if (!channelState) {
            return state;
        }
        return {...state, [data.channelId]: {...channelState, msg_count: data.msgCount, mention_count: data.mentionCount, last_viewed_at: data.lastViewedAt}};
    }

    case ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS: { // Used by the mobile app
        const nextState: any = {...state};
        const current = Object.values(nextState);
        const {sync, channelMembers} = action.data;
        let hasNewValues = channelMembers && channelMembers.length > 0;

        // Remove existing channel memberships when the user is no longer a member
        if (sync) {
            current.forEach((member: ChannelMembership) => {
                const id = member.channel_id;
                if (channelMembers.find((cm: ChannelMembership) => cm.channel_id === id)) {
                    delete nextState[id];
                    hasNewValues = true;
                }
            });
        }

        if (hasNewValues) {
            channelMembers.forEach((cm: ChannelMembership) => {
                const id: string = cm.channel_id;
                nextState[id] = cm;
            });

            return nextState;
        }

        return state;
    }

    default:
        return state;
    }
}

function membersInChannel(state: RelationOneToOne<Channel, UserIDMappedObjects<ChannelMembership>> = {}, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER:
    case ChannelTypes.RECEIVED_CHANNEL_MEMBER: {
        const member = action.data;
        const members = {...(state[member.channel_id] || {})};
        members[member.user_id] = member;
        return {
            ...state,
            [member.channel_id]: members,
        };
    }
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS:
    case ChannelTypes.RECEIVED_CHANNEL_MEMBERS: {
        const nextState = {...state};

        const removeChannelIds = action.removeChannelIds as string[];
        const currentUserId = action.currentUserId;
        if (removeChannelIds && currentUserId) {
            removeChannelIds.forEach((channelId) => {
                if (nextState[channelId]) {
                    Reflect.deleteProperty(nextState[channelId], currentUserId);
                }
            });
        }

        for (const cm of action.data) {
            if (nextState[cm.channel_id]) {
                nextState[cm.channel_id] = {...nextState[cm.channel_id]};
            } else {
                nextState[cm.channel_id] = {};
            }
            nextState[cm.channel_id][cm.user_id] = cm;
        }
        return nextState;
    }

    case UserTypes.PROFILE_NO_LONGER_VISIBLE:
        const {user_id: userId} = action.data;
        return removeMemberFromChannels(state, userId);

    case ChannelTypes.LEAVE_CHANNEL: {
        const {id, user_id} = action.data;
        return removeMemberFromChannel(state, id, user_id);
    }
    case UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL: {
        const {id: channelId, user_id: userId} = action.data;
        return removeMemberFromChannel(state, channelId, userId);
    }
    default:
        return state;
    }
}

function stats(state: RelationOneToOne<Channel, ChannelStats> = {}, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL_STATS: {
        const nextState = {...state};
        const stat = action.data;
        nextState[stat.channel_id] = stat;

        return nextState;
    }
    case ChannelTypes.ADD_CHANNEL_MEMBER_SUCCESS: {
        const nextState = {...state};
        const id = action.id;
        const nextStat = nextState[id];
        if (nextStat) {
            const count = nextStat.member_count + 1;
            return {
                ...nextState,
                [id]: {
                    ...nextStat,
                    member_count: count,
                },
            };
        }

        return state;
    }
    case ChannelTypes.REMOVE_CHANNEL_MEMBER_SUCCESS: {
        const nextState = {...state};
        const id = action.id;
        const nextStat = nextState[id];
        if (nextStat) {
            const count = nextStat.member_count - 1;
            return {
                ...nextState,
                [id]: {
                    ...nextStat,
                    member_count: count || 1,
                },
            };
        }

        return state;
    }
    case ChannelTypes.INCREMENT_PINNED_POST_COUNT: {
        const nextState = {...state};
        const id = action.id;
        const nextStat = nextState[id];
        if (nextStat) {
            const count = nextStat.pinnedpost_count + 1;
            return {
                ...nextState,
                [id]: {
                    ...nextStat,
                    pinnedpost_count: count,
                },
            };
        }

        return state;
    }
    case ChannelTypes.DECREMENT_PINNED_POST_COUNT: {
        const nextState = {...state};
        const id = action.id;
        const nextStat = nextState[id];
        if (nextStat) {
            const count = nextStat.pinnedpost_count - 1;
            return {
                ...nextState,
                [id]: {
                    ...nextStat,
                    pinnedpost_count: count,
                },
            };
        }

        return state;
    }
    default:
        return state;
    }
}

function groupsAssociatedToChannel(state: any = {}, action: GenericAction) {
    switch (action.type) {
    case GroupTypes.RECEIVED_GROUPS_ASSOCIATED_TO_CHANNEL: {
        const {channelID, groups, totalGroupCount} = action.data;
        const nextState = {...state};
        const associatedGroupIDs = new Set<string>([]);
        for (const group of groups) {
            associatedGroupIDs.add(group.id);
        }
        nextState[channelID] = {ids: Array.from(associatedGroupIDs), totalCount: totalGroupCount};
        return nextState;
    }
    case GroupTypes.RECEIVED_ALL_GROUPS_ASSOCIATED_TO_CHANNEL: {
        const {channelID, groups} = action.data;
        const nextState = {...state};
        const associatedGroupIDs = new Set<string>([]);
        for (const group of groups) {
            associatedGroupIDs.add(group.id);
        }
        const ids = Array.from(associatedGroupIDs);
        nextState[channelID] = {ids, totalCount: ids.length};
        return nextState;
    }
    case GroupTypes.RECEIVED_GROUPS_NOT_ASSOCIATED_TO_CHANNEL: {
        const {channelID, groups} = action.data;
        const nextState = {...state};
        const associatedGroupIDs = new Set(state[channelID] ? state[channelID].ids : []);
        for (const group of groups) {
            associatedGroupIDs.delete(group.id);
        }
        nextState[channelID] = Array.from(associatedGroupIDs);
        return nextState;
    }
    default:
        return state;
    }
}

function totalCount(state = 0, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_TOTAL_CHANNEL_COUNT: {
        return action.data;
    }
    default:
        return state;
    }
}

export function manuallyUnread(state: RelationOneToOne<Channel, boolean> = {}, action: GenericAction) {
    switch (action.type) {
    case ChannelTypes.REMOVE_MANUALLY_UNREAD: {
        if (state[action.data.channelId]) {
            const newState = {...state};
            delete newState[action.data.channelId];
            return newState;
        }
        return state;
    }
    case ChannelTypes.ADD_MANUALLY_UNREAD:
    case ChannelTypes.POST_UNREAD_SUCCESS: {
        return {...state, [action.data.channelId]: true};
    }
    default:
        return state;
    }
}

export default combineReducers({

    // the current selected channel
    currentChannelId,

    // object where every key is the channel id and has and object with the channel detail
    channels,

    // object where every key is a team id and has set of channel ids that are on the team
    channelsInTeam,

    // object where every key is the channel id and has an object with the channel members detail
    myMembers,

    // object where every key is the channel id with an object where key is a user id and has an object with the channel members detail
    membersInChannel,

    // object where every key is the channel id and has an object with the channel stats
    stats,

    groupsAssociatedToChannel,

    totalCount,

    // object where every key is the channel id, if present means a user requested to mark that channel as unread.
    manuallyUnread,
});
