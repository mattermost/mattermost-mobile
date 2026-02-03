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

    /** device_name : Display name of the device */
    @field('device_name') deviceName!: string;

    /** signature_public_key : Public key for signature verification (nullable) */
    @field('signature_public_key') signaturePublicKey!: string | null;

    /** is_current_device : Whether this record represents the current device */
    @field('is_current_device') isCurrentDevice!: boolean;

    /** created_at : Timestamp when the device was created */
    @field('created_at') createdAt!: number;

    /** last_active_at : Timestamp of last activity (nullable) */
    @field('last_active_at') lastActiveAt!: number | null;

    /** revoke_at : Timestamp when the device was revoked (nullable) */
    @field('revoke_at') revokeAt!: number | null;

    /** os_version : OS version string (nullable) */
    @field('os_version') osVersion!: string | null;

    /** app_version : App version string (nullable) */
    @field('app_version') appVersion!: string | null;

    /** verified : Whether the device is verified */
    @field('verified') verified!: boolean;
}
