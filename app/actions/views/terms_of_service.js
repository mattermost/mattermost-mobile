// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as UserActions from 'mattermost-redux/actions/users';

import {store} from 'app/mattermost';

const {dispatch, getState} = store;

export async function updateTermsOfServiceStatus(termsId, accepted, success, error) {
    const {data, error: err} = await UserActions.updateServiceTermsStatus(termsId, accepted)(dispatch, getState);
    if (data && success) {
        success(data);
    } else if (err && error) {
        error({id: err.server_error_id, ...err});
    }
}

export async function getTermsOfService(success, error) {
    const {data, error: err} = await UserActions.getServiceTerms()(dispatch, getState);
    if (data && success) {
        success(data);
    } else if (err && error) {
        error({id: err.server_error_id, ...err});
    }
}
