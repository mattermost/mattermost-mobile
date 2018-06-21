// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setChannelDisplayName} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';

import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import UserProfile from './user_profile';

function mapStateToProps(state, ownProps) {
    const config = getConfig(state);
    const {createChannel: createChannelRequest} = state.requests.channels;

    return {
        config,
        createChannelRequest,
        currentDisplayName: state.views.channel.displayName,
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
