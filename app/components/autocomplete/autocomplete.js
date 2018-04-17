// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';
import EmojiSuggestion from './emoji_suggestion';
import SlashSuggestion from './slash_suggestion';

export default class Autocomplete extends PureComponent {
    static propTypes = {
        cursorPosition: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number,
        onChangeText: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        isSearch: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    static defaultProps = {
        isSearch: false,
        cursorPosition: 0,
    };

    state = {
        atMentionCount: 0,
        channelMentionCount: 0,
        emojiCount: 0,
        commandCount: 0,
        keyboardOffset: 0,
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
    }

    keyboardDidHide = () => {
        this.setState({keyboardOffset: 0});
    }

    listHeight() {
        let offset = Platform.select({ios: 65, android: 75});
        if (DeviceInfo.getModel() === 'iPhone X') {
            offset = 90;
        }
        return this.props.deviceHeight - offset - this.state.keyboardOffset;
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
        const {atMentionCount, channelMentionCount, emojiCount, commandCount} = this.state;
        if (atMentionCount + channelMentionCount + emojiCount + commandCount > 0) {
            if (this.props.isSearch) {
                wrapperStyle.push(style.bordersSearch);
            } else {
                containerStyle.push(style.borders);
            }
        }
        const listHeight = this.listHeight();
        return (
            <View style={wrapperStyle}>
                <View style={containerStyle}>
                    <AtMention
                        listHeight={listHeight}
                        onResultCountChange={this.handleAtMentionCountChange}
                        {...this.props}
                    />
                    <ChannelMention
                        listHeight={listHeight}
                        onResultCountChange={this.handleChannelMentionCountChange}
                        {...this.props}
                    />
                    <EmojiSuggestion
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
            maxHeight: 200,
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
