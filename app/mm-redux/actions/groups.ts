// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import _ from 'lodash';
import {GroupTypes} from '@mm-redux/action_types';
import {General, Groups} from '../constants';
import {Client4} from '@mm-redux/client';

import {Action, ActionFunc, batchActions, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {SyncableType, SyncablePatch} from '@mm-redux/types/groups';

import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';

export function linkGroupSyncable(groupID: string, syncableID: string, syncableType: SyncableType, patch: SyncablePatch): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.linkGroupSyncable(groupID, syncableID, syncableType, patch);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const dispatches: Action[] = [];

        let type = '';
        switch (syncableType) {
        case Groups.SYNCABLE_TYPE_TEAM:
            dispatches.push({type: GroupTypes.RECEIVED_GROUPS_ASSOCIATED_TO_TEAM, data: {teamID: syncableID, groups: [{id: groupID}]}});
            type = GroupTypes.LINKED_GROUP_TEAM;
            break;
        case Groups.SYNCABLE_TYPE_CHANNEL:
            type = GroupTypes.LINKED_GROUP_CHANNEL;
            break;
        default:
            console.warn(`unhandled syncable type ${syncableType}`); // eslint-disable-line no-console
        }

        dispatches.push({type, data});
        dispatch(batchActions(dispatches));

        return {data: true};
    };
}

export function unlinkGroupSyncable(groupID: string, syncableID: string, syncableType: SyncableType): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.unlinkGroupSyncable(groupID, syncableID, syncableType);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const dispatches: Action[] = [];

        let type = '';
        const data = {group_id: groupID, syncable_id: syncableID};
        switch (syncableType) {
        case Groups.SYNCABLE_TYPE_TEAM:
            type = GroupTypes.UNLINKED_GROUP_TEAM;
            data.syncable_id = syncableID;
            dispatches.push({type: GroupTypes.RECEIVED_GROUPS_NOT_ASSOCIATED_TO_TEAM, data: {teamID: syncableID, groups: [{id: groupID}]}});
            break;
        case Groups.SYNCABLE_TYPE_CHANNEL:
            type = GroupTypes.UNLINKED_GROUP_CHANNEL;
            data.syncable_id = syncableID;
            break;
        default:
            console.warn(`unhandled syncable type ${syncableType}`); // eslint-disable-line no-console
        }

        dispatches.push({type, data});
        dispatch(batchActions(dispatches));

        return {data: true};
    };
}

export function getGroupSyncables(groupID: string, syncableType: SyncableType): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroupSyncables(groupID, syncableType);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        let type = '';
        switch (syncableType) {
        case Groups.SYNCABLE_TYPE_TEAM:
            type = GroupTypes.RECEIVED_GROUP_TEAMS;
            break;
        case Groups.SYNCABLE_TYPE_CHANNEL:
            type = GroupTypes.RECEIVED_GROUP_CHANNELS;
            break;
        default:
            console.warn(`unhandled syncable type ${syncableType}`); // eslint-disable-line no-console
        }

        dispatch(batchActions([
            {type, data, group_id: groupID},
        ]));

        return {data: true};
    };
}

export function patchGroupSyncable(groupID: string, syncableID: string, syncableType: SyncableType, patch: SyncablePatch): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.patchGroupSyncable(groupID, syncableID, syncableType, patch);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            return {error};
        }

        const dispatches: Action[] = [];

        let type = '';
        switch (syncableType) {
        case Groups.SYNCABLE_TYPE_TEAM:
            type = GroupTypes.PATCHED_GROUP_TEAM;
            break;
        case Groups.SYNCABLE_TYPE_CHANNEL:
            type = GroupTypes.PATCHED_GROUP_CHANNEL;
            break;
        default:
            console.warn(`unhandled syncable type ${syncableType}`); // eslint-disable-line no-console
        }

        dispatches.push(
            {type, data},
        );
        dispatch(batchActions(dispatches));

        return {data: true};
    };
}

export function getGroupMembers(groupID: string, page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroupMembers(groupID, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {type: GroupTypes.RECEIVED_GROUP_MEMBERS, group_id: groupID, data},
        ]));

        return {data: true};
    };
}

export function getGroup(id: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroup(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_GROUP,
                    data,
                },
            ]));
        }

        return {data: true};
    };
}

export function getGroups(filterAllowReference: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroups(filterAllowReference);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_GROUPS,
                    data,
                },
            ]));
        }

        return {data: true};
    };
}

export function getGroupsNotAssociatedToTeam(teamID: string, q = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroupsNotAssociatedToTeam(teamID, q, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_GROUPS,
                    data,
                },
            ]));
        }

        return {data: true};
    };
}

export function getGroupsNotAssociatedToChannel(channelID: string, q = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroupsNotAssociatedToChannel(channelID, q, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_GROUPS,
                    data,
                },
            ]));
        }

        return {data: true};
    };
}

export function getAllGroupsAssociatedToTeam(teamID: string, filterAllowReference: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getAllGroupsAssociatedToTeam(teamID, filterAllowReference);
            data.teamID = teamID;
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_ALL_GROUPS_ASSOCIATED_TO_TEAM,
                    data,
                },
            ]));
        }

        return {data: true};
    };
}

export function getAllGroupsAssociatedToChannel(channelID: string, filterAllowReference: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getAllGroupsAssociatedToChannel(channelID, filterAllowReference);
            data.channelID = channelID;
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_ALL_GROUPS_ASSOCIATED_TO_CHANNEL,
                    data,
                },
            ]));
        }

        return {data: true};
    };
}

export function getAllGroupsAssociatedToChannelsInTeam(teamID: string, filterAllowReference: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getAllGroupsAssociatedToChannelsInTeam(teamID, filterAllowReference);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_ALL_GROUPS_ASSOCIATED_TO_CHANNELS_IN_TEAM,
                    data: {groupsByChannelId: data.groups},
                },
            ]));
        }

        return {data: true};
    };
}

export function getGroupsAssociatedToTeam(teamID: string, q = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT, filterAllowReference: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroupsAssociatedToTeam(teamID, q, page, perPage, filterAllowReference);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_GROUPS_ASSOCIATED_TO_TEAM,
                    data: {groups: data.groups, totalGroupCount: data.total_group_count, teamID},
                },
            ]));
        }

        return {data: true};
    };
}

export function getGroupsAssociatedToChannel(channelID: string, q = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT, filterAllowReference: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getGroupsAssociatedToChannel(channelID, q, page, perPage, filterAllowReference);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (!_.isEmpty(data)) {
            dispatch(batchActions([
                {
                    type: GroupTypes.RECEIVED_GROUPS_ASSOCIATED_TO_CHANNEL,
                    data: {groups: data.groups, totalGroupCount: data.total_group_count, channelID},
                },
            ]));
        }

        return {data: true};
    };
}
