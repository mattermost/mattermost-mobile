// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function addFileToFetchCache(url) {
    return {
        type: ViewTypes.ADD_FILE_TO_FETCH_CACHE,
        url,
    };
}
