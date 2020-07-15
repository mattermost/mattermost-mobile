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

import SlashSuggestionItem from '../slash_suggestion_item';
import {Client4} from '@mm-redux/client';
import {COMMANDS_TO_HIDE_ON_MOBILE} from '../cached/index';

export default class SlashSuggestionNonCached extends PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        isSearch: PropTypes.bool,
        maxListHeight: PropTypes.number,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        value: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
        nestedScrollEnabled: PropTypes.bool,
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
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.isSearch || nextProps.value === this.props.value) {
            return;
        }

        if (nextProps.value[0] !== '/') {
            this.setState({
                active: false,
            });
            this.props.onResultCountChange(0);
            return;
        }

        const args = {
            channel_id: this.props.channelId,
            ...(this.props.rootId && {root_id: this.props.rootId, parent_id: this.props.rootId}),
        };

        Client4.getCommandAutocompleteSuggestionsList(nextProps.value, nextProps.currentTeamId, args).then(
            (data) => {
                const matches = [];
                const suggestions = data.filter((sug) => !COMMANDS_TO_HIDE_ON_MOBILE.includes(sug.Complete));
                suggestions.forEach((sug) => {
                    if (!this.contains(matches, '/' + sug.Complete)) {
                        matches.push({
                            Complete: sug.Complete,
                            Suggestion: sug.Suggestion,
                            Hint: sug.Hint,
                            Description: sug.Description,
                        });
                    }
                });
                this.setState({
                    active: matches.length,
                    dataSource: matches,
                });
            },
        );
    }

    contains(matches, complete) {
        return matches.findIndex((match) => match.complete === complete) !== -1;
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
