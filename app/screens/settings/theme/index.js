// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {savePreferences} from 'mattermost-redux/actions/preferences';

import {getAllowedThemes, getCustomTheme} from 'app/selectors/theme';
import {isLandscape, isTablet} from 'app/selectors/device';

import Theme from './theme';

const mapStateToProps = (state) => ({
    allowedThemes: getAllowedThemes(state),
    customTheme: getCustomTheme(state),
    isLandscape: isLandscape(state),
    isTablet: isTablet(state),
    teamId: getCurrentTeamId(state),
    theme: getTheme(state),
    userId: getCurrentUserId(state),
});

const mapDispatchToProps = (dispatch) => ({
    actions: bindActionCreators({
        savePreferences,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(Theme);
