// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    FlatList,
    Text,
    TouchableOpacity
} from 'react-native';
import {intlShape} from 'react-intl';

import {RequestStatus} from 'mattermost-redux/constants';

import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

const SLASH_REGEX = /(^\/)([a-zA-Z-]*)$/;
const ROW_HEIGHT = 55;

export default class SlashSuggestion extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            getAutocompleteCommands: PropTypes.func.isRequired
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        commands: PropTypes.array,
        commandsRequest: PropTypes.object.isRequired,
        executeCommandRequest: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        value: PropTypes.string
    };

    static defaultProps = {
        defaultChannel: {},
        value: ''
    };

    static contextTypes = {
        intl: intlShape
    }

    state = {
        active: false,
        suggestionComplete: false,
        dataSource: [],
        lastCommandRequest: 0
    };

    componentWillReceiveProps(nextProps) {
        const {currentTeamId, executeCommandRequest} = this.props;
        const {
            commands: nextCommands,
            commandsRequest: nextCommandsRequest,
            currentTeamId: nextTeamId,
            executeCommandRequest: nextExecuteCommandRequest,
            value: nextValue
        } = nextProps;

        if (nextExecuteCommandRequest.status === RequestStatus.FAILURE && executeCommandRequest.status === RequestStatus.STARTED) {
            const {intl} = this.context;
            Alert.alert(
                intl.formatMessage({id: 'mobile.commands.error_title', defaultMessage: 'Error Executing Command'}),
                intl.formatMessage({
                    id: 'mobile.commands.error_message',
                    defaultMessage: 'There was an error executing your command. To send a message beginning with "/", try adding an empty space at the beginning of the message.'
                }));
            return;
        }

        if (currentTeamId !== nextTeamId) {
            this.setState({
                lastCommandRequest: 0
            });
        }

        const regex = SLASH_REGEX;
        const match = nextValue.match(regex);

        if (!match || this.state.suggestionComplete) {
            this.setState({
                active: false,
                matchTerm: null,
                suggestionComplete: false
            });
            this.props.onResultCountChange(0);
            return;
        }

        const dataIsStale = Date.now() - this.state.lastCommandRequest > (1000 * 60 * 5); // 5 mins

        if ((!nextCommands.length || dataIsStale) && nextCommandsRequest.status !== RequestStatus.STARTED) {
            this.props.actions.getAutocompleteCommands(nextProps.currentTeamId);
            this.setState({
                lastCommandRequest: Date.now()
            });
        }

        const matchTerm = match[2];

        const data = this.filterSlashSuggestions(matchTerm, nextCommands);

        this.setState({
            active: data.length,
            dataSource: data
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
            suggestionComplete: true
        });
    };

    keyExtractor = (item) => item.id || item.trigger;

    renderItem = ({item}) => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <TouchableOpacity
                onPress={() => this.completeSuggestion(item.trigger)}
                style={style.row}
            >
                <Text style={style.suggestionName}>{`/${item.display_name || item.trigger} ${item.auto_complete_hint}`}</Text>
                <Text style={style.suggestionDescription}>{item.auto_complete_desc}</Text>
            </TouchableOpacity>
        );
    };

    getItemLayout = ({index}) => ({length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index})

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
        suggestionDescription: {
            fontSize: 11,
            color: changeOpacity(theme.centerChannelColor, 0.6)
        },
        suggestionName: {
            fontSize: 13,
            color: theme.centerChannelColor,
            marginBottom: 5
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        row: {
            height: ROW_HEIGHT,
            justifyContent: 'center',
            paddingHorizontal: 8,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2)
        }
    };
});
