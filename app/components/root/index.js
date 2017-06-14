// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import DeviceInfo from 'react-native-device-info';

import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';

import {getTheme} from 'app/selectors/preferences';
import {removeProtocol} from 'app/utils/url';

import Root from './root';

function mapStateToProps(state, ownProps) {
    const users = state.entities.users;
    const {currentUserId} = users;

    let locale = DeviceInfo.getDeviceLocale().split('-')[0];
    if (currentUserId && users.profiles[currentUserId]) {
        locale = users.profiles[currentUserId].locale;
    }

    return {
        ...ownProps,
        theme: getTheme(state),
        currentChannelId: getCurrentChannelId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        locale
    };
}

export default connect(mapStateToProps)(Root);
