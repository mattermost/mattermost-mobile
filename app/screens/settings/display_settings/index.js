// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {isTimezoneEnabled} from 'app/utils/timezone';

import DisplaySettings from './display_settings';

function mapStateToProps(state) {
    const enableTimezone = isTimezoneEnabled(state);

    return {
        enableTimezone,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(DisplaySettings);
