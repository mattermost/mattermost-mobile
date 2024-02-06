// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Database, Model, Q, Query, Relation} from '@nozbe/watermelondb';
import {of as of$, Observable} from 'rxjs';
import {map as map$, switchMap, distinctUntilChanged} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES} from '@constants/database';
import {sanitizeLikeString} from '@helpers/database';
import {hasPermission} from '@utils/role';

import {prepareDeletePost} from './post';
import {queryRoles} from './role';
import {observeCurrentChannelId, getCurrentChannelId, observeCurrentUserId} from './system';
import {observeTeammateNameDisplay} from './user';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Clause} from '@nozbe/watermelondb/QueryDescription';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL, MY_CHANNEL, CHANNEL_MEMBERSHIP, MY_CHANNEL_SETTINGS, CHANNEL_INFO, USER, TEAM}} = MM_TABLES;

export function prepareMissingChannelsForAllTeams(operator: ServerDataOperator, channels: Channel[], channelMembers: ChannelMembership[], isCRTEnabled?: boolean): Array<Promise<Model[]>> {
    const channelInfos: ChannelInfo[] = [];
    const channelMap: Record<string, Channel> = {};
    for (const c of channels) {
        channelMap[c.id] = c;
        channelInfos.push({
            id: c.id,
            header: c.header,
            purpose: c.purpose,
            guest_count: 0,
            member_count: 0,
            pinned_post_count: 0,
            files_count: 0,
        });
    }

    const memberships = channelMembers.map((cm) => {
        const channel = channelMap[cm.channel_id];
        return {
            ...cm,
            id: cm.channel_id,
            last_post_at: channel.last_post_at,
            last_root_post_at: channel.last_root_post_at,
        };
    });

    try {
        const channelRecords = operator.handleChannel({channels, prepareRecordsOnly: true});
        const channelInfoRecords = operator.handleChannelInfo({channelInfos, prepareRecordsOnly: true});
        const membershipRecords = operator.handleChannelMembership({channelMemberships: memberships, prepareRecordsOnly: true});
        const myChannelRecords = operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true, isCRTEnabled});
        const myChannelSettingsRecords = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return [];
    }
}

export const prepareMyChannelsForTeam = async (operator: ServerDataOperator, teamId: string, channels: Channel[], channelMembers: ChannelMembership[], isCRTEnabled?: boolean) => {
    const {database} = operator;

    const channelsQuery = queryAllChannelsForTeam(database, teamId);
    const allChannelsForTeam = (await channelsQuery.fetch()).
        reduce((map: Record<string, ChannelModel>, channel) => {
            map[channel.id] = channel;
            return map;
        }, {});

    const channelInfosQuery = queryAllChannelsInfoForTeam(database, teamId);
    const allChannelsInfoForTeam = (await channelInfosQuery.fetch()).
        reduce((map: Record<string, ChannelInfoModel>, info) => {
            map[info.id] = info;
            return map;
        }, {});

    const channelInfos: ChannelInfo[] = [];
    const memberships = channelMembers.map((cm) => {
        return {...cm, id: cm.channel_id};
    });

    for (const c of channels) {
        const storedChannel = allChannelsForTeam[c.id];
        let storedInfo: ChannelInfoModel | undefined;
        let member_count = 0;
        let guest_count = 0;
        let pinned_post_count = 0;
        let files_count = 0;
        if (storedChannel) {
            storedInfo = allChannelsInfoForTeam[c.id];
            if (storedInfo) {
                member_count = storedInfo.memberCount;
                guest_count = storedInfo.guestCount;
                pinned_post_count = storedInfo.pinnedPostCount;
                files_count = storedInfo.filesCount;
            }
        }

        channelInfos.push({
            id: c.id,
            header: c.header,
            purpose: c.purpose,
            guest_count,
            member_count,
            pinned_post_count,
            files_count,
        });
    }

    try {
        const channelRecords = operator.handleChannel({channels, prepareRecordsOnly: true});
        const channelInfoRecords = operator.handleChannelInfo({channelInfos, prepareRecordsOnly: true});
        const membershipRecords = operator.handleChannelMembership({channelMemberships: channelMembers, prepareRecordsOnly: true});
        const myChannelRecords = operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true, isCRTEnabled});
        const myChannelSettingsRecords = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return [];
    }
};

