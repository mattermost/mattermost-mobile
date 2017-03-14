// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {handleSendMessage} from 'app/actions/views/user_profile';
import {getTheme} from 'app/selectors/preferences';

import UserProfile from './user_profile';

import navigationSceneConnect from '../navigationSceneConnect';

function mapStateToProps(state, ownProps) {
    return {
        currentUserId: state.entities.users.currentUserId,
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

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(UserProfile);
