// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query, Relation} from '@nozbe/watermelondb';
import {of as of$, Observable} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES} from '@constants/database';
import {hasPermission} from '@utils/role';

import {prepareDeletePost} from './post';
import {queryRoles} from './role';
import {observeCurrentChannelId, getCurrentChannelId} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL, MY_CHANNEL, CHANNEL_MEMBERSHIP, MY_CHANNEL_SETTINGS, CHANNEL_INFO, USER}} = MM_TABLES;

export function prepareMissingChannelsForAllTeams(operator: ServerDataOperator, channels: Channel[], channelMembers: ChannelMembership[]): Array<Promise<Model[]>> {
    const channelInfos: ChannelInfo[] = [];
    const memberships = channelMembers.map((cm) => ({...cm, id: cm.channel_id}));

    for (const c of channels) {
        channelInfos.push({
            id: c.id,
            header: c.header,
            purpose: c.purpose,
            guest_count: 0,
            member_count: 0,
            pinned_post_count: 0,
        });
    }

    try {
        const channelRecords = operator.handleChannel({channels, prepareRecordsOnly: true});
        const channelInfoRecords = operator.handleChannelInfo({channelInfos, prepareRecordsOnly: true});
        const membershipRecords = operator.handleChannelMembership({channelMemberships: memberships, prepareRecordsOnly: true});
        const myChannelRecords = operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true});
        const myChannelSettingsRecords = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return [];
    }
}

type MembershipWithId = ChannelMembership & {id: string};

type MembershipReduce = {
    memberships: MembershipWithId[];
    membershipsMap: Record<string, MembershipWithId>;
}

export const prepareMyChannelsForTeam = async (operator: ServerDataOperator, teamId: string, channels: Channel[], channelMembers: ChannelMembership[]) => {
    const {database} = operator;
    const allChannelsForTeam = (await queryAllChannelsForTeam(database, teamId).fetch()).
        reduce((map: Record<string, ChannelModel>, channel) => {
            map[channel.id] = channel;
            return map;
        }, {});

    const allChannelsInfoForTeam = (await queryAllChannelsInfoForTeam(database, teamId).fetch()).
        reduce((map: Record<string, ChannelInfoModel>, info) => {
            map[info.id] = info;
            return map;
        }, {});

    const channelInfos: ChannelInfo[] = [];
    const {memberships, membershipsMap} = channelMembers.reduce((result, cm) => {
        const value = {...cm, id: cm.channel_id};
        result.memberships.push(value);
        result.membershipsMap[value.id] = value;
        return result;
    }, {memberships: [], membershipsMap: {}} as MembershipReduce);

    for (const c of channels) {
        const storedChannel = allChannelsForTeam[c.id];
        let storedInfo: ChannelInfoModel | undefined;
        let member_count = 0;
        let guest_count = 0;
        let pinned_post_count = 0;
        if (storedChannel) {
            storedInfo = allChannelsInfoForTeam[c.id];
            if (storedInfo) {
                member_count = storedInfo.memberCount;
                guest_count = storedInfo.guestCount;
                pinned_post_count = storedInfo.pinnedPostCount;
            }
        }

        const member = membershipsMap[c.id];
        if (member) {
            member.last_post_at = c.last_post_at;
        }

        channelInfos.push({
            id: c.id,
            header: c.header,
            purpose: c.purpose,
            guest_count,
            member_count,
            pinned_post_count,
        });
    }

    try {
        const channelRecords = operator.handleChannel({channels, prepareRecordsOnly: true});
        const channelInfoRecords = operator.handleChannelInfo({channelInfos, prepareRecordsOnly: true});
        const membershipRecords = operator.handleChannelMembership({channelMemberships: channelMembers, prepareRecordsOnly: true});
        const myChannelRecords = operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true});
        const myChannelSettingsRecords = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return [];
    }
};

