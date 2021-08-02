// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type SystemModel from '@typings/database/models/servers/system';

type PrepareCommonSystemValuesArgs = {
    config?: ClientConfig;
    currentChannelId?: string;
    currentTeamId?: string;
    currentUserId?: string;
    license?: ClientLicense;
}

const {SERVER: {SYSTEM}} = MM_TABLES;

export const queryCurrentChannelId = async (serverDatabase: Database) => {
    try {
        const currentChannelId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID) as SystemModel;
        return (currentChannelId?.value || '') as string;
    } catch {
        return '';
    }
};

export const queryCurrentTeamId = async (serverDatabase: Database) => {
    try {
        const currentTeamId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID) as SystemModel;
        return (currentTeamId?.value || '') as string;
    } catch {
        return '';
    }
};

export const queryCurrentUserId = async (serverDatabase: Database) => {
    try {
        const currentUserId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_USER_ID) as SystemModel;
        return (currentUserId?.value || '') as string;
    } catch {
        return '';
    }
};

export const queryCommonSystemValues = async (serverDatabase: Database) => {
    const systemRecords = (await serverDatabase.collections.get(SYSTEM).query().fetch()) as SystemModel[];
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
                license = systemRecord.value as ClientLicense;
                break;
        }
    });

    return {
        currentChannelId,
        currentTeamId,
        currentUserId,
        config: (config as ClientConfig),
        license: (license as ClientLicense),
    };
};

export const queryWebSocketLastDisconnected = async (serverDatabase: Database) => {
    try {
        const websocketLastDisconnected = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.WEBSOCKET) as SystemModel;
        return (parseInt(websocketLastDisconnected?.value || 0, 10) || 0);
    } catch {
        return 0;
    }
};

export const prepareCommonSystemValues = (
    operator: ServerDataOperator, values: PrepareCommonSystemValuesArgs) => {
    try {
        const {config, currentChannelId, currentTeamId, currentUserId, license} = values;
        const systems: IdValue[] = [];
        if (config !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CONFIG,
                value: JSON.stringify(config),
            });
        }

        if (license !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.LICENSE,
                value: JSON.stringify(license),
            });
        }

        if (currentUserId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: currentUserId,
            });
        }

        if (currentTeamId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                value: currentTeamId,
            });
        }

        if (currentChannelId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: currentChannelId,
            });
        }

        return operator.handleSystem({
            systems,
            prepareRecordsOnly: true,
        });
    } catch {
        return undefined;
    }
};

export const setCurrentChannelId = async (operator: ServerDataOperator, channelId: string) => {
    try {
        const models = await prepareCommonSystemValues(operator, {currentChannelId: channelId});
        if (models) {
            await operator.batchRecords(models);
        }

        return {currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
};

export const setCurrentTeamAndChannelId = async (operator: ServerDataOperator, teamId?: string, channelId?: string) => {
    try {
        const models = await prepareCommonSystemValues(operator, {
            currentChannelId: channelId,
            currentTeamId: teamId,
        });
        if (models) {
            await operator.batchRecords(models);
        }

        return {currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
};
