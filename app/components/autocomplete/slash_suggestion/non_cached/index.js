// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {isLandscape} from 'app/selectors/device';

import SlashSuggestionNonCached from './slash_suggestion';

function mapStateToProps(state) {
    return {
        currentTeamId: getCurrentTeamId(state),
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps)(SlashSuggestionNonCached);