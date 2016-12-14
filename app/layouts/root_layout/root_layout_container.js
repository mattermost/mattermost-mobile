// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import Config from 'config/index';

import {goToSelectTeam} from 'app/actions/navigation';
import {goToSelectServer, setStoreFromLocalData} from 'app/actions/views/root';
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
        locale,
        users,
        storage: state.storage.info
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToSelectTeam,
            goToSelectServer,
            setStoreFromLocalData
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RootLayout);
