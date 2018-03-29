// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setChannelDisplayName} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import UserProfile from './user_profile';

function mapStateToProps(state, ownProps) {
    const {config} = state.entities.general;
    const {createChannel: createChannelRequest} = state.requests.channels;

    return {
        navigator: ownProps.navigator,
        config,
        createChannelRequest,
        currentChannel: getCurrentChannel(state) || {},
        currentDisplayName: state.views.channel.displayName,
        currentUserId: getCurrentUserId(state),
        user: state.entities.users.profiles[ownProps.userId],
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            makeDirectChannel,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(UserProfile);
