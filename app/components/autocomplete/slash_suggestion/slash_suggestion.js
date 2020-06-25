// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Platform,
} from 'react-native';

import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import SlashSuggestionItem from './slash_suggestion_item';
import CommandAutocomplete from './command_autocomplete/command_autocomplete';

const TIME_BEFORE_NEXT_COMMAND_REQUEST = 1000 * 60 * 5;
const TIME_BEFORE_NEXT_DYNAMIC_ARGUMENTS_REQUEST = 100 * 60 * 1;

export default class SlashSuggestion extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getAutocompleteCommands: PropTypes.func.isRequired,
            getDynamicAutocompleteSuggestions: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        commands: PropTypes.array,
        dynamicArguments: PropTypes.object,
        isSearch: PropTypes.bool,
        maxListHeight: PropTypes.number,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        value: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
        nestedScrollEnabled: PropTypes.bool,
    };

    static defaultProps = {
        defaultChannel: {},
        value: '',
    };

    state = {
        active: false,
        dataSource: [],
        lastCommandRequest: 0,
        dynamicArgumentsLastFetch: {},
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.isSearch) {
            return;
        }

        const {currentTeamId} = this.props;
        const {
            commands: nextCommands,
            currentTeamId: nextTeamId,
            value: nextValue,
            dynamicArguments: nextDynamicArguments,
        } = nextProps;

        if (currentTeamId !== nextTeamId) {
            this.setState({
                lastCommandRequest: 0,
            });
        }

        if (nextValue[0] !== '/') {
            this.setState({
                active: false,
                matchTerm: null,
            });
            this.props.onResultCountChange(0);
            return;
        }

        const dataIsStale = Date.now() - this.state.lastCommandRequest > TIME_BEFORE_NEXT_COMMAND_REQUEST;

        if (!nextCommands.length || dataIsStale) {
            this.props.actions.getAutocompleteCommands(nextProps.currentTeamId);
            this.setState({
                lastCommandRequest: Date.now(),
            });
        }

        const data = this.filterSlashSuggestions(nextValue.substring(1), nextCommands, nextDynamicArguments);
        this.setState({
            active: data.length,
            dataSource: data,
        });

        this.props.onResultCountChange(data.length);
    }

    filterSlashSuggestions = (matchTerm, commands, dynamicArguments) => {
        const autocompleteData = commands.map((command) => {
            if (command.autocomplete_data) {
                return command.autocomplete_data;
            }
            return {
                Trigger: command.trigger,
                HelpText: command.auto_complete_desc,
                Hint: command.auto_complete_hint,
            };
        });
        const commandAutocomplete = new CommandAutocomplete(this.updateDynamicAutocompleteSuggestions);
        return commandAutocomplete.getSuggestions(autocompleteData, dynamicArguments, '', matchTerm);
    }

    updateDynamicAutocompleteSuggestions = (url, parsed, toBeParsed) => {
        if (!this.state.dynamicArgumentsLastFetch[url] ||
            Date.now() - this.state.dynamicArgumentsLastFetch[url] > TIME_BEFORE_NEXT_DYNAMIC_ARGUMENTS_REQUEST) {
            this.props.actions.getDynamicAutocompleteSuggestions(url, parsed, toBeParsed, this.props.currentTeamId);
            const nextDynamicArgumentsLastFetch = {...this.state.dynamicArgumentsLastFetch};
            nextDynamicArgumentsLastFetch[url] = Date.now();
            this.setState({
                dynamicArgumentsLastFetch: nextDynamicArgumentsLastFetch,
            });
        }
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
    };

    keyExtractor = (item) => item.id || item.Suggestion;

    renderItem = ({item}) => (
        <SlashSuggestionItem
            description={item.Description}
            hint={item.Hint}
            onPress={this.completeSuggestion}
            theme={this.props.theme}
            suggestion={item.Suggestion}
            complete={item.Complete}
            isLandscape={this.props.isLandscape}
        />
    )

    render() {
        const {maxListHeight, theme, nestedScrollEnabled} = this.props;

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
                nestedScrollEnabled={nestedScrollEnabled}
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
