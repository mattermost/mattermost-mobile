// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import Config from 'config';

import RootLayout from './root_layout';

function mapStateToProps(state, ownProps) {
    const users = state.entities.users;
    const currentUserId = users.currentId;

    let locale = Config.DefaultLocale;
    if (currentUserId && users.profiles[currentUserId]) {
        locale = users.profiles[currentUserId].locale;
    }

    return {
        ...ownProps,
        locale
    };
}

export default connect(mapStateToProps)(RootLayout);
