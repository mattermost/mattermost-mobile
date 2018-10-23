// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {isTimezoneEnabled} from 'app/utils/timezone';

import DisplaySettings from './display_settings';
import {getAllowedThemes} from 'app/utils/theme';

function mapStateToProps(state) {
    const enableTimezone = isTimezoneEnabled(state);
    const enableTheme = getAllowedThemes(state).length > 1;

    return {
        enableTheme,
        enableTimezone,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(DisplaySettings);
