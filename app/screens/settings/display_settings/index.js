// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {isTimezoneEnabled} from 'app/utils/timezone';
import {isThemeSwitchingEnabled} from 'app/utils/theme';

import DisplaySettings from './display_settings';
import {getAllowedThemes} from 'app/selectors/theme';

function mapStateToProps(state) {
    const enableTimezone = isTimezoneEnabled(state);
    const enableTheme = isThemeSwitchingEnabled(state) && getAllowedThemes(state).length > 1;

    return {
        enableTheme,
        enableTimezone,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(DisplaySettings);
