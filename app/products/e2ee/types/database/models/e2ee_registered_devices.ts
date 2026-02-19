// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The E2EERegisteredDevice model represents local data for an E2EE-registered device in the Mattermost app.
 */
declare class E2EERegisteredDeviceModel extends Model {
    /** table (name) : E2EERegisteredDevices */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    // Device identifier from the server
    deviceId: string;

    // Public key for signature verification (nullable)
    signaturePublicKey: string | null;

    // Whether this record represents the current device
    isCurrentDevice: boolean;

    // Whether the device is verified
    verified: boolean;
}

export default E2EERegisteredDeviceModel;
