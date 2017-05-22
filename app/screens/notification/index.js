// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToNotification} from 'app/actions/views/root';
import {getTheme} from 'app/selectors/preferences';

import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getUser} from 'mattermost-redux/selectors/entities/users';

import Notification from './notification';

function mapStateToProps(state, ownProps) {
    const {data} = ownProps.notification;

    let user;
    if (data.sender_id) {
        user = getUser(state, data.sender_id);
    }

    let channel;
    if (data.channel_id) {
        channel = getChannel(state, data.channel_id);
    }

    return {
        ...ownProps,
        config: state.entities.general.config,
        channel,
        user,
        myPreferences: getMyPreferences(state),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToNotification
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Notification);
