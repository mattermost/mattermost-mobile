// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {makeGetMatchTermForDateMention} from 'app/selectors/autocomplete';
import {getCurrentLocale} from 'app/selectors/i18n';

import DateSuggestion from './date_suggestion';

function makeMapStateToProps() {
    const getMatchTermForDateMention = makeGetMatchTermForDateMention();

    return (state, ownProps) => {
        const {cursorPosition, value} = ownProps;

        const newValue = value.substring(0, cursorPosition);
        const matchTerm = getMatchTermForDateMention(newValue);

        return {
            matchTerm,
            locale: getCurrentLocale(state),
            theme: getTheme(state),
        };
    };
}

export default connect(makeMapStateToProps)(DateSuggestion);
