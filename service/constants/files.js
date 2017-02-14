// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const FilesTypes = keyMirror({
    FETCH_FILES_FOR_POST_REQUEST: null,
    FETCH_FILES_FOR_POST_SUCCESS: null,
    FETCH_FILES_FOR_POST_FAILURE: null,

    RECEIVED_FILES_FOR_POST: null
});

export default FilesTypes;
