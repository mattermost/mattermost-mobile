// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Platform,
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import SlashSuggestionItem from './slash_suggestion_item';
import {Client4} from '@mm-redux/client';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {analytics} from '@init/analytics.ts';

const TIME_BEFORE_NEXT_COMMAND_REQUEST = 1000 * 60 * 5;

export default class SlashSuggestion extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getAutocompleteCommands: PropTypes.func.isRequired,
            getCommandAutocompleteSuggestions: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        commands: PropTypes.array,
        isSearch: PropTypes.bool,
        maxListHeight: PropTypes.number,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        value: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
        nestedScrollEnabled: PropTypes.bool,
        suggestions: PropTypes.array,
        rootId: PropTypes.string,
        channelId: PropTypes.string,
    };

    static defaultProps = {
        defaultChannel: {},
        value: '',
    };

    state = {
        active: false,
        dataSource: [],
        lastCommandRequest: 0,
    };

    componentWillReceiveProps(nextProps) {
        if ((nextProps.value === this.props.value && nextProps.suggestions === this.props.suggestions && nextProps.commands === this.props.commands) ||
            nextProps.isSearch || nextProps.value.startsWith('//') || !nextProps.channelId) {
            return;
        }

        const {currentTeamId} = this.props;
        const {
            commands: nextCommands,
            currentTeamId: nextTeamId,
            value: nextValue,
            suggestions: nextSuggestions,
        } = nextProps;

        if (nextValue[0] !== '/') {
            this.setState({
                active: false,
            });
            this.props.onResultCountChange(0);
            return;
        }

        if (nextValue.indexOf(' ') === -1) { // return suggestions for a top level cached commands
            if (currentTeamId !== nextTeamId) {
                this.setState({
                    lastCommandRequest: 0,
                });
            }

            const dataIsStale = Date.now() - this.state.lastCommandRequest > TIME_BEFORE_NEXT_COMMAND_REQUEST;

            if ((!nextCommands.length || dataIsStale)) {
                this.props.actions.getAutocompleteCommands(nextProps.currentTeamId);
                this.setState({
                    lastCommandRequest: Date.now(),
                });
            }

            const matches = this.filterSlashSuggestions(nextValue.substring(1), nextCommands);
            this.updateSuggestions(matches);
        } else if (isMinimumServerVersion(Client4.getServerVersion(), 5, 24)) {
            if (nextSuggestions === this.props.suggestions) {
                const args = {
                    channel_id: this.props.channelId,
                    ...(this.props.rootId && {root_id: this.props.rootId, parent_id: this.props.rootId}),
                };
                this.props.actions.getCommandAutocompleteSuggestions(nextValue, nextTeamId, args);
            } else {
                const matches = [];
                nextSuggestions.forEach((sug) => {
                    if (!this.contains(matches, '/' + sug.Complete)) {
                        matches.push({
                            Complete: sug.Complete,
                            Suggestion: sug.Suggestion,
                            Hint: sug.Hint,
                            Description: sug.Description,
                        });
                    }
                });
                this.updateSuggestions(matches);
            }
        } else {
            this.setState({
                active: false,
            });
        }
    }

    updateSuggestions = (matches) => {
        this.setState({
            active: matches.length,
            dataSource: matches,
        });
        this.props.onResultCountChange(matches.length);
    }

    filterSlashSuggestions = (matchTerm, commands) => {
        const data = commands.filter((command) => {
            if (!command.auto_complete) {
                return false;
            } else if (!matchTerm) {
                return true;
            }

            return command.display_name.startsWith(matchTerm) || command.trigger.startsWith(matchTerm);
        });
        return data.map((item) => {
            return {
                Complete: item.trigger,
                Suggestion: '/' + item.trigger,
                Hint: item.auto_complete_hint,
                Description: item.auto_complete_desc,
            };
        });
    }

    contains = (matches, complete) => {
        return matches.findIndex((match) => match.complete === complete) !== -1;
    }

    completeSuggestion = (command) => {
        const {onChangeText} = this.props;
        analytics.trackCommand('complete_suggestion', `/${command} `);

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

        if (!isMinimumServerVersion(Client4.getServerVersion(), 5, 24)) {
            this.setState({
                active: false,
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
                testID='slash_suggestion.list'
                keyboardShouldPersistTaps='always'
                style={[style.listView, {maxHeight: maxListHeight}]}
                extraData={this.state}
                data={this.state.dataSource}
                keyExtractor={this.keyExtractor}
                renderItem={this.renderItem}
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
            paddingTop: 8,
            borderRadius: 4,
        },
    };
});
