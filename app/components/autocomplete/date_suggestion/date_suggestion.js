// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {RequestStatus} from 'mattermost-redux/constants';

import {DATE_MENTION_SEARCH_REGEX} from 'app/constants/autocomplete';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import { CalendarList } from 'react-native-calendars';

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
        requestStatus: PropTypes.string.isRequired,
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
            sections: [],
        };
    }

    componentWillReceiveProps(nextProps) {
        const {isSearch, matchTerm, requestStatus} = nextProps;

        if ((matchTerm !== this.props.matchTerm && matchTerm === null) || this.state.mentionComplete) {
            // if the term changes but is null or the mention has been completed we render this component as null
            this.setState({
                mentionComplete: false,
                sections: [],
            });

            this.props.onResultCountChange(0);

            return;
        } else if (matchTerm === null) {
            // if the terms did not change but is null then we don't need to do anything
            return;
        }

        if (requestStatus !== RequestStatus.STARTED) {
            // if the request is complete and the term is not null we show the autocomplete
            this.setState({
                isDateFilter: 1,
            });

            this.props.onResultCountChange(1);
        }
    }

    completeMention = (day) => {
        const mention = day.dateString;
        const {cursorPosition, isSearch, onChangeText, value} = this.props;
        const mentionPart = value.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            const dateFilter = '';
            if(mentionPart.includes('on:')) {
                dateFilter = 'on:';
            } else if(mentionPart.includes('before:')) {
                dateFilter = 'before:';
            } else if(mentionPart.includes('after:')) {
                dateFilter = 'after:';
            }

            completedDraft = mentionPart.replace(DATE_MENTION_SEARCH_REGEX, `${dateFilter} ${mention} `);
        }

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        onChangeText(completedDraft, true);
        this.setState({mentionComplete: true});
    };

    render() {
        const {isSearch, listHeight, theme} = this.props;
        const {mentionComplete, isDateFilter} = this.state;

        if (isDateFilter !== 1 || mentionComplete) {
            // If we are not in an active state or the mention has been completed return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const style = getStyleFromTheme(theme);

        return (
            <CalendarList
                pastScrollRange={36}
                futureScrollRange={1}
                scrollEnabled={true}
                showScrollIndicator={true}
                onDayPress={this.completeMention}
                showWeekNumbers={true}
            />                                
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
        },
        search: {
            minHeight: 125,
        },
    };
});
