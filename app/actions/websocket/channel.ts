// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {inspect} from 'util';

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {
    removeCurrentUserFromChannel,
    setChannelDeleteAt,
    switchToChannel} from '@actions/local/channel';
import {fetchMyChannel} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchUsersByIds, updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {prepareMyChannelsForTeam, queryChannelsById, queryCurrentChannel, deleteChannelMembership} from '@queries/servers/channel';
import {prepareCommonSystemValues, queryConfig, setCurrentChannelId} from '@queries/servers/system';
import {queryNthLastChannelFromTeam} from '@queries/servers/team';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {isTablet} from '@utils/helpers';

// WORKS
export async function handleChannelCreatedEvent(serverUrl: string, msg: any) {
    // Do we need to fetch the posts for the channel? (should only be a system message)
    // should we only save channels if we created them??
    // msg doesn't contain enough data. go get it from the server
    // msg {"broadcast": {"channel_id": "", "omit_users": null, "team_id": "", "user_id": "34r7zpnjkbgmpez83xkq1a614c"}, "data": {"channel_id": "3hrbp7mu13f59pf18k1oppu7uc", "team_id": "sc4kmws5i38qdm4wpkzkcfiuth"}, "event": "channel_created", "seq": 3}
    //
    console.log('\n<><> -- handleChannelCreatedEvent -- <><>');
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const {team_id: teamId, channel_id: channelId} = msg.data;

    const models: Model[] = [];
    const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
    if (channels && memberships) {
        const prepare = await prepareMyChannelsForTeam(database.operator, teamId, channels, memberships);
        if (prepare) {
            const prepareModels = await Promise.all(prepare);
            const flattenedModels = prepareModels.flat();
            if (flattenedModels?.length > 0) {
                models.push(...flattenedModels);
            }
        }
    }
    database.operator.batchRecords(models);
}

// WORKS but just use handleChannelUpdatedEvent
// export async function handleChannelUnarchiveEvent(serverUrl: string, msg: any) {
//     console.log('\n<><> -- handleChannelUnarchiveEvent -- <><>');
//
//     // where is the archive WS event
//     const database = DatabaseManager.serverDatabases[serverUrl];
//     if (!database) {
//         return;
//     }
//
//     try {
//         await setChannelDeleteAt(serverUrl, msg.data.channel_id, 0);
//     } catch {
//         // do nothing
//     }
// }

// WORKS
// pinned_post_count, member_count not included with channel updated WS event
// !! see if this comes from the channelmemberupdatedevent
export async function handleChannelUpdatedEvent(serverUrl: string, msg: any) {
    console.log('\n<><> -- handleChannelUpdatedEvent -- <><>');

    // console.log('msg', msg);
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const updatedChannel = JSON.parse(msg.data.channel);
    operator.handleChannel({channels: [updatedChannel], prepareRecordsOnly: false});

    const channelInfos: ChannelInfo[] = [];

    channelInfos.push({
        id: updatedChannel.id,
        header: updatedChannel.header,
        purpose: updatedChannel.purpose,
        guest_count: 0,
        member_count: 0,
        pinned_post_count: 0,
    });

    operator.handleChannelInfo({channelInfos, prepareRecordsOnly: false});
}

// NOT NEEDED
// msg {"broadcast": {"channel_id": "", "omit_users": null, "team_id": "sc4kmws5i38qdm4wpkzkcfiuth", "user_id": ""}, "data": {"channel_id": "hdk9xk78pjyutjbm7ca9byyooh"}, "event": "channel_converted", "seq": 35
// handled by the handleChannelUpdatedEvent handler which is also
// called when convert priovate <> public
//
// export async function handleChannelConvertedEvent(serverUrl: string, msg: any) {
//     console.log('msg', msg);
//     const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
//     if (!operator) {
//         return;
//     }
//
// }

export async function handleChannelViewedEvent(serverUrl: string, msg: any) {
    // console.log('\n<><> -- handleChannelViewedEvent -- <><>');
}

// had to add a group
export async function handleChannelMemberUpdatedEvent(serverUrl: string, msg: any) {
    console.log('\n<><> -- handleChannelMemberUpdatedEvent -- <><>');
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const updatedChannelMember = JSON.parse(msg.data.channelMember);
        console.log('updatedChannelMember = ', inspect(updatedChannelMember, false, null, true /* enable colors */));
        await operator.handleChannelMembership({
            channelMemberships: [updatedChannelMember],
            prepareRecordsOnly: false,
        });
    } catch {
        // do nothing
    }

    //  msg {"broadcast": {
    //  "channel_id": "",
    //  "omit_users": null,
    //  "team_id": "",
    //  "user_id": "34r7zpnjkbgmpez83xkq1a614c"
    //  },
    //  "data": {
    //  "channelMember": {
    //      channel_id:"hdk9xk78pjyutjbm7ca9byyooh",
    //      user_id:"34r7zpnjkbgmpez83xkq1a614c",
    //      roles":"channel_user",
    //      "last_viewed_at":1646691273567,
    //      "msg_count":129,
    //      "mention_count":0,
    //      "mention_count_root":0,
    //      "msg_count_root":129,
    //      "notify_props":{
    //          "desktop":"default",
    //          "email":"default",
    //          "ignore_channel_mentions":"default",
    //          "mark_unread":"all",
    //          "push":"default"
    //      },
    //      "last_update_at":1646691273567,
    //      "scheme_guest":false,
    //      "scheme_user":true,
    //      "scheme_admin":false,
    //      "explicit_roles":""
    //      }"
    //  },
    //  "event": "channel_member_updated",
    //  "seq": 60}
}