export const prepareDeleteChannel = async (channel: ChannelModel): Promise<Model[]> => {
    const preparedModels: Model[] = [channel.prepareDestroyPermanently()];

    const relations: Array<Relation<Model|MyChannelModel> | undefined> = [channel.membership, channel.info, channel.categoryChannel];
    await Promise.all(relations.map(async (relation) => {
        try {
            const model = await relation?.fetch();
            if (model) {
                preparedModels.push(model.prepareDestroyPermanently());
                if ('settings' in model) {
                    const settings = await model.settings?.fetch();
                    if (settings) {
                        preparedModels.push(settings.prepareDestroyPermanently());
                    }
                }
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

export const queryAllChannels = (database: Database) => {
    return database.get<ChannelModel>(CHANNEL).query();
};

export const queryAllChannelsForTeam = (database: Database, teamId: string) => {
    return database.get<ChannelModel>(CHANNEL).query(Q.where('team_id', teamId));
};

export const queryAllChannelsInfo = (database: Database) => {
    return database.get<ChannelInfoModel>(CHANNEL_INFO).query();
};

export const queryAllChannelsInfoForTeam = (database: Database, teamId: string) => {
    return database.get<ChannelInfoModel>(CHANNEL_INFO).query(
        Q.on(CHANNEL, Q.where('team_id', teamId)),
    );
};

export const queryAllMyChannel = (database: Database) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query();
};

export const queryAllMyChannelsForTeam = (database: Database, teamId: string) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(CHANNEL, Q.where('team_id', Q.oneOf([teamId, '']))),
    );
};

export const queryAllUnreadDMsAndGMsIds = (database: Database) => {
    return database.get<ChannelModel>(CHANNEL).query(
        Q.on(MY_CHANNEL, Q.or(
            Q.where('mentions_count', Q.gt(0)),
            Q.where('message_count', Q.gt(0)),
        )),
        Q.where('type', Q.oneOf([General.GM_CHANNEL, General.DM_CHANNEL])),
    );
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

export const observeMyChannelRoles = (database: Database, channelId: string) => {
    return observeMyChannel(database, channelId).pipe(
        switchMap((v) => of$(v?.roles)),
        distinctUntilChanged(),
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

export const getChannelByName = async (database: Database, teamId: string, channelName: string) => {
    const clauses: Clause[] = [];
    if (teamId) {
        clauses.push(Q.on(TEAM, 'id', teamId));
    }
    clauses.push(Q.where('name', channelName));
    const channels = await database.get<ChannelModel>(CHANNEL).query(...clauses).fetch();

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

export const getDefaultChannelForTeam = async (database: Database, teamId: string, ignoreId?: string) => {
    let channel: ChannelModel|undefined;
    let canIJoinPublicChannelsInTeam = false;
    const roles = await queryRoles(database).fetch();

    if (roles.length) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS);
    }

    const clauses = [
        Q.where('team_id', teamId),
        Q.where('delete_at', Q.eq(0)),
        Q.where('type', General.OPEN_CHANNEL),
    ];

    if (ignoreId) {
        clauses.push(Q.where('channel_id', Q.notEq(ignoreId)));
    }

    const myChannels = await database.get<ChannelModel>(CHANNEL).query(
        Q.on(MY_CHANNEL, 'id', Q.notEq('')),
        Q.and(...clauses),
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
        const {database} = operator;
        const channelMembership = await database.get<ChannelMembershipModel>(CHANNEL_MEMBERSHIP).query(Q.where('user_id', Q.eq(userId)), Q.where('channel_id', Q.eq(channelId))).fetch();
        const models: Model[] = [];
        for (const membership of channelMembership) {
            models.push(membership.prepareDestroyPermanently());
        }
        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models, 'deleteChannelMembership');
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
    const result = channelsId.reduce((r: Record<string, number>, cId) => {
        r[cId] = 0;
        return r;
    }, {});
    const q = await database.get<ChannelMembershipModel>(CHANNEL_MEMBERSHIP).query(Q.where('channel_id', Q.oneOf(channelsId))).fetch();
    return q.reduce((r: Record<string, number>, m) => {
        if (r[m.channelId]) {
            r[m.channelId] += 1;
            return r;
        }

        r[m.channelId] = 1;
        return r;
    }, result);
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
    const conditions: Q.Where[] = [Q.where('team_id', Q.eq(teamId))];
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

export const queryAllMyChannelSettings = (database: Database) => {
    return database.get<MyChannelSettingsModel>(MY_CHANNEL_SETTINGS).query();
};

export const queryMyChannelSettingsByIds = (database: Database, ids: string[]) => {
    return database.get<MyChannelSettingsModel>(MY_CHANNEL_SETTINGS).
        query(
            Q.where('id', Q.oneOf(ids)),
        );
};

export const observeAllMyChannelNotifyProps = (database: Database) => {
    return queryAllMyChannelSettings(database).observeWithColumns(['notify_props']).pipe(
        map$((settings) => settings.reduce<Record<string, Partial<ChannelNotifyProps>>>((obj, setting) => {
            obj[setting.id] = setting.notifyProps;
            return obj;
        }, {})),
    );
};

export const observeNotifyPropsByChannels = (database: Database, channels: ChannelModel[]|MyChannelModel[]) => {
    const ids = channels.map((c) => c.id);
    return queryMyChannelSettingsByIds(database, ids).observeWithColumns(['notify_props']).pipe(
        map$((settings) => settings.reduce<Record<string, Partial<ChannelNotifyProps>>>((obj, setting) => {
            obj[setting.id] = setting.notifyProps;
            return obj;
        }, {})),
    );
};

export const queryMyChannelUnreads = (database: Database, currentTeamId: string) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(
            CHANNEL,
            Q.and(
                Q.or(
                    Q.where('team_id', Q.eq(currentTeamId)),
                    Q.where('team_id', Q.eq('')),
                ),
                Q.where('delete_at', Q.eq(0)),
            ),
        ),
        Q.or(
            Q.where('is_unread', Q.eq(true)),
            Q.where('mentions_count', Q.gte(0)),
        ),
        Q.sortBy('last_post_at', Q.desc),
    );
};

export function observeMyChannelMentionCount(database: Database, teamId?: string, columns = ['mentions_count', 'is_unread']): Observable<number> {
    const conditions: Q.Where[] = [
        Q.where('delete_at', Q.eq(0)),
    ];

    if (teamId) {
        conditions.push(Q.where('team_id', Q.eq(teamId)));
    }

    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(CHANNEL, Q.and(
            ...conditions,
        )),
        Q.on(MY_CHANNEL_SETTINGS, Q.where('notify_props', Q.notLike('%"mark_unread":"mention"%'))),
    ).
        observeWithColumns(columns).
        pipe(
            switchMap((val) => of$(val.reduce((acc, v) => {
                return acc + v.mentionsCount;
            }, 0))),
            distinctUntilChanged(),
        );
}

export function queryMyRecentChannels(database: Database, take: number) {
    const count: Q.Clause[] = [];

    if (take > 0) {
        count.push(Q.take(take));
    }

    return queryAllMyChannel(database).extend(
        Q.on(CHANNEL, Q.where('delete_at', Q.eq(0))),
        Q.sortBy('last_viewed_at', Q.desc),
        ...count,
    );
}

export const observeDirectChannelsByTerm = (database: Database, term: string, take = 20, matchStart = false) => {
    const onlyDMs = term.startsWith('@') ? "AND c.type='D'" : '';
    const value = sanitizeLikeString(term.startsWith('@') ? term.substring(1) : term);
    let username = `u.username LIKE '${value}%'`;
    let displayname = `c.display_name LIKE '${value}%'`;
    if (!matchStart) {
        username = `u.username LIKE '%${value}%' AND u.username NOT LIKE '${value}%'`;
        displayname = `(c.display_name LIKE '%${value}%' AND c.display_name NOT LIKE '${value}%')`;
    }
    const currentUserId = observeCurrentUserId(database);
    return currentUserId.pipe(
        switchMap((uId) => {
            return database.get<MyChannelModel>(MY_CHANNEL).query(
                Q.unsafeSqlQuery(`SELECT DISTINCT my.* FROM ${MY_CHANNEL} my
                INNER JOIN ${CHANNEL} c ON c.id=my.id AND c.team_id='' AND c.delete_at=0 ${onlyDMs}
                INNER JOIN ${CHANNEL_MEMBERSHIP} cm ON cm.channel_id=my.id
                LEFT JOIN ${USER} u ON u.id=cm.user_id AND (CASE WHEN c.type = 'D' THEN cm.user_id != '${uId}' ELSE 1 END)
                WHERE ${displayname} OR CASE WHEN c.type = 'G' THEN 0 ELSE ${username} END
                ORDER BY CASE c.type WHEN 'D' THEN 0 ELSE 1 END ASC, my.last_viewed_at DESC
                LIMIT ${take}`),
            ).observe();
        }),
    );
};

export const observeNotDirectChannelsByTerm = (database: Database, term: string, take = 20, matchStart = false) => {
    const teammateNameSetting = observeTeammateNameDisplay(database);

    const value = sanitizeLikeString(term.startsWith('@') ? term.substring(1) : term);
    let username = `u.username LIKE '${value}%'`;
    let nickname = `u.nickname LIKE '${value}%'`;
    let displayname = `(u.first_name || ' ' || u.last_name) LIKE '${value}%'`;
    if (!matchStart) {
        username = `(u.username LIKE '%${value}%' AND u.username NOT LIKE '${value}%')`;
        nickname = `(u.nickname LIKE '%${value}%' AND u.nickname NOT LIKE '${value}%')`;
        displayname = `((u.first_name || ' ' || u.last_name) LIKE '%${value}%' AND (u.first_name || ' ' || u.last_name) NOT LIKE '${value}%')`;
    }

    return teammateNameSetting.pipe(
        switchMap((setting) => {
            let sortBy = '';
            switch (setting) {
                case General.TEAMMATE_NAME_DISPLAY.SHOW_NICKNAME_FULLNAME:
                    sortBy = "ORDER BY CASE u.nickname WHEN '' THEN 1 ELSE 0 END, CASE (u.first_name || ' ' || u.last_name) WHEN '' THEN 1 ELSE 0 END, u.username";
                    break;
                case General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME:
                    sortBy = "ORDER BY CASE (u.first_name || ' ' || u.last_name) WHEN '' THEN 1 ELSE 0 END, u.username";
                    break;
                default:
                    sortBy = 'ORDER BY u.username';
                    break;
            }

            return database.get<UserModel>(USER).query(
                Q.unsafeSqlQuery(`SELECT DISTINCT u.* FROM User u
                LEFT JOIN ChannelMembership cm ON cm.user_id=u.id
                LEFT JOIN Channel c ON c.id=cm.id AND c.type='${General.DM_CHANNEL}'
                WHERE cm.user_id IS NULL AND (${displayname} OR ${username} OR ${nickname}) AND u.delete_at=0
                ${sortBy} LIMIT ${take}`),
            ).observe();
        }),
    );
};

export const observeJoinedChannelsByTerm = (database: Database, term: string, take = 20, matchStart = false) => {
    if (term.startsWith('@')) {
        return of$([]);
    }

    const value = sanitizeLikeString(term);
    let displayname = `c.display_name LIKE '${value}%'`;
    if (!matchStart) {
        displayname = `c.display_name LIKE '%${value}%' AND c.display_name NOT LIKE '${value}%'`;
    }
    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.unsafeSqlQuery(`SELECT DISTINCT my.* FROM ${MY_CHANNEL} my
        INNER JOIN ${CHANNEL} c ON c.id=my.id AND c.delete_at=0 AND c.team_id !='' AND ${displayname}
        ORDER BY my.last_viewed_at DESC
        LIMIT ${take}`),
    ).observe();
};

export const observeArchiveChannelsByTerm = (database: Database, term: string, take = 20) => {
    if (term.startsWith('@')) {
        return of$([]);
    }

    const value = sanitizeLikeString(term);
    const displayname = `%${value}%`;
    return database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.on(CHANNEL, Q.and(
            Q.where('delete_at', Q.gt(0)),
            Q.where('team_id', Q.notEq('')),
            Q.where('display_name', Q.like(displayname)),
        )),
        Q.sortBy('last_viewed_at'),
        Q.take(take),
    ).observe();
};

export const observeChannelSettings = (database: Database, channelId: string) => {
    return database.get<MyChannelSettingsModel>(MY_CHANNEL_SETTINGS).query(Q.where('id', channelId), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const observeIsMutedSetting = (database: Database, channelId: string) => {
    return observeChannelSettings(database, channelId).pipe(switchMap((s) => of$(s?.notifyProps?.mark_unread === General.MENTION)));
};

export const observeChannelsByLastPostAt = (database: Database, myChannels: MyChannelModel[]) => {
    const ids = myChannels.map((c) => c.id);
    const idsStr = `'${ids.join("','")}'`;

    return database.get<ChannelModel>(CHANNEL).query(
        Q.unsafeSqlQuery(`SELECT DISTINCT c.* FROM ${CHANNEL} c INNER JOIN
        ${MY_CHANNEL} mc ON mc.id=c.id AND c.id IN (${idsStr})
        ORDER BY CASE mc.last_post_at WHEN 0 THEN c.create_at ELSE mc.last_post_at END DESC`),
    ).observe();
};

export const queryChannelsForAutocomplete = (database: Database, matchTerm: string, isSearch: boolean, teamId: string) => {
    const likeTerm = `%${sanitizeLikeString(matchTerm)}%`;
    const clauses: Q.Clause[] = [];
    if (isSearch) {
        clauses.push(
            Q.experimentalJoinTables([CHANNEL_MEMBERSHIP]),
            Q.experimentalNestedJoin(CHANNEL_MEMBERSHIP, USER),
        );
    }
    const orConditions: Q.Where[] = [
        Q.where('display_name', Q.like(matchTerm)),
        Q.where('name', Q.like(likeTerm)),
    ];

    if (isSearch) {
        orConditions.push(
            Q.and(
                Q.where('type', Q.oneOf([General.DM_CHANNEL, General.GM_CHANNEL])),
                Q.on(CHANNEL_MEMBERSHIP, Q.on(USER,
                    Q.or(
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore: condition type error
                        Q.unsafeSqlExpr(`first_name || ' ' || last_name LIKE '${likeTerm}'`),
                        Q.where('nickname', Q.like(likeTerm)),
                        Q.where('email', Q.like(likeTerm)),
                        Q.where('username', Q.like(likeTerm)),
                    ),
                )),
            ),
        );
    }

    const teamsToSearch = [teamId];
    if (isSearch) {
        teamsToSearch.push('');
    }

    const andConditions: Q.Where[] = [
        Q.where('team_id', Q.oneOf(teamsToSearch)),
    ];
    if (!isSearch) {
        andConditions.push(
            Q.where('type', Q.oneOf([General.OPEN_CHANNEL, General.PRIVATE_CHANNEL])),
            Q.where('delete_at', 0),
        );
    }

    clauses.push(
        ...andConditions,
        Q.or(...orConditions),
        Q.sortBy('display_name', Q.asc),
        Q.sortBy('name', Q.asc),
        Q.take(25),
    );

    return database.get<ChannelModel>(CHANNEL).query(...clauses);
};

export const queryChannelMembers = (database: Database, channelId: string) => {
    return database.get<ChannelMembershipModel>(CHANNEL_MEMBERSHIP).query(
        Q.where('channel_id', channelId),
    );
};

export const observeChannelMembers = (database: Database, channelId: string) => {
    return queryChannelMembers(database, channelId).observe();
};
