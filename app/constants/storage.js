// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const StorageTypes = keyMirror({
    SAVE_TO_STORAGE: null,
    SAVE_TO_STORAGE_ERROR: null,
    LOAD_FROM_STORAGE: null,
    LOAD_FROM_STORAGE_ERROR: null,
    REMOVE_FROM_STORAGE: null,
    REMOVE_FROM_STORAGE_ERROR: null
});

export default StorageTypes;
