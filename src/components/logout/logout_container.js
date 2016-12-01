// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {logout} from 'actions/users';

import Logout from './logout.js';

function mapStateToProps(state) {
    return {
        logout: state.requests.users.logout
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({logout}, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Logout);
