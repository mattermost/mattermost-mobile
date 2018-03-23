// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function handleSearchDraftChanged(text) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.SEARCH_DRAFT_CHANGED,
            text,
        }, getState);
    };
}
