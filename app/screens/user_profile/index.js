// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleSendMessage} from 'app/actions/views/user_profile';
import {getTheme} from 'app/selectors/preferences';

import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import UserProfile from './user_profile';

function mapStateToProps(state, ownProps) {
    const {config} = state.entities.general;

    return {
        navigator: ownProps.navigator,
        config,
        currentUserId: getCurrentUserId(state),
        user: state.entities.users.profiles[ownProps.userId],
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSendMessage
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(UserProfile);
