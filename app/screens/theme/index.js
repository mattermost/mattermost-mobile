// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getAllowedThemes} from 'app/utils/theme';

import Theme from './theme';

const mapStateToProps = (state) => ({
    userId: getCurrentUserId(state),
    teamId: getCurrentTeamId(state),
    theme: getTheme(state),
    allowedThemes: getAllowedThemes(state),
});

const mapDispatchToProps = (dispatch) => ({
    actions: bindActionCreators({
        savePreferences,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(Theme);
