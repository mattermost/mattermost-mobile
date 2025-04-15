// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {
    buildMyChannelKey,
    buildChannelMembershipKey,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelBookmarkRecord,
    transformChannelInfoRecord,
    transformChannelMembershipRecord,
    transformChannelRecord,
    transformMyChannelRecord,
    transformMyChannelSettingsRecord,
} from '@database/operator/server_data_operator/transformers/channel';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {getIsCRTEnabled} from '@queries/servers/thread';
import ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type {HandleChannelArgs, HandleChannelBookmarkArgs, HandleChannelInfoArgs, HandleChannelMembershipArgs, HandleMyChannelArgs, HandleMyChannelSettingsArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_BOOKMARK,
    CHANNEL_INFO,
    CHANNEL_MEMBERSHIP,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

export interface ChannelHandlerMix {
  handleChannel: ({channels, prepareRecordsOnly}: HandleChannelArgs) => Promise<ChannelModel[]>;
  handleChannelBookmark: ({bookmarks, prepareRecordsOnly}: HandleChannelBookmarkArgs) => Promise<Model[]>;
  handleChannelMembership: ({channelMemberships, prepareRecordsOnly}: HandleChannelMembershipArgs) => Promise<ChannelMembershipModel[]>;
  handleMyChannelSettings: ({settings, prepareRecordsOnly}: HandleMyChannelSettingsArgs) => Promise<MyChannelSettingsModel[]>;
  handleChannelInfo: ({channelInfos, prepareRecordsOnly}: HandleChannelInfoArgs) => Promise<ChannelInfoModel[]>;
  handleMyChannel: ({channels, myChannels, isCRTEnabled, prepareRecordsOnly}: HandleMyChannelArgs) => Promise<MyChannelModel[]>;
}

const ChannelHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleChannel: Handler responsible for the Create/Update operations occurring on the CHANNEL table from the 'Server' schema
     * @param {HandleChannelArgs} channelsArgs
     * @param {RawChannel[]} channelsArgs.channels
     * @param {boolean} channelsArgs.prepareRecordsOnly
     * @returns {Promise<ChannelModel[]>}
     */
    handleChannel = async ({channels, prepareRecordsOnly = true}: HandleChannelArgs): Promise<ChannelModel[]> => {
        if (!channels?.length) {
            logWarning(
                'An empty or undefined "channels" array has been passed to the handleChannel method',
            );
            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: channels, key: 'id'});
        const keys = uniqueRaws.map((c) => c.id);
        const db: Database = this.database;
        const existing = await db.get<ChannelModel>(CHANNEL).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const channelMap = new Map<string, ChannelModel>(existing.map((c) => [c.id, c]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: Channel[], c) => {
            const e = channelMap.get(c.id);
            if (!e) {
                res.push(c);
                return res;
            }

            if (e.updateAt !== c.update_at || e.deleteAt !== c.delete_at || c.fake) {
                res.push(c);
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL,
        }, 'handleChannel');
    };

    /**
     * handleMyChannelSettings: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL_SETTINGS table from the 'Server' schema
     * @param {HandleMyChannelSettingsArgs} settingsArgs
     * @param {RawMyChannelSettings[]} settingsArgs.settings
     * @param {boolean} settingsArgs.prepareRecordsOnly
     * @returns {Promise<MyChannelSettingsModel[]>}
     */
    handleMyChannelSettings = async ({settings, prepareRecordsOnly = true}: HandleMyChannelSettingsArgs): Promise<MyChannelSettingsModel[]> => {
        if (!settings?.length) {
            logWarning(
                'An empty or undefined "settings" array has been passed to the handleMyChannelSettings method',
            );

            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: settings, key: 'id'});
        const keys = uniqueRaws.map((c) => c.channel_id);
        const db: Database = this.database;
        const existing = await db.get<MyChannelSettingsModel>(MY_CHANNEL_SETTINGS).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const channelMap = new Map<string, MyChannelSettingsModel>(existing.map((c) => [c.id, c]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: ChannelMembership[], c) => {
            const e = channelMap.get(c.channel_id);
            if (!e) {
                res.push(c);
                return res;
            }

            try {
                const current = JSON.stringify(e.notifyProps);
                const newer = JSON.stringify(c.notify_props);
                if (current !== newer) {
                    res.push(c);
                }
            } catch {
                //skip;
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            buildKeyRecordBy: buildMyChannelKey,
            transformer: transformMyChannelSettingsRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL_SETTINGS,
        }, 'handleMyChannelSettings');
    };

    /**
     * handleChannelInfo: Handler responsible for the Create/Update operations occurring on the CHANNEL_INFO table from the 'Server' schema
     * @param {HandleChannelInfoArgs} channelInfosArgs
     * @param {RawChannelInfo[]} channelInfosArgs.channelInfos
     * @param {boolean} channelInfosArgs.prepareRecordsOnly
     * @returns {Promise<ChannelInfoModel[]>}
     */
    handleChannelInfo = async ({channelInfos, prepareRecordsOnly = true}: HandleChannelInfoArgs): Promise<ChannelInfoModel[]> => {
        if (!channelInfos?.length) {
            logWarning(
                'An empty "channelInfos" array has been passed to the handleMyChannelSettings method',
            );

            return [];
        }

        const uniqueRaws = getUniqueRawsBy({
            raws: channelInfos as ChannelInfo[],
            key: 'id',
        });
        const keys = uniqueRaws.map((ci) => ci.id);
        const db: Database = this.database;
        const existing = await db.get<ChannelInfoModel>(CHANNEL_INFO).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const channelMap = new Map<string, ChannelInfoModel>(existing.map((ci) => [ci.id, ci]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: ChannelInfo[], ci) => {
            const e = channelMap.get(ci.id);
            if (!e) {
                res.push(ci);
                return res;
            }

            if (
                ci.guest_count !== e.guestCount ||
                ci.member_count !== e.memberCount ||
                ci.header !== e.header ||
                ci.pinned_post_count !== e.pinnedPostCount ||
                ci.files_count !== e.filesCount ||
                ci.purpose !== e.purpose
            ) {
                res.push(ci);
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_INFO,
        }, 'handleChannelInfo');
    };

    /**
     * handleMyChannel: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL table from the 'Server' schema
     * @param {HandleMyChannelArgs} myChannelsArgs
     * @param {RawMyChannel[]} myChannelsArgs.myChannels
     * @param {boolean} myChannelsArgs.prepareRecordsOnly
     * @returns {Promise<MyChannelModel[]>}
     */
    handleMyChannel = async ({channels, myChannels, isCRTEnabled, prepareRecordsOnly = true}: HandleMyChannelArgs): Promise<MyChannelModel[]> => {
        if (!myChannels?.length) {
            logWarning(
                'An empty or undefined "myChannels" array has been passed to the handleMyChannel method',
            );

            return [];
        }

        if (!channels?.length) {
            logWarning(
                'An empty or undefined "channels" array has been passed to the handleMyChannel method',
            );

            return [];
        }

        const isCRT = isCRTEnabled ?? await getIsCRTEnabled(this.database);
        const channelMap = channels.reduce((result: Record<string, Channel>, channel) => {
            result[channel.id] = channel;
            return result;
        }, {});

        for (const my of myChannels) {
            const channel = channelMap[my.channel_id];
            if (channel) {
                const totalMsg = isCRT ? channel.total_msg_count_root! : channel.total_msg_count;
                const myMsgCount = isCRT ? my.msg_count_root! : my.msg_count;
                const msgCount = Math.max(0, totalMsg - myMsgCount);
                const lastPostAt = isCRT ? (channel.last_root_post_at || channel.last_post_at) : channel.last_post_at;
                my.msg_count = msgCount;
                my.mention_count = isCRT ? my.mention_count_root! : my.mention_count;
                my.is_unread = msgCount > 0;
                my.last_post_at = lastPostAt;
            }
        }

        const uniqueRaws = getUniqueRawsBy({
            raws: myChannels,
            key: 'id',
        });
        const ids = uniqueRaws.map((cm: ChannelMembership) => cm.channel_id);
        const db: Database = this.database;
        const existing = await db.get<MyChannelModel>(MY_CHANNEL).query(
            Q.where('id', Q.oneOf(ids)),
        ).fetch();
        const membershipMap = new Map<string, MyChannelModel>(existing.map((member) => [member.id, member]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: ChannelMembership[], my) => {
            const e = membershipMap.get(my.channel_id);
            if (!e) {
                res.push(my);
                return res;
            }

            const chan = channelMap[my.channel_id];
            const lastPostAt = isCRT ? (chan.last_root_post_at || chan.last_post_at) : chan.last_post_at;
            if ((chan && e.lastPostAt < lastPostAt) ||
                e.isUnread !== my.is_unread || e.lastViewedAt < my.last_viewed_at ||
                e.roles !== my.roles
            ) {
                res.push(my);
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            buildKeyRecordBy: buildMyChannelKey,
            transformer: transformMyChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL,
        }, 'handleMyChannel');
    };

    /**
     * handleChannelMembership: Handler responsible for the Create/Update operations occurring on the CHANNEL_MEMBERSHIP table from the 'Server' schema
     * @param {HandleChannelMembershipArgs} channelMembershipsArgs
     * @param {ChannelMembership[]} channelMembershipsArgs.channelMemberships
     * @param {boolean} channelMembershipsArgs.prepareRecordsOnly
     * @returns {Promise<ChannelMembershipModel[]>}
     */
    handleChannelMembership = async ({channelMemberships, prepareRecordsOnly = true}: HandleChannelMembershipArgs): Promise<ChannelMembershipModel[]> => {
        if (!channelMemberships?.length) {
            logWarning(
                'An empty "channelMemberships" array has been passed to the handleChannelMembership method',
            );

            return [];
        }

        const memberships: ChannelMember[] = channelMemberships.map((m) => ({
            ...m,
            id: `${m.channel_id}-${m.user_id}`,
        }));

        const uniqueRaws = getUniqueRawsBy({raws: memberships, key: 'id'});
        const ids = uniqueRaws.map((cm: ChannelMember) => `${cm.channel_id}-${cm.user_id}`);
        const db: Database = this.database;
        const existing = await db.get<ChannelMembershipModel>(CHANNEL_MEMBERSHIP).query(
            Q.where('id', Q.oneOf(ids)),
        ).fetch();
        const membershipMap = new Map<string, ChannelMembershipModel>(existing.map((member) => [member.channelId, member]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: ChannelMember[], cm) => {
            const e = membershipMap.get(cm.channel_id);
            if (!e) {
                res.push(cm);
                return res;
            }

            if (cm.scheme_admin !== e.schemeAdmin) {
                res.push(cm);
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'user_id',
            buildKeyRecordBy: buildChannelMembershipKey,
            transformer: transformChannelMembershipRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_MEMBERSHIP,
        }, 'handleChannelMembership');
    };

    /**
     * handleChannelMembership: Handler responsible for the Create/Update/Delete operations occurring on the CHANNEL_BOOKMARK table from the 'Server' schema
     * @param {HandleChannelBookmarkArgs} channelBookmarkArgs
     * @param {ChannelBookmark[]} channelBookmarkArgs.bookmarks
     * @param {boolean} channelBookmarkArgs.prepareRecordsOnly
     * @returns {Promise<ChannelBookmarkModel[]>}
     */
    handleChannelBookmark = async ({bookmarks, prepareRecordsOnly}: HandleChannelBookmarkArgs): Promise<Model[]> => {
        if (!bookmarks?.length) {
            logWarning(
                'An empty or undefined "bookmarks" array has been passed to the handleChannelBookmark method',
            );
            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: bookmarks, key: 'id'});
        const keys = uniqueRaws.map((c) => c.id);
        const db: Database = this.database;
        const existing = await db.get<ChannelBookmarkModel>(CHANNEL_BOOKMARK).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const bookmarkMap = new Map<string, ChannelBookmarkModel>(existing.map((b) => [b.id, b]));
        const files: FileInfo[] = [];
        const raws = uniqueRaws.reduce<{createOrUpdateRaws: ChannelBookmarkWithFileInfo[]; deleteRaws: ChannelBookmarkWithFileInfo[]}>((res, b) => {
            const e = bookmarkMap.get(b.id);
            if (!e) {
                if (!b.delete_at) {
                    res.createOrUpdateRaws.push(b);
                    if (b.file) {
                        files.push(b.file);
                    }
                }
                return res;
            }

            if (e.updateAt !== b.update_at || e.sortOrder !== b.sort_order) {
                res.createOrUpdateRaws.push(b);
                if (b.file) {
                    files.push(b.file);
                }
            }

            if (b.delete_at) {
                res.deleteRaws.push(b);
                if (b.file) {
                    b.file.delete_at = b.delete_at;
                    files.push(b.file);
                }
            }

            return res;
        }, {createOrUpdateRaws: [], deleteRaws: []});

        if (!raws.createOrUpdateRaws.length && !raws.deleteRaws.length) {
            return [];
        }

        const preparedBookmarks = await this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelBookmarkRecord,
            createOrUpdateRawValues: raws.createOrUpdateRaws,
            deleteRawValues: raws.deleteRaws,
            tableName: CHANNEL_BOOKMARK,
            prepareRecordsOnly: true,
        }, 'handleChannelBookmark');

        const batch: Model[] = [...preparedBookmarks];
        if (files.length) {
            const bookmarkFiles = await this.handleFiles({files, prepareRecordsOnly: true});
            if (bookmarkFiles.length) {
                batch.push(...bookmarkFiles);
            }
        }

        if (batch.length && !prepareRecordsOnly) {
            await this.batchRecords(batch, 'handleChannelBookmark');
        }

        return batch;
    };
};

export default ChannelHandler;
