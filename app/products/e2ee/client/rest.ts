// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from '@client/rest/base';

export interface ClientE2EEMix {
    getE2EERoute: () => string;

    // Devices
    fetchDevices: () => Promise<EnabledDevicesReturn>;
}

const ClientE2EE = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getE2EERoute = () => {
        return '/plugins/e2ee/api/v1';
    };

    fetchDevices = async () => {
        const devices = await this.doFetch(
            `${this.getE2EERoute()}/devices`,
            {method: 'get'},
        );

        return devices || {devices: []};
    };

};

export default ClientE2EE;
