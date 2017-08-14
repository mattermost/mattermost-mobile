// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import Emoji from 'app/components/emoji';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

const EMOJI_REGEX = /\B(:([^:\r\n\s]*))$/i;

export default class EmojiSuggestion extends Component {
    static propTypes = {
        cursorPosition: PropTypes.number,
        emojis: PropTypes.array.isRequired,
        postDraft: PropTypes.string,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired
    };

    static defaultProps = {
        defaultChannel: {},
        postDraft: ''
    };

    state = {
        active: false,
        dataSource: []
    }

    componentWillReceiveProps(nextProps) {
        const regex = EMOJI_REGEX;
        const match = nextProps.postDraft.substring(0, nextProps.cursorPosition).match(regex);

        if (!match || this.state.emojiComplete) {
            this.setState({
                active: false,
                matchTerm: null,
                emojiComplete: false
            });
            return;
        }

        const matchTerm = match[2];
        if (matchTerm !== this.state.matchTerm) {
            this.setState({
                matchTerm
            });
        }

        let data = [];
        if (matchTerm.length) {
            data = nextProps.emojis.filter((emoji) => emoji.startsWith(matchTerm.toLowerCase())).sort();
        } else {
            const initialEmojis = [...nextProps.emojis];
            initialEmojis.splice(0, 300);
            data = initialEmojis.sort();
        }

        this.setState({
            active: data.length,
            dataSource: data
        });
    }

    completeSuggestion = (emoji) => {
        const {cursorPosition, onChangeText, postDraft} = this.props;
        const emojiPart = postDraft.substring(0, cursorPosition);

        let completedDraft = emojiPart.replace(EMOJI_REGEX, `:${emoji}: `);

        if (postDraft.length > cursorPosition) {
            completedDraft += postDraft.substring(cursorPosition);
        }

        onChangeText(completedDraft);
        this.setState({
            active: false,
            emojiComplete: true
        });
    };

    keyExtractor = (item) => item;

    renderItem = ({item}) => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <TouchableOpacity
                onPress={() => this.completeSuggestion(item)}
                style={style.row}
            >
                <View style={style.emoji}>
                    <Emoji
                        emojiName={item}
                        size={10}
                    />
                </View>
                <Text style={style.emojiName}>{`:${item}:`}</Text>
            </TouchableOpacity>
        );
    };

    getItemLayout = ({index}) => ({length: 40, offset: 40 * index, index})

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
        emoji: {
            marginRight: 5
        },
        emojiName: {
            fontSize: 13,
            color: theme.centerChannelColor
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        row: {
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
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
