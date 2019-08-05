// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getSupportedTimezones} from 'mattermost-redux/actions/general';
import {getSupportedTimezones as getTimezones} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getUserTimezone} from 'mattermost-redux/selectors/entities/timezone';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {isLandscape} from 'app/selectors/device';
import {goToScreen} from 'app/actions/navigation';
import {updateUser} from 'app/actions/views/edit_profile';

import Timezone from './timezone';

function mapStateToProps(state) {
    const timezones = getTimezones(state);
    const currentUser = getCurrentUser(state) || {};
    const userTimezone = getUserTimezone(state, currentUser.id);

    return {
        user: currentUser,
        theme: getTheme(state),
        userTimezone,
        timezones,
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getSupportedTimezones,
            updateUser,
            goToScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Timezone);
