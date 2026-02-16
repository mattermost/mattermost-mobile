// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';
import {field} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import type E2EEEnabledDeviceModelInterface from '@e2ee/types/database/models/e2ee_enabled_devices';

const {E2EE_ENABLED_DEVICES} = E2EE_TABLES;

/**
 * The E2EEEnabledDevices model represents an E2EE-enabled device in the Mattermost app.
 */
export default class E2EEEnabledDeviceModel extends Model implements E2EEEnabledDeviceModelInterface {
    /** table (name) : E2EEEnabledDevices */
    static table = E2EE_ENABLED_DEVICES;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {};

    /** device_id : Device identifier from the server */
    @field('device_id') deviceId!: string;

    /** signature_public_key : Public key for signature verification (nullable) */
    @field('signature_public_key') signaturePublicKey!: string | null;

    /** is_current_device : Whether this record represents the current device */
    @field('is_current_device') isCurrentDevice!: boolean;

    /** verified : Whether the device is verified */
    @field('verified') verified!: boolean;
}
