// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import Orientation from 'react-native-orientation';
import {
    Dimensions,
    SectionList,
    TouchableOpacity,
    View
} from 'react-native';

import Emoji from 'app/components/emoji';
import FormattedText from 'app/components/formatted_text';
import SearchBar from 'app/components/search_bar';
import {emptyFunction} from 'app/utils/general';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

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
            searchTerm: '',
            deviceWidth: Dimensions.get('window').width - (SECTION_MARGIN * 2)
        };
    }

    componentWillMount() {
        Orientation.addOrientationListener(this.orientationDidChange);
    }

    componentWillUnmount() {
        Orientation.removeOrientationListener(this.orientationDidChange);
    }

    changeSearchTerm = (text) => {
        this.setState({
            searchTerm: text
        });

        clearTimeout(this.searchTermTimeout);
        const timeout = text ? 350 : 0;
        this.searchTermTimeout = setTimeout(() => {
            const emojis = this.searchEmojis(text);
            this.setState({
                emojis
            });
        }, timeout);
    };

    cancelSearch = () => {
        this.setState({
            emojis: this.props.emojis,
            searchTerm: ''
        });
    };

    filterEmojiAliases = (aliases, searchTerm) => {
        return aliases.findIndex((alias) => alias.includes(searchTerm)) !== -1;
    };

    orientationDidChange = () => {
        setTimeout(() => {
            this.setState({deviceWidth: Dimensions.get('window').width - (SECTION_MARGIN * 2)});
        }, 100);
    };

    searchEmojis = (searchTerm) => {
        const {emojis} = this.props;
        const searchTermLowerCase = searchTerm.toLowerCase();

        if (!searchTerm) {
            return emojis;
        }

        const nextEmojis = [];
        emojis.forEach((section) => {
            const {data, ...otherProps} = section;
            const {key, items} = data[0];

            const nextData = {
                key,
                items: items.filter((item) => {
                    if (item.aliases) {
                        return this.filterEmojiAliases(item.aliases, searchTermLowerCase);
                    }

                    return item.name.includes(searchTermLowerCase);
                })
            };

            if (nextData.items.length) {
                nextEmojis.push({
                    ...otherProps,
                    data: [nextData]
                });
            }
        });

        return nextEmojis;
    };

    renderSectionHeader = ({section}) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return (
            <View key={section.title}>
                <FormattedText
                    style={styles.sectionTitle}
                    id={section.id}
                    defaultMessage={section.defaultMessage}
                />
            </View>
        );
    };

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
                            key={emoji.name}
                            style={style}
                            onPress={() => {
                                this.props.onEmojiPress(emoji.name);
                            }}
                        >
                            <Emoji
                                emojiName={emoji.name}
                                size={EMOJI_SIZE}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    renderItem = ({item}) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        const numColumns = Number((this.state.deviceWidth / (EMOJI_SIZE + (EMOJI_GUTTER * 2))).toFixed(0));

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
    };

    render() {
        const {intl, theme} = this.props;
        const {emojis, searchTerm} = this.state;
        const {formatMessage} = intl;
        const styles = getStyleSheetFromTheme(theme);

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
                        showsVerticalScrollIndicator={false}
                        style={[styles.listView, {width: this.state.deviceWidth}]}
                        sections={emojis}
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
    return {
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
            backgroundColor: theme.centerChannelBg
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
    };
});

export default injectIntl(EmojiPicker);
