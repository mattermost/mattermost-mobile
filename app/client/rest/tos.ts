// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface ClientTosMix {
    updateMyTermsOfServiceStatus: (termsOfServiceId: string, accepted: boolean) => Promise<any>;
    getTermsOfService: () => Promise<any>;
}

const ClientTos = (superclass: any) => class extends superclass {
    updateMyTermsOfServiceStatus = async (termsOfServiceId: string, accepted: boolean) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/terms_of_service`,
            {method: 'post', body: JSON.stringify({termsOfServiceId, accepted})},
        );
    }

    getTermsOfService = async () => {
        return this.doFetch(
            `${this.getBaseRoute()}/terms_of_service`,
            {method: 'get'},
        );
    }
};

export default ClientTos;
