// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import SlashSuggestionItem from './slash_suggestion_item';

const SLASH_REGEX = /(^\/)([a-zA-Z-]*)$/;
const TIME_BEFORE_NEXT_COMMAND_REQUEST = 1000 * 60 * 5;

export default class SlashSuggestion extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            getAutocompleteCommands: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        commands: PropTypes.array,
        commandsRequest: PropTypes.object.isRequired,
        isSearch: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        value: PropTypes.string,
    };

    static defaultProps = {
        defaultChannel: {},
        value: '',
    };

    state = {
        active: false,
        suggestionComplete: false,
        dataSource: [],
        lastCommandRequest: 0,
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.isSearch) {
            return;
        }

        const {currentTeamId} = this.props;
        const {
            commands: nextCommands,
            commandsRequest: nextCommandsRequest,
            currentTeamId: nextTeamId,
            value: nextValue,
        } = nextProps;

        if (currentTeamId !== nextTeamId) {
            this.setState({
                lastCommandRequest: 0,
            });
        }

        const match = nextValue.match(SLASH_REGEX);

        if (!match || this.state.suggestionComplete) {
            this.setState({
                active: false,
                matchTerm: null,
                suggestionComplete: false,
            });
            this.props.onResultCountChange(0);
            return;
        }

        const dataIsStale = Date.now() - this.state.lastCommandRequest > TIME_BEFORE_NEXT_COMMAND_REQUEST;

        if ((!nextCommands.length || dataIsStale) && nextCommandsRequest.status !== RequestStatus.STARTED) {
            this.props.actions.getAutocompleteCommands(nextProps.currentTeamId);
            this.setState({
                lastCommandRequest: Date.now(),
            });
        }

        const matchTerm = match[2];

        const data = this.filterSlashSuggestions(matchTerm, nextCommands);

        this.setState({
            active: data.length,
            dataSource: data,
        });

        this.props.onResultCountChange(data.length);
    }

    filterSlashSuggestions = (matchTerm, commands) => {
        return commands.filter((command) => {
            if (!command.auto_complete) {
                return false;
            } else if (!matchTerm) {
                return true;
            }

            return command.display_name.startsWith(matchTerm) || command.trigger.startsWith(matchTerm);
        });
    }

    completeSuggestion = (command) => {
        const {onChangeText} = this.props;

        const completedDraft = `/${command} `;

        onChangeText(completedDraft);

        this.setState({
            active: false,
            suggestionComplete: true,
        });
    };

    keyExtractor = (item) => item.id || item.trigger;

    renderItem = ({item}) => (
        <SlashSuggestionItem
            displayName={item.display_name}
            description={item.auto_complete_desc}
            hint={item.auto_complete_hint}
            onPress={this.completeSuggestion}
            theme={this.props.theme}
            trigger={item.trigger}
        />
    )

    render() {
        if (!this.state.active) {
            // If we are not in an active state return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const style = getStyleFromTheme(this.props.theme);

        return (
            <FlatList
                keyboardShouldPersistTaps='always'
                style={style.listView}
                extraData={this.state}
                data={this.state.dataSource}
                keyExtractor={this.keyExtractor}
                renderItem={this.renderItem}
                pageSize={10}
                initialListSize={10}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
    };
});
