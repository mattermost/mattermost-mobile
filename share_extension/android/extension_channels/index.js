// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    getExtensionSortedDirectChannels,
    getExtensionSortedPrivateChannels,
    getExtensionSortedPublicChannels,
} from 'share_extension/common/selectors';
import {searchChannelsTyping, makeDirectChannel} from 'share_extension/android/actions';
import {searchProfiles} from 'mattermost-redux/actions/users';
import {General} from 'mattermost-redux/constants';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import ExtensionChannels from './extension_channels';

function mapStateToProps(state) {
    const config = getConfig(state);
    const restrictDirectMessage = config.RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_ANY;

    return {
        restrictDirectMessage,
        publicChannels: getExtensionSortedPublicChannels(state),
        privateChannels: getExtensionSortedPrivateChannels(state),
        directChannels: getExtensionSortedDirectChannels(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            searchChannelsTyping,
            searchProfiles,
            makeDirectChannel,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ExtensionChannels);
