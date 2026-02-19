// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from '@client/rest/base';

export interface ClientE2EEMix {
    getE2EERoute: () => string;

    // Devices
    fetchDevices: () => Promise<RegisteredDevicesReturn>;
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

        return {devices: Array.isArray(result) ? result : []};
    };

};

export default ClientE2EE;
