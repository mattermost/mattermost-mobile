// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    View,
} from 'react-native';

import {DeviceTypes} from 'app/constants';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';
import EmojiSuggestion from './emoji_suggestion';
import SlashSuggestion from './slash_suggestion';
import DateSuggestion from './date_suggestion';

export default class Autocomplete extends PureComponent {
    static propTypes = {
        cursorPosition: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number,
        onChangeText: PropTypes.func.isRequired,
        maxHeight: PropTypes.number,
        rootId: PropTypes.string,
        isSearch: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
        enableDateSuggestion: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        isSearch: false,
        cursorPosition: 0,
        enableDateSuggestion: false,
    };

    state = {
        atMentionCount: 0,
        channelMentionCount: 0,
        emojiCount: 0,
        commandCount: 0,
        dateCount: 0,
        keyboardOffset: 0,
    };

    onChangeText = (value) => {
        this.props.onChangeText(value, true);
    }

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

    handleIsDateFilterChange = (dateCount) => {
        this.setState({dateCount});
    };

    componentWillMount() {
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
    }

    componentWillUnmount() {
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
    }

    keyboardDidShow = (e) => {
        const {height} = e.endCoordinates;
        this.setState({keyboardOffset: height});
    };

    keyboardDidHide = () => {
        this.setState({keyboardOffset: 0});
    };

    maxListHeight() {
        let maxHeight;
        if (this.props.maxHeight) {
            maxHeight = this.props.maxHeight;
        } else {
            // List is expanding downwards, likely from the search box
            let offset = Platform.select({ios: 65, android: 75});
            if (DeviceTypes.IS_IPHONE_X) {
                offset = 90;
            }

            maxHeight = this.props.deviceHeight - offset - this.state.keyboardOffset;
        }

        return maxHeight;
    }

    render() {
        const style = getStyleFromTheme(this.props.theme);

        const wrapperStyle = [];
        const containerStyle = [];
        if (this.props.isSearch) {
            wrapperStyle.push(style.base, style.searchContainer);
            containerStyle.push(style.content);
        } else {
            containerStyle.push(style.base, style.container);
        }

        // We always need to render something, but we only draw the borders when we have results to show
        const {atMentionCount, channelMentionCount, emojiCount, commandCount, dateCount} = this.state;
        if (atMentionCount + channelMentionCount + emojiCount + commandCount + dateCount > 0) {
            if (this.props.isSearch) {
                wrapperStyle.push(style.bordersSearch);
            } else {
                containerStyle.push(style.borders);
            }
        }

        const maxListHeight = this.maxListHeight();

        return (
            <View style={wrapperStyle}>
                <View style={containerStyle}>
                    <AtMention
                        maxListHeight={maxListHeight}
                        onResultCountChange={this.handleAtMentionCountChange}
                        {...this.props}
                        onChangeText={this.onChangeText}
                    />
                    <ChannelMention
                        maxListHeight={maxListHeight}
                        onResultCountChange={this.handleChannelMentionCountChange}
                        {...this.props}
                        onChangeText={this.onChangeText}
                    />
                    <EmojiSuggestion
                        maxListHeight={maxListHeight}
                        onResultCountChange={this.handleEmojiCountChange}
                        {...this.props}
                        onChangeText={this.onChangeText}
                    />
                    <SlashSuggestion
                        maxListHeight={maxListHeight}
                        onResultCountChange={this.handleCommandCountChange}
                        {...this.props}
                        onChangeText={this.onChangeText}
                    />
                    {(this.props.isSearch && this.props.enableDateSuggestion) &&
                    <DateSuggestion
                        onResultCountChange={this.handleIsDateFilterChange}
                        {...this.props}
                        onChangeText={this.onChangeText}
                    />
                    }
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
            right: 0,
        },
        borders: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 0,
        },
        bordersSearch: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        container: {
            bottom: 0,
        },
        content: {
            flex: 1,
        },
        searchContainer: {
            flex: 1,
            ...Platform.select({
                android: {
                    top: 46,
                },
                ios: {
                    top: 44,
                },
            }),
        },
    };
});
