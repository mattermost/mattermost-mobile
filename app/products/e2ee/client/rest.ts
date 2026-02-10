// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from '@client/rest/base';

export interface ClientE2EEMix {
    getE2EERoute: () => string;

    // Devices
    fetchDevices: () => Promise<EnabledDevicesReturn>;
    registerDevice: (signaturePublicKey: string, deviceName: string) => Promise<string>;
}

const ClientE2EE = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getE2EERoute = () => {
        return '/plugins/mattermost-e2ee/v1';
    };

    fetchDevices = async () => {
        const result = await this.doFetch(
            `${this.getE2EERoute()}/devices`,
            {method: 'get'},
        );

        if (Array.isArray(result)) {
            return {devices: result};
        }
        return {devices: []};
    };

    registerDevice = async (signaturePublicKey: string, deviceName: string) => {
        return this.doFetch(`${this.getE2EERoute()}/devices`, {
            body: {
                signature_public_key: signaturePublicKey,
                device_name: deviceName,
            },
            method: 'post',
        });
    };

};

export default ClientE2EE;
