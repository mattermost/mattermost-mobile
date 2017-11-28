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

import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
import Emoji from 'app/components/emoji';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

const EMOJI_REGEX = /(^|\s|^\+|^-)(:([^:\s]*))$/i;
const EMOJI_REGEX_WITHOUT_PREFIX = /\B(:([^:\s]*))$/i;

export default class EmojiSuggestion extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            addReactionToLatestPost: PropTypes.func.isRequired
        }).isRequired,
        cursorPosition: PropTypes.number,
        emojis: PropTypes.array.isRequired,
        isSearch: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        value: PropTypes.string
    };

    static defaultProps = {
        defaultChannel: {},
        value: ''
    };

    state = {
        active: false,
        dataSource: []
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.isSearch) {
            return;
        }

        const regex = EMOJI_REGEX;
        const match = nextProps.value.substring(0, nextProps.cursorPosition).match(regex);

        if (!match || this.state.emojiComplete) {
            this.setState({
                active: false,
                matchTerm: null,
                emojiComplete: false
            });

            this.props.onResultCountChange(0);

            return;
        }

        const matchTerm = match[3];
        if (matchTerm !== this.state.matchTerm) {
            this.setState({
                matchTerm
            });
        }

        let data = [];
        if (matchTerm.length) {
            const lowerCaseMatchTerm = matchTerm.toLowerCase();
            const startsWith = [];
            const includes = [];
            nextProps.emojis.forEach((emoji) => {
                if (emoji.startsWith(lowerCaseMatchTerm)) {
                    startsWith.push(emoji);
                } else {
                    includes.push(emoji);
                }
            });
            data = [...startsWith.sort(), ...includes.sort()];
        } else {
            const initialEmojis = [...nextProps.emojis];
            initialEmojis.splice(0, 300);
            data = initialEmojis.sort();
        }

        this.setState({
            active: data.length > 0,
            dataSource: data
        });

        this.props.onResultCountChange(data.length);
    }

    completeSuggestion = (emoji) => {
        const {actions, cursorPosition, onChangeText, value, rootId} = this.props;
        const emojiPart = value.substring(0, cursorPosition);

        if (emojiPart.startsWith('+:')) {
            actions.addReactionToLatestPost(emoji, rootId);
            onChangeText('');
        } else {
            let completedDraft = emojiPart.replace(EMOJI_REGEX_WITHOUT_PREFIX, `:${emoji}: `);

            if (value.length > cursorPosition) {
                completedDraft += value.substring(cursorPosition);
            }

            onChangeText(completedDraft);
        }

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
                        size={20}
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
                ItemSeparatorComponent={AutocompleteDivider}
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
            backgroundColor: theme.centerChannelBg
        }
    };
});
