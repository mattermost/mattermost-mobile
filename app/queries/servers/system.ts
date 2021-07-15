// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

export const queryCurrentChannelId = async (serverDatabase: Database) => {
    try {
        const currentChannelId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID) as SystemModel;
        return currentChannelId?.value || '';
    } catch {
        return '';
    }
};

export const queryCurrentUserId = async (serverDatabase: Database) => {
    try {
        const currentUserId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_USER_ID) as SystemModel;
        return currentUserId?.value || '';
    } catch {
        return '';
    }
};

export const queryCommonSystemValues = async (database: Database) => {
    const systemRecords = (await database.collections.get(SYSTEM).query().fetch()) as SystemModel[];
    let config = {};
    let license = {};
    let currentChannelId = '';
    let currentTeamId = '';
    let currentUserId = '';
    systemRecords.forEach((systemRecord) => {
        switch (systemRecord.id) {
            case SYSTEM_IDENTIFIERS.CONFIG:
                config = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID:
                currentChannelId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID:
                currentTeamId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_USER_ID:
                currentUserId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.LICENSE:
                license = systemRecord.value;
                break;
        }
    });

    return {
        currentChannelId,
        currentTeamId,
        currentUserId,
        config,
        license,
    };
};

export const prepareCommonSystemValues = (
    operator: ServerDataOperator, config: ClientConfig, license: ClientLicense,
    currentUserId: string, currentTeamId: string, currentChannelId: string) => {
    try {
        return operator.handleSystem({
            systems: [
                {
                    id: SYSTEM_IDENTIFIERS.CONFIG,
                    value: JSON.stringify(config),
                },
                {
                    id: SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                },
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: currentUserId,
                },
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: currentTeamId,
                },
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                    value: currentChannelId,
                },
            ],
            prepareRecordsOnly: true,
        });
    } catch {
        return undefined;
    }
};
