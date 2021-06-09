// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Preferences} from '@mm-redux/constants';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {getBool} from '@mm-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {getUserCurrentTimezone} from '@mm-redux/utils/timezone_utils';

import type {GlobalState} from '@mm-redux/types/store';
import type {UserProfile} from '@mm-redux/types/users';

import SystemHeader from './system_header';

export function mapStateToProps(state: GlobalState) {
    const currentUser: UserProfile | undefined = getCurrentUser(state);
    const isMilitaryTime = getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time');
    const enableTimezone = isTimezoneEnabled(state);
    const userTimezone = enableTimezone ? getUserCurrentTimezone(currentUser.timezone) : '';

    return {
        isMilitaryTime,
        userTimezone,
    };
}

export default connect(mapStateToProps)(SystemHeader);
