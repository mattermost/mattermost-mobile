// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Platform,
} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';

import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
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
        maxListHeight: PropTypes.number,
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

        // We are going to set a double / on iOS to prevent the auto correct from taking over and replacing it
        // with the wrong value, this is a hack but I could not found another way to solve it
        let completedDraft = `/${command} `;
        if (Platform.OS === 'ios') {
            completedDraft = `//${command} `;
        }

        onChangeText(completedDraft);

        if (Platform.OS === 'ios') {
            // This is the second part of the hack were we replace the double / with just one
            // after the auto correct vanished
            setTimeout(() => {
                onChangeText(completedDraft.replace(`//${command} `, `/${command} `));
            });
        }

        this.setState({
            active: false,
            suggestionComplete: true,
        });
    };

    keyExtractor = (item) => item.id || item.trigger;

    renderItem = ({item}) => (
        <SlashSuggestionItem
            description={item.auto_complete_desc}
            hint={item.auto_complete_hint}
            onPress={this.completeSuggestion}
            theme={this.props.theme}
            trigger={item.trigger}
        />
    )

    render() {
        const {maxListHeight, theme} = this.props;

        if (!this.state.active) {
            // If we are not in an active state return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const style = getStyleFromTheme(theme);

        return (
            <FlatList
                keyboardShouldPersistTaps='always'
                style={[style.listView, {maxHeight: maxListHeight}]}
                extraData={this.state}
                data={this.state.dataSource}
                keyExtractor={this.keyExtractor}
                renderItem={this.renderItem}
                ItemSeparatorComponent={AutocompleteDivider}
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
