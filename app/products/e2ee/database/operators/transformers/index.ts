// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';

import {OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type E2EEEnabledDeviceModel from '@e2ee/types/database/models/e2ee_enabled_devices';
import type {TransformerArgs} from '@typings/database/database';

const {E2EE_ENABLED_DEVICES} = E2EE_TABLES;

/** Raw shape from API or sync (snake_case); device_id is mandatory. is_current_device may be set client-side. */
type EnabledDeviceRaw = {

    /** Required: device identifier from the server. */
    device_id: string;
    device_name?: string;
    signature_public_key?: string | null;
    is_current_device?: boolean;
    created_at?: number;
    last_active_at?: number | null;
    revoke_at?: number | null;
    os_version?: string | null;
    app_version?: string | null;
    verified?: boolean;
};

/**
 * transformE2EEEnabledDeviceRecord: Prepares a record of the SERVER database 'E2EEEnabledDevices' table for update or create actions.
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<E2EEEnabledDeviceModel>}
 */
export const transformE2EEEnabledDeviceRecord = ({
    action,
    database,
    value,
}: TransformerArgs<E2EEEnabledDeviceModel, EnabledDeviceRaw>): Promise<E2EEEnabledDeviceModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (device: E2EEEnabledDeviceModel) => {
        device._raw.id = isCreateAction ? raw.device_id : record!.id;
        device.deviceId = raw.device_id;
        device.deviceName = raw.device_name ?? record?.deviceName ?? '';
        device.signaturePublicKey = raw.signature_public_key ?? record?.signaturePublicKey ?? null;
        device.isCurrentDevice = raw.is_current_device ?? record?.isCurrentDevice ?? false;
        device.createdAt = raw.created_at ?? record?.createdAt ?? 0;
        device.lastActiveAt = raw.last_active_at ?? record?.lastActiveAt ?? null;
        device.revokeAt = raw.revoke_at ?? record?.revokeAt ?? null;
        device.osVersion = raw.os_version ?? record?.osVersion ?? null;
        device.appVersion = raw.app_version ?? record?.appVersion ?? null;
        device.verified = raw.verified ?? record?.verified ?? false;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: E2EE_ENABLED_DEVICES,
        value,
        fieldsMapper,
    });
};
