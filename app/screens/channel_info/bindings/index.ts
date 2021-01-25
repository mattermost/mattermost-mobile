// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {AppsBindings} from '@mm-redux/constants/apps';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {GlobalState} from '@mm-redux/types/store';

import Bindings from './bindings';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {shouldProcessApps} from '@utils/apps';

function mapStateToProps(state: GlobalState) {
    const processApps = shouldProcessApps(state);
    const currentChannel = getCurrentChannel(state) || {};
    const bindings = processApps ? getAppsBindings(state, AppsBindings.CHANNEL_HEADER_ICON) : [];
    const currentUser = getCurrentUser(state) || {};

    return {
        bindings,
        currentChannel,
        currentUser,
        shouldProcessApps: processApps,
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Bindings);