export const prepareDeleteChannel = async (channel: ChannelModel): Promise<Model[]> => {
    const preparedModels: Model[] = [channel.prepareDestroyPermanently()];

    const relations: Array<Relation<Model> | undefined> = [channel.membership, channel.info, channel.categoryChannel];
    await Promise.all(relations.map(async (relation) => {
        try {
            const model = await relation?.fetch();
            if (model) {
                preparedModels.push(model.prepareDestroyPermanently());
            }
        } catch {
            // Record not found, do nothing
        }
    }));

    const associatedChildren: Array<Query<Model> | undefined> = [
        channel.members,
        channel.drafts,
        channel.postsInChannel,
    ];
    await Promise.all(associatedChildren.map(async (children) => {
        const models = await children?.fetch();
        models?.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }));

    const posts = await channel.posts?.fetch();
    if (posts?.length) {
        for await (const post of posts) {
            const preparedPost = await prepareDeletePost(post);
            preparedModels.push(...preparedPost);
        }
    }

    return preparedModels;
};

export const queryAllChannelsForTeam = (database: Database, teamId: string) => {
    return database.get<ChannelModel>(CHANNEL).query(Q.where('team_id', teamId));
};

export const queryAllChannelsInfoForTeam = (database: Database, teamId: string) => {
    return database.get<ChannelInfoModel>(CHANNEL_INFO).query(
        Q.on(CHANNEL, Q.where('team_id', teamId)),
    );
};

export const queryAllMyChannel = (database: Database) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query();
};

export const getMyChannel = async (database: Database, channelId: string) => {
    try {
        const member = await database.get<MyChannelModel>(MY_CHANNEL).find(channelId);
        return member;
    } catch {
        return undefined;
    }
};

export const observeMyChannel = (database: Database, channelId: string) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query(Q.where('id', channelId), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const getChannelById = async (database: Database, channelId: string) => {
    try {
        const channel = await database.get<ChannelModel>(CHANNEL).find(channelId);
        return channel;
    } catch {
        return undefined;
    }
};

export const observeChannel = (database: Database, channelId: string) => {
    return database.get<ChannelModel>(CHANNEL).query(Q.where('id', channelId), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const getChannelByName = async (database: Database, channelName: string) => {
    const channels = await database.get<ChannelModel>(CHANNEL).query(Q.where('name', channelName)).fetch();

    // Check done to force types
    if (channels.length) {
        return channels[0];
    }
    return undefined;
};

export const queryChannelsById = (database: Database, channelIds: string[]) => {
    return database.get<ChannelModel>(CHANNEL).query(Q.where('id', Q.oneOf(channelIds)));
};

export const getChannelInfo = async (database: Database, channelId: string) => {
    try {
        const info = await database.get<ChannelInfoModel>(CHANNEL_INFO).find(channelId);
        return info;
    } catch {
        return undefined;
    }
};

export const getDefaultChannelForTeam = async (database: Database, teamId: string) => {
    let channel: ChannelModel|undefined;
    let canIJoinPublicChannelsInTeam = false;
    const roles = await queryRoles(database).fetch();

    if (roles.length) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS, true);
    }

    const myChannels = await database.get<ChannelModel>(CHANNEL).query(
        Q.on(MY_CHANNEL, 'id', Q.notEq('')),
        Q.and(
            Q.where('team_id', teamId),
            Q.where('delete_at', 0),
            Q.where('type', General.OPEN_CHANNEL),
        ),
        Q.sortBy('display_name', Q.asc),
    ).fetch();

    const defaultChannel = myChannels.find((c) => c.name === General.DEFAULT_CHANNEL);
    const myFirstTeamChannel = myChannels[0];

    if (defaultChannel || canIJoinPublicChannelsInTeam) {
        channel = defaultChannel;
    } else {
        channel = myFirstTeamChannel || defaultChannel;
    }

    return channel;
};

export const getCurrentChannel = async (database: Database) => {
    const currentChannelId = await getCurrentChannelId(database);
    if (currentChannelId) {
        return getChannelById(database, currentChannelId);
    }

    return undefined;
};

export const getCurrentChannelInfo = async (database: Database) => {
    const currentChannelId = await getCurrentChannelId(database);
    if (currentChannelId) {
        const info = await getChannelInfo(database, currentChannelId);
        return info;
    }

    return undefined;
};

export const observeCurrentChannel = (database: Database) => {
    return observeCurrentChannelId(database).pipe(
        switchMap((id) => database.get<ChannelModel>(CHANNEL).query(Q.where('id', id), Q.take(1)).observe().pipe(
            switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
        ),
        ));
};

export async function deleteChannelMembership(operator: ServerDataOperator, userId: string, channelId: string, prepareRecordsOnly = false) {
    try {
        const channelMembership = await operator.database.get(CHANNEL_MEMBERSHIP).query(Q.where('user_id', Q.eq(userId)), Q.where('channel_id', Q.eq(channelId))).fetch();
        const models: Model[] = [];
        for (const membership of channelMembership) {
            models.push(membership.prepareDestroyPermanently());
        }
        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models);
        }
        return {models};
    } catch (error) {
        return {error};
    }
}

