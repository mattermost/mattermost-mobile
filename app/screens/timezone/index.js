// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getSupportedTimezones} from 'mattermost-redux/actions/general';
import {getSupportedTimezones as getTimezones} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {updateUser} from 'app/actions/views/edit_profile';

import Timezone from './timezone';

const getTimezone = (user) => {
    if (user && user.timezone) {
        return {
            ...user.timezone,
            useAutomaticTimezone: user.timezone.useAutomaticTimezone === 'true',
        };
    }

    return {
        useAutomaticTimezone: true,
        automaticTimezone: '',
        manualTimezone: '',
    };
};

function mapStateToProps(state) {
    const timezones = getTimezones(state);
    const currentUser = getCurrentUser(state);
    const userTimezone = getTimezone(currentUser);

    return {
        user: currentUser,
        theme: getTheme(state),
        userTimezone,
        timezones,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getSupportedTimezones,
            updateUser,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Timezone);
