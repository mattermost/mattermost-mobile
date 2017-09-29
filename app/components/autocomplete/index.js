// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    StyleSheet,
    View
} from 'react-native';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';
import EmojiSuggestion from './emoji_suggestion';

export default class Autocomplete extends PureComponent {
    static propTypes = {
        onChangeText: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        isSearch: PropTypes.bool
    };

    static defaultProps = {
        isSearch: false
    };

    state = {
        cursorPosition: 0
    };

    handleSelectionChange = (event) => {
        this.setState({
            cursorPosition: event.nativeEvent.selection.end
        });
    };

    render() {
        const searchContainer = this.props.isSearch ? style.searchContainer : null;
        const container = this.props.isSearch ? null : style.container;
        return (
            <View style={searchContainer}>
                <View style={container}>
                    <AtMention
                        cursorPosition={this.state.cursorPosition}
                        {...this.props}
                    />
                    <ChannelMention
                        cursorPosition={this.state.cursorPosition}
                        {...this.props}
                    />
                    <EmojiSuggestion
                        cursorPosition={this.state.cursorPosition}
                        {...this.props}
                    />
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 200,
        overflow: 'hidden'
    },
    searchContainer: {
        backgroundColor: 'white',
        elevation: 5,
        flex: 1,
        position: 'absolute',
        ...Platform.select({
            android: {
                top: 47
            },
            ios: {
                top: 64
            }
        }),
        left: 0,
        right: 0,
        maxHeight: 250,
        overflow: 'hidden',
        zIndex: 5
    }
});
