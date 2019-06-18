// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from 'mattermost-redux/selectors/entities/timezone';
import {getUserCurrentTimezone} from 'mattermost-redux/utils/timezone_utils';

import DateHeader from './date_header';

function mapStateToProps(state) {
    const enableTimezone = isTimezoneEnabled(state);
    const currentUser = getCurrentUser(state);
    let timeZone = null;

    if (enableTimezone) {
        timeZone = getUserCurrentTimezone(currentUser.timezone);
    }

    return {
        theme: getTheme(state),
        timeZone,
    };
}

export default connect(mapStateToProps)(DateHeader);

