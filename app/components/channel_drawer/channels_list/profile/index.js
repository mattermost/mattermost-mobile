// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {setStatus} from 'mattermost-redux/actions/users';
import Profile from './profile';

function mapStateToProps(state) {
    return {
        currentUser: getCurrentUser(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setStatus
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile);
