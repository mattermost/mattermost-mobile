// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import {setChannelDisplayName} from 'app/actions/views/channel';

import List from './list';

function mapStateToProps(state, ownProps) {
    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';

    return {
        canCreatePrivateChannels: showCreateOption(config, license, General.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setChannelDisplayName
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(List);
