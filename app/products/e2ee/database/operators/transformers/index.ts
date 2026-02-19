// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';

import {OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type E2EERegisteredDeviceModel from '@e2ee/types/database/models/e2ee_registered_devices';
import type {TransformerArgs} from '@typings/database/database';

const {E2EE_REGISTERED_DEVICES} = E2EE_TABLES;

/** Raw shape from API or sync (snake_case); device_id is mandatory. is_current_device may be set client-side. */
type RegisteredDeviceRaw = {

    /** Required: device identifier from the server. */
    device_id: string;
    signature_public_key?: string | null;
};

/**
 * transformE2EERegisteredDeviceRecord: Prepares a record of the SERVER database 'E2EERegisteredDevices' table for update or create actions.
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<E2EERegisteredDeviceModel>}
 */
export const transformE2EERegisteredDeviceRecord = ({
    action,
    database,
    value,
}: TransformerArgs<E2EERegisteredDeviceModel, RegisteredDeviceRaw>): Promise<E2EERegisteredDeviceModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (device: E2EERegisteredDeviceModel) => {
        device._raw.id = isCreateAction ? raw.device_id : record!.id;
        device.deviceId = raw.device_id;
        device.signaturePublicKey = raw.signature_public_key ?? record?.signaturePublicKey ?? null;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: E2EE_REGISTERED_DEVICES,
        value,
        fieldsMapper,
    });
};
