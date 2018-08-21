// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {
    getMatchTermForDateMention,
} from 'app/selectors/autocomplete';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import DateSuggestion from './date_suggestion';

function mapStateToProps(state, ownProps) {
    const {cursorPosition} = ownProps;

    const value = ownProps.value.substring(0, cursorPosition);
    const matchTerm = getMatchTermForDateMention(value);

    return {
        currentTeamId: getCurrentTeamId(state),
        matchTerm,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({}, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(DateSuggestion);
