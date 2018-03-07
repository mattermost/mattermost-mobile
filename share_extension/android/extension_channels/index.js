// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {
    getExtensionSortedDirectChannels,
    getExtensionSortedPrivateChannels,
    getExtensionSortedPublicChannels,
} from 'share_extension/android/selectors';

import ExtensionChannels from './extension_channels';

function mapStateToProps(state) {
    return {
        publicChannels: getExtensionSortedPublicChannels(state),
        privateChannels: getExtensionSortedPrivateChannels(state),
        directChannels: getExtensionSortedDirectChannels(state),
    };
}

export default connect(mapStateToProps)(ExtensionChannels);
