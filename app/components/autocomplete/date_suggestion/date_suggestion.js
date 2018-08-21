// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {CalendarList} from 'react-native-calendars';

import {DATE_MENTION_SEARCH_REGEX} from 'app/constants/autocomplete';

export default class DateSuggestion extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({}),
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        isSearch: PropTypes.bool,
        listHeight: PropTypes.number,
        matchTerm: PropTypes.string,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    static defaultProps = {
        isSearch: false,
        value: '',
    };

    constructor(props) {
        super(props);

        this.state = {
            mentionComplete: false,
            sections: [],
        };
    }

    componentWillReceiveProps(nextProps) {
        const {matchTerm} = nextProps;

        if ((matchTerm !== this.props.matchTerm && matchTerm === null) || this.state.mentionComplete) {
            // if the term changes but is null or the mention has been completed we render this component as null
            this.setState({
                mentionComplete: false,
                sections: [],
            });

            this.props.onResultCountChange(0);
        }
    }

    completeMention = (day) => {
        const mention = day.dateString;
        const {cursorPosition, isSearch, onChangeText, value} = this.props;
        const mentionPart = value.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            let dateFilter = '';
            if (mentionPart.includes('on:')) {
                dateFilter = 'on:';
            } else if (mentionPart.includes('before:')) {
                dateFilter = 'before:';
            } else if (mentionPart.includes('after:')) {
                dateFilter = 'after:';
            }

            completedDraft = mentionPart.replace(DATE_MENTION_SEARCH_REGEX, `${dateFilter} ${mention} `);
        }

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        onChangeText(completedDraft, true);
        this.props.onResultCountChange(1);
        this.setState({mentionComplete: true});
    };

    render() {
        const {mentionComplete} = this.state;

        if (this.props.matchTerm === null || mentionComplete) {
            // If we are not in an active state or the mention has been completed return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        return (
            <CalendarList
                style={{height: 1700}}
                current={(new Date()).toDateString()}
                pastScrollRange={24}
                futureScrollRange={0}
                scrollingEnabled={true}
                pagingEnabled={true}
                hideArrows={true}
                horizontal={true}
                showScrollIndicator={true}
                onDayPress={this.completeMention}
                showWeekNumbers={true}
            />
        );
    }
}