export const addChannelMembership = async (operator: ServerDataOperator, userId: string, channelId: string) => {
    try {
        await operator.handleChannelMembership({channelMemberships: [{channel_id: channelId, user_id: userId}], prepareRecordsOnly: false});
        return {};
    } catch (error) {
        return {error};
    }
};

export const queryUsersOnChannel = (database: Database, channelId: string) => {
    return database.get<UserModel>(USER).query(Q.on(CHANNEL_MEMBERSHIP, Q.where('channel_id', channelId)));
};

export const getMembersCountByChannelsId = async (database: Database, channelsId: string[]) => {
    const q = await database.get<ChannelMembershipModel>(CHANNEL_MEMBERSHIP).query(Q.where('channel_id', Q.oneOf(channelsId))).fetch();
    return q.reduce((r: Record<string, number>, m) => {
        if (r[m.channelId]) {
            r[m.channelId] += 1;
            return r;
        }

        r[m.channelId] = 1;
        return r;
    }, {});
};

export const queryChannelsByTypes = (database: Database, channelTypes: ChannelType[]) => {
    return database.get<ChannelModel>(CHANNEL).query(
        Q.where('type', Q.oneOf(channelTypes)));
};

export const queryUserChannelsByTypes = (database: Database, userId: string, channelTypes: ChannelType[]) => {
    return database.get<ChannelModel>(CHANNEL).query(
        Q.where('type', Q.oneOf(channelTypes)),
        Q.on(CHANNEL_MEMBERSHIP, Q.where('user_id', userId)));
};

export const queryTeamDefaultChannel = (database: Database, teamId: string) => {
    return database.get<ChannelModel>(CHANNEL).query(
        Q.where('team_id', teamId),
        Q.where('name', General.DEFAULT_CHANNEL),
    );
};

export const queryMyChannelsByTeam = (database: Database, teamId: string, includeDeleted = false) => {
    const conditions: Q.Condition[] = [Q.where('team_id', Q.eq(teamId))];
    if (!includeDeleted) {
        conditions.push(Q.where('delete_at', Q.eq(0)));
    }
    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(CHANNEL, Q.and(
            ...conditions,
        )),
    );
};

export const observeChannelInfo = (database: Database, channelId: string) => {
    return database.get<ChannelInfoModel>(CHANNEL_INFO).query(Q.where('id', channelId), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const queryMyChannelSettingsByIds = (database: Database, ids: string[]) => {
    return database.get<MyChannelSettingsModel>(MY_CHANNEL_SETTINGS).
        query(
            Q.where('id', Q.oneOf(ids)),
        );
};

export const queryChannelsByNames = (database: Database, names: string[]) => {
    return database.get<ChannelModel>(CHANNEL).query(Q.where('name', Q.oneOf(names)));
};

export const queryMyChannelUnreads = (database: Database, currentTeamId: string) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(
            CHANNEL,
            Q.or(
                Q.where('team_id', Q.eq(currentTeamId)),
                Q.where('team_id', Q.eq('')),
            ),
        ),
        Q.where('is_unread', Q.eq(true)),
        Q.sortBy('last_post_at', Q.desc),
    );
};

export function observeMyChannelMentionCount(database: Database, teamId?: string, columns = ['mentions_count', 'is_unread']): Observable<number> {
    const conditions: Q.Condition[] = [
        Q.where('delete_at', Q.eq(0)),
    ];

    if (teamId) {
        conditions.push(Q.where('team_id', Q.eq(teamId)));
    }

    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(CHANNEL, Q.and(
            ...conditions,
        )),
    ).
        observeWithColumns(columns).
        pipe(
            switchMap((val) => of$(val.reduce((acc, v) => {
                return acc + v.mentionsCount;
            }, 0))),
            distinctUntilChanged(),
        );
}
