// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {isLandscape, isTablet} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import SettingsDrawer from './settings_drawer.js';

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;

    return {
        ...ownProps,
        currentUserId,
        isLandscape: isLandscape(state),
        isTablet: isTablet(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps, null)(SettingsDrawer);
