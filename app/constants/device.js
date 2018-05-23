// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'mattermost-redux/utils/key_mirror';
import RNFetchBlobFS from 'react-native-fetch-blob/fs';

const deviceTypes = keyMirror({
    CONNECTION_CHANGED: null,
    DEVICE_DIMENSIONS_CHANGED: null,
    DEVICE_TYPE_CHANGED: null,
    DEVICE_ORIENTATION_CHANGED: null,
    STATUSBAR_HEIGHT_CHANGED: null,
});

export default {
    ...deviceTypes,
    DOCUMENTS_PATH: `${RNFetchBlobFS.dirs.CacheDir}/Documents`,
    IMAGES_PATH: `${RNFetchBlobFS.dirs.CacheDir}/Images`,
    VIDEOS_PATH: `${RNFetchBlobFS.dirs.CacheDir}/Videos`,
};
