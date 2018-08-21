// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

// import {searchChannels} from 'mattermost-redux/actions/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {
    // filterMyChannels,
    // filterOtherChannels,
    // filterPublicChannels,
    // filterPrivateChannels,
    getMatchTermForDateMention,
} from 'app/selectors/autocomplete';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import DateSuggestion from './date_suggestion';

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch} = ownProps;

    const value = ownProps.value.substring(0, cursorPosition);
    const matchTerm = getMatchTermForDateMention(value, isSearch);

    // let myChannels;
    // let otherChannels;
    // let publicChannels;
    // let privateChannels;
    // if (isSearch) {
    //     publicChannels = filterPublicChannels(state, matchTerm);
    //     privateChannels = filterPrivateChannels(state, matchTerm);
    // } else {
    //     myChannels = filterMyChannels(state, matchTerm);
    //     otherChannels = filterOtherChannels(state, matchTerm);
    // }

    return {
        // myChannels,
        // otherChannels,
        // publicChannels,
        // privateChannels,
        currentTeamId: getCurrentTeamId(state),
        matchTerm,
        requestStatus: state.requests.channels.getChannels.status,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({}, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(DateSuggestion);
