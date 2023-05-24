// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientTosMix {
    updateMyTermsOfServiceStatus: (termsOfServiceId: string, accepted: boolean) => Promise<{status: string}>;
    getTermsOfService: () => Promise<TermsOfService>;
}

const ClientTos = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    updateMyTermsOfServiceStatus = async (termsOfServiceId: string, accepted: boolean) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/terms_of_service`,
            {method: 'post', body: {termsOfServiceId, accepted}},
        );
    };

    getTermsOfService = async () => {
        return this.doFetch(
            `${this.urlVersion}/terms_of_service`,
            {method: 'get'},
        );
    };
};

export default ClientTos;