export async function handleDirectAddedEvent(serverUrl: string, msg: any) {
    // what about group messages created??
    // msg {"broadcast": {"channel_id": "bxxc6aqhxby6dfuobso8fykiqa", "omit_users": null, "team_id": "", "user_id": ""}, "data": {"creator_id": "34r7zpnjkbgmpez83xkq1a614c", "teammate_id": "6wgcb9dkct86tp1p9j3fcab6pa"}, "event": "direct_added", "seq": 1}
    console.log('msg', msg);
    console.log('\n<><> -- handleDirectAddedEvent -- <><>');
}

export async function handleUserAddedToChannelEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const currentUser = await queryCurrentUser(database.database);
    const {team_id: teamId, user_id: userId} = msg.data;
    const {channel_id: channelId} = msg.broadcast;
    const models: Model[] = [];

    try {
        const addedUser = queryUserById(database.database, userId);
        if (!addedUser) {
            // TODO Potential improvement https://mattermost.atlassian.net/browse/MM-40581
            const {users} = await fetchUsersByIds(serverUrl, [userId], true);
            if (users) {
                models.push(...await database.operator.handleUsers({users, prepareRecordsOnly: true}));
            }
        }

        if (userId === currentUser?.id) {
            const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
            if (channels && memberships) {
                const prepare = await prepareMyChannelsForTeam(database.operator, teamId, channels, memberships);
                if (prepare) {
                    const prepareModels = await Promise.all(prepare);
                    const flattenedModels = prepareModels.flat();
                    if (flattenedModels?.length > 0) {
                        models.push(...flattenedModels);
                    }
                }
            }

            const {posts, order, authors, actionType, previousPostId} = await fetchPostsForChannel(serverUrl, channelId, true);
            if (posts?.length && order && actionType) {
                models.push(...await database.operator.handlePosts({
                    actionType,
                    order,
                    posts,
                    previousPostId,
                    prepareRecordsOnly: true,
                }));
            }

            if (authors?.length) {
                models.push(...await database.operator.handleUsers({users: authors, prepareRecordsOnly: true}));
            }

            database.operator.batchRecords(models);
        } else {
            const channels = await queryChannelsById(database.database, [channelId]);
            if (channels?.[0]) {
                models.push(...await database.operator.handleChannelMembership({
                    channelMemberships: [{channel_id: channelId, user_id: userId}],
                    prepareRecordsOnly: true,
                }));
            }
        }
    } catch {
        // Do nothing
    }

    database.operator.batchRecords(models);
}

export async function handleUserRemovedFromChannelEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const channel = await queryCurrentChannel(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const userId = msg.broadcast.user_id;
    const channelId = msg.data.channel_id;

    const models: Model[] = [];

    if (user.isGuest) {
        const {models: updateVisibleModels} = await updateUsersNoLongerVisible(serverUrl, true);
        if (updateVisibleModels) {
            models.push(...updateVisibleModels);
        }
    }

    if (user.id === userId) {
        const {models: removeUserModels} = await removeCurrentUserFromChannel(serverUrl, channelId, true);
        if (removeUserModels) {
            models.push(...removeUserModels);
        }

        if (channel && channel.id === channelId) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.LEAVE_CHANNEL);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await queryNthLastChannelFromTeam(database.database, channel?.teamId);
                    if (channelToJumpTo) {
                        const {models: switchChannelModels} = await switchToChannel(serverUrl, channelToJumpTo, '', true);
                        if (switchChannelModels) {
                            models.push(...switchChannelModels);
                        }
                    } // TODO else jump to "join a channel" screen https://mattermost.atlassian.net/browse/MM-41051
                } else {
                    const currentChannelModels = await prepareCommonSystemValues(database.operator, {currentChannelId: ''});
                    if (currentChannelModels?.length) {
                        models.push(...currentChannelModels);
                    }
                }
            }
        }
    } else {
        const {models: deleteMemberModels} = await deleteChannelMembership(database.operator, userId, channelId, true);
        if (deleteMemberModels) {
            models.push(...deleteMemberModels);
        }
    }

    database.operator.batchRecords(models);
}

export async function handleChannelDeletedEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentChannel = await queryCurrentChannel(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const config = await queryConfig(database.database);

    await setChannelDeleteAt(serverUrl, msg.data.channel_id, msg.data.delete_at);

    if (user.isGuest) {
        updateUsersNoLongerVisible(serverUrl);
    }

    if (config?.ExperimentalViewArchivedChannels !== 'true') {
        removeCurrentUserFromChannel(serverUrl, msg.data.channel_id);

        if (currentChannel && currentChannel.id === msg.data.channel_id) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.CHANNEL_DELETED);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await queryNthLastChannelFromTeam(database.database, currentChannel?.teamId);
                    if (channelToJumpTo) {
                        switchToChannel(serverUrl, channelToJumpTo);
                    } // TODO else jump to "join a channel" screen
                } else {
                    setCurrentChannelId(database.operator, '');
                }
            }
        }
    }
}
