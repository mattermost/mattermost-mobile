// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import Emoji from 'app/components/emoji';
import SearchBar from 'app/components/search_bar';
import {emptyFunction} from 'app/utils/general';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

const {width: deviceWidth} = Dimensions.get('window');
const EMOJI_SIZE = 30;
const EMOJI_GUTTER = 7.5;
const SECTION_MARGIN = 15;

class EmojiPicker extends PureComponent {
    static propTypes = {
        emojis: PropTypes.array.isRequired,
        intl: intlShape.isRequired,
        onEmojiPress: PropTypes.func,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onEmojiPress: emptyFunction
    };

    leftButton = {
        id: 'close-edit-post'
    };

    constructor(props) {
        super(props);

        this.state = {
            emojis: props.emojis,
            searchTerm: ''
        };
    }

    changeSearchTerm = (text) => this.setState({searchTerm: text})

    cancelSearch = () => this.setState({searchTerm: ''})

    buildData = () => {
        const {emojis, searchTerm} = this.state;

        const nextEmojis = emojis.map((section) => {
            const {title, data} = section;

            const nextData = data.reduce((s, emoji) => {
                if (searchTerm && emoji.includes(searchTerm.toLowerCase())) {
                    s[0].items.push(emoji);
                } else if (!searchTerm) {
                    s[0].items.push(emoji);
                }

                return s;
            }, [{
                key: `${title}-emojis`,
                items: []
            }]);

            return {
                key: title,
                title,
                data: nextData
            };
        });

        return nextEmojis.filter((emojiSection) => emojiSection.data[0].items.length);
    }

    renderSectionHeader = ({section}) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return (
            <View key={section.title}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
        );
    }

    renderEmojis = (emojis, index) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return (
            <View
                key={index}
                style={styles.columnStyle}
            >
                {emojis.map((emoji, emojiIndex) => {
                    const style = [styles.emoji];
                    if (emojiIndex === 0) {
                        style.push(styles.emojiLeft);
                    } else if (emojiIndex === emojis.length - 1) {
                        style.push(styles.emojiRight);
                    }

                    return (
                        <TouchableOpacity
                            key={emoji}
                            style={style}
                            onPress={() => {
                                this.props.onEmojiPress(emoji);
                            }}
                        >
                            <Emoji
                                emojiName={emoji}
                                size={EMOJI_SIZE}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    }

    renderItem = ({item}) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        const numColumns = Number(((deviceWidth - (SECTION_MARGIN * 2)) / (EMOJI_SIZE + (EMOJI_GUTTER * 2))).toFixed(0));

        const slices = item.items.reduce((slice, emoji, emojiIndex) => {
            if (emojiIndex % numColumns === 0 && emojiIndex !== 0) {
                slice.push([]);
            }

            slice[slice.length - 1].push(emoji);

            return slice;
        }, [[]]);

        return (
            <View style={styles.section}>
                {slices.map(this.renderEmojis)}
            </View>
        );
    }

    render() {
        const {intl, theme} = this.props;
        const {searchTerm} = this.state;
        const {formatMessage} = intl;
        const styles = getStyleSheetFromTheme(theme);

        const data = this.buildData();

        return (
            <View style={styles.wrapper}>
                <View style={styles.searchBar}>
                    <SearchBar
                        ref='search_bar'
                        placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                        cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        backgroundColor='transparent'
                        inputHeight={33}
                        inputStyle={{
                            backgroundColor: theme.centerChannelBg,
                            color: theme.centerChannelColor,
                            fontSize: 13
                        }}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorSearch={changeOpacity(theme.centerChannelColor, 0.8)}
                        tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                        titleCancelColor={theme.centerChannelColor}
                        onChangeText={this.changeSearchTerm}
                        onCancelButtonPress={this.cancelSearch}
                        value={searchTerm}
                    />
                </View>
                <View style={styles.container}>
                    <SectionList
                        style={styles.listView}
                        sections={data}
                        renderSectionHeader={this.renderSectionHeader}
                        renderItem={this.renderItem}
                        removeClippedSubviews={true}
                    />
                </View>
            </View>
        );
    }
}

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        columnStyle: {
            alignSelf: 'stretch',
            flexDirection: 'row',
            marginVertical: EMOJI_GUTTER,
            justifyContent: 'flex-start'
        },
        container: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flex: 1
        },
        emoji: {
            width: EMOJI_SIZE,
            height: EMOJI_SIZE,
            marginHorizontal: EMOJI_GUTTER,
            alignItems: 'center',
            justifyContent: 'center'
        },
        emojiLeft: {
            marginLeft: 0
        },
        emojiRight: {
            marginRight: 0
        },
        listView: {
            backgroundColor: theme.centerChannelBg,
            width: deviceWidth - (SECTION_MARGIN * 2)
        },
        searchBar: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            paddingVertical: 5
        },
        section: {
            alignItems: 'center'
        },
        sectionTitle: {
            color: changeOpacity(theme.centerChannelColor, 0.2),
            fontSize: 15,
            fontWeight: '700',
            paddingVertical: 5
        },
        wrapper: {
            flex: 1
        }
    });
});

export default injectIntl(EmojiPicker);
