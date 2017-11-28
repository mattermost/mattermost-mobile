// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';
import EmojiSuggestion from './emoji_suggestion';
import SlashSuggestion from './slash_suggestion';

export default class Autocomplete extends PureComponent {
    static propTypes = {
        onChangeText: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        isSearch: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string
    };

    static defaultProps = {
        isSearch: false
    };

    state = {
        cursorPosition: 0,
        atMentionCount: 0,
        channelMentionCount: 0,
        emojiCount: 0,
        commandCount: 0
    };

    handleSelectionChange = (event) => {
        this.setState({
            cursorPosition: event.nativeEvent.selection.end
        });
    };

    handleAtMentionCountChange = (atMentionCount) => {
        this.setState({atMentionCount});
    };

    handleChannelMentionCountChange = (channelMentionCount) => {
        this.setState({channelMentionCount});
    };

    handleEmojiCountChange = (emojiCount) => {
        this.setState({emojiCount});
    };

    handleCommandCountChange = (commandCount) => {
        this.setState({commandCount});
    };

    render() {
        const style = getStyleFromTheme(this.props.theme);

        const containerStyle = [style.base];
        if (this.props.isSearch) {
            containerStyle.push(style.searchContainer);
        } else {
            containerStyle.push(style.container);
        }

        // We always need to render something, but we only draw the borders when we have results to show
        const {atMentionCount, channelMentionCount, emojiCount, commandCount} = this.state;
        if (atMentionCount + channelMentionCount + emojiCount + commandCount > 0) {
            containerStyle.push(style.borders);
        }

        return (
            <View>
                <View style={containerStyle}>
                    <AtMention
                        cursorPosition={this.state.cursorPosition}
                        onResultCountChange={this.handleAtMentionCountChange}
                        {...this.props}
                    />
                    <ChannelMention
                        cursorPosition={this.state.cursorPosition}
                        onResultCountChange={this.handleChannelMentionCountChange}
                        {...this.props}
                    />
                    <EmojiSuggestion
                        cursorPosition={this.state.cursorPosition}
                        onResultCountChange={this.handleEmojiCountChange}
                        {...this.props}
                    />
                    <SlashSuggestion
                        onResultCountChange={this.handleCommandCountChange}
                        {...this.props}
                    />
                </View>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        base: {
            left: 0,
            overflow: 'hidden',
            position: 'absolute',
            right: 0
        },
        borders: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 0
        },
        container: {
            bottom: 0,
            maxHeight: 200
        },
        searchContainer: {
            elevation: 5,
            flex: 1,
            maxHeight: 250,
            zIndex: 5,
            ...Platform.select({
                android: {
                    top: 47
                },
                ios: {
                    top: 64
                }
            })
        }
    };
});
