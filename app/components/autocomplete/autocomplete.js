// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    View,
    ViewPropTypes,
} from 'react-native';

import EventEmitter from '@mm-redux/utils/event_emitter';

import {DeviceTypes} from 'app/constants';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {emptyFunction} from 'app/utils/general';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';
import EmojiSuggestion from './emoji_suggestion';
import SlashSuggestion from './slash_suggestion';
import DateSuggestion from './date_suggestion';

export default class Autocomplete extends PureComponent {
    static propTypes = {
        cursorPosition: PropTypes.number,
        deviceHeight: PropTypes.number,
        onChangeText: PropTypes.func.isRequired,
        maxHeight: PropTypes.number,
        rootId: PropTypes.string,
        isSearch: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
        enableDateSuggestion: PropTypes.bool.isRequired,
        valueEvent: PropTypes.string,
        cursorPositionEvent: PropTypes.string,
        nestedScrollEnabled: PropTypes.bool,
        expandDown: PropTypes.bool,
        onVisible: PropTypes.func,
        style: ViewPropTypes.style,
    };

    static defaultProps = {
        isSearch: false,
        cursorPosition: 0,
        enableDateSuggestion: false,
        nestedScrollEnabled: false,
        onVisible: emptyFunction,
    };

    static getDerivedStateFromProps(props, state) {
        const nextState = {};
        let updated = false;

        if (props.cursorPosition !== state.cursorPosition && !props.cursorPositionEvent) {
            nextState.cursorPosition = props.cursorPosition;
            updated = true;
        }

        if (props.value !== state.value && !props.valueEvent) {
            nextState.value = props.value;
            updated = true;
        }

        return updated ? nextState : null;
    }

    constructor(props) {
        super(props);

        this.state = {
            atMentionCount: 0,
            channelMentionCount: 0,
            cursorPosition: props.cursorPosition,
            emojiCount: 0,
            commandCount: 0,
            dateCount: 0,
            keyboardOffset: 0,
            value: props.value,
        };

        this.containerRef = React.createRef();
    }

    componentDidMount() {
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);

        if (this.props.valueEvent) {
            EventEmitter.on(this.props.valueEvent, this.handleValueChange);
        }

        if (this.props.cursorPositionEvent) {
            EventEmitter.on(this.props.cursorPositionEvent, this.handleCursorPositionChange);
        }
    }

    componentWillUnmount() {
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();

        if (this.props.valueEvent) {
            EventEmitter.off(this.props.valueEvent, this.handleValueChange);
        }

        if (this.props.cursorPositionEvent) {
            EventEmitter.off(this.props.cursorPositionEvent, this.handleCursorPositionChange);
        }
    }

    componentDidUpdate() {
        const visible = Boolean(this.containerRef.current?._children.length);
        this.props.onVisible(visible);
    }

    onChangeText = (value) => {
        this.props.onChangeText(value, true);
    };

    handleAtMentionCountChange = (atMentionCount) => {
        this.setState({atMentionCount});
    };

    handleChannelMentionCountChange = (channelMentionCount) => {
        this.setState({channelMentionCount});
    };

    handleCursorPositionChange = (cursorPosition) => {
        this.setState({cursorPosition});
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

    handleValueChange = (value) => {
        this.setState({value});
    };

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
            if (DeviceTypes.IS_IPHONE_WITH_INSETS) {
                offset = 90;
            }

            maxHeight = this.props.deviceHeight - offset - this.state.keyboardOffset;
        }

        return maxHeight;
    }

    render() {
        const {theme, isSearch, expandDown} = this.props;
        const style = getStyleFromTheme(theme);

        const wrapperStyles = [];
        const containerStyles = [];
        if (isSearch) {
            wrapperStyles.push(style.base, style.searchContainer);
            containerStyles.push(style.content);
        } else {
            const containerStyle = expandDown ? style.containerExpandDown : style.container;
            containerStyles.push(style.base, containerStyle);
        }

        // We always need to render something, but we only draw the borders when we have results to show
        const {atMentionCount, channelMentionCount, emojiCount, commandCount, dateCount, cursorPosition, value} = this.state;
        if (atMentionCount + channelMentionCount + emojiCount + commandCount + dateCount > 0) {
            if (this.props.isSearch) {
                wrapperStyles.push(style.bordersSearch);
            } else {
                containerStyles.push(style.borders);
            }
        }

        if (this.props.style) {
            containerStyles.push(this.props.style);
        }

        const maxListHeight = this.maxListHeight();

        return (
            <View style={wrapperStyles}>
                <View
                    ref={this.containerRef}
                    style={containerStyles}
                >
                    <AtMention
                        {...this.props}
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        onChangeText={this.onChangeText}
                        onResultCountChange={this.handleAtMentionCountChange}
                        value={value || ''}
                        nestedScrollEnabled={this.props.nestedScrollEnabled}
                    />
                    <ChannelMention
                        {...this.props}
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        onChangeText={this.onChangeText}
                        onResultCountChange={this.handleChannelMentionCountChange}
                        value={value || ''}
                        nestedScrollEnabled={this.props.nestedScrollEnabled}
                    />
                    <EmojiSuggestion
                        {...this.props}
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        onChangeText={this.onChangeText}
                        onResultCountChange={this.handleEmojiCountChange}
                        value={value || ''}
                        nestedScrollEnabled={this.props.nestedScrollEnabled}
                    />
                    <SlashSuggestion
                        {...this.props}
                        maxListHeight={maxListHeight}
                        onChangeText={this.onChangeText}
                        onResultCountChange={this.handleCommandCountChange}
                        value={value || ''}
                        nestedScrollEnabled={this.props.nestedScrollEnabled}
                    />
                    {(this.props.isSearch && this.props.enableDateSuggestion) &&
                    <DateSuggestion
                        {...this.props}
                        cursorPosition={cursorPosition}
                        onChangeText={this.onChangeText}
                        onResultCountChange={this.handleIsDateFilterChange}
                        value={value || ''}
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
        containerExpandDown: {
            top: 0,
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
