// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';
import E2EERegisteredDeviceModel from '@e2ee/database/models/e2ee_registered_device';
import {transformE2EERegisteredDeviceRecord} from '@e2ee/database/operators/transformers';

import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import type {Model} from '@nozbe/watermelondb';

type HandleDevicesArgs = {
    devices: RegisteredDevice[];
}

type HandleCurrentDeviceArgs = {
    deviceId: string;
    signaturePublicKey: string;
}

const {E2EE_REGISTERED_DEVICES} = E2EE_TABLES;

export interface E2EEHandlerMix {
    handleDevices: (args: HandleDevicesArgs) => Promise<Model[]>;
    handleCurrentDevice: (args: HandleCurrentDeviceArgs) => Promise<E2EERegisteredDeviceModel[]>;
}

const E2EEHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {

    handleDevices = async ({devices}: HandleDevicesArgs): Promise<Model[]> => {
        // device_id is required; skip any raws without it
        const validDevices = devices.filter((d) => Boolean(d.device_id));
        if (validDevices.length < devices.length) {
            logWarning(
                'handleDevices: skipped devices without device_id',
                devices.length - validDevices.length,
            );
        }

        const uniqueRaws = getUniqueRawsBy({raws: validDevices, key: 'device_id'});
        const idsFromValid = new Set(uniqueRaws.map((r) => r.device_id));

        // Find existing records whose device_id is not in validDevices — those will be removed
        const allExisting = await this.database.collections.
            get<E2EERegisteredDeviceModel>(E2EE_REGISTERED_DEVICES).
            query().
            fetch();

        const deleteRawValues = allExisting.
            filter((rec) => !idsFromValid.has(rec.deviceId)).
            map((rec) => ({device_id: rec.deviceId}));

        const records = await this.handleRecords({
            buildKeyRecordBy: (record) => record.deviceId,
            fieldName: 'device_id',
            tableName: E2EE_REGISTERED_DEVICES,
            prepareRecordsOnly: false,
            createOrUpdateRawValues: uniqueRaws,
            deleteRawValues,
            transformer: transformE2EERegisteredDeviceRecord,
        }, 'handleDevices');

        return records;
    };

    handleCurrentDevice = async ({deviceId, signaturePublicKey}: HandleCurrentDeviceArgs): Promise<E2EERegisteredDeviceModel[]> => {
        const allExisting = await this.database.collections.
            get<E2EERegisteredDeviceModel>(E2EE_REGISTERED_DEVICES).
            query().
            fetch();

        // we delete previous records flagged as current device in case those exist since those are now not valid anymore
        const deleteRawValues = allExisting.
            filter((rec) => rec.isCurrentDevice && rec.deviceId !== deviceId).
            map((rec) => ({device_id: rec.deviceId}));

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: [{
                device_id: deviceId,
                signature_public_key: signaturePublicKey,
                is_current_device: true,
                verified: true,
            }],
            key: 'device_id',
        });

        return this.handleRecords({
            buildKeyRecordBy: (record) => record.deviceId,
            fieldName: 'device_id',
            tableName: E2EE_REGISTERED_DEVICES,
            prepareRecordsOnly: false,
            createOrUpdateRawValues,
            deleteRawValues,
            transformer: transformE2EERegisteredDeviceRecord,
        }, 'handleCurrentDevice');
    };
};

export default E2EEHandler;
