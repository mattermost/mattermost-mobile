// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getConnection} from 'app/selectors/device';
import {connect} from 'react-redux';

import RefreshList from './refresh_list';

function mapStateToProps(state) {
    const networkOnline = getConnection(state);
    let {refreshing} = state.views.channel;

    if (!networkOnline) {
        refreshing = false;
    }

    return {
        refreshing,
    };
}

export default connect(mapStateToProps)(RefreshList);
