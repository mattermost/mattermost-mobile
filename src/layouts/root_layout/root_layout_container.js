// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import Config from 'config';

import RootLayout from './root_layout';

function mapStateToProps(state, ownProps) {
    let locale = Config.DefaultLocale;
    if (state.entities.users.currentId && state.entities.users.profiles[state.entities.users.currentId]) {
        locale = state.entities.users.profiles[state.entities.users.currentId].locale;
    }

    return {
        ...ownProps,
        locale
    };
}

export default connect(mapStateToProps)(RootLayout);
