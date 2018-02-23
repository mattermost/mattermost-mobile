// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'mattermost-redux/utils/key_mirror';
import RNFetchBlob from 'react-native-fetch-blob';

const deviceTypes = keyMirror({
    CONNECTION_CHANGED: null,
    DEVICE_DIMENSIONS_CHANGED: null,
    DEVICE_TYPE_CHANGED: null,
    DEVICE_ORIENTATION_CHANGED: null,
    STATUSBAR_HEIGHT_CHANGED: null,
});

export default {
    ...deviceTypes,
    DOCUMENTS_PATH: `${RNFetchBlob.fs.dirs.CacheDir}/Documents`,
    VIDEOS_PATH: `${RNFetchBlob.fs.dirs.CacheDir}/Videos`,
};
