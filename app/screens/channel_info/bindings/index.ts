// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getAppBindings} from '@mm-redux/selectors/entities/apps';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {GlobalState} from '@mm-redux/types/store';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';

import {shouldProcessApps} from '@utils/apps';
import {doAppCall} from '@actions/apps';

import Bindings from './bindings';

function mapStateToProps(state: GlobalState) {
    const processApps = shouldProcessApps(state);
    const currentChannel = getCurrentChannel(state) || {};
    const bindings = processApps ? getAppBindings(state, AppBindingLocations.CHANNEL_HEADER_ICON) : [];
    const currentUser = getCurrentUser(state) || {};

    return {
        bindings,
        currentChannel,
        currentUser,
        shouldProcessApps: processApps,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Bindings);
