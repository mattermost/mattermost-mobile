// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    SectionList,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';

import Emoji from 'app/components/emoji';
import FormattedText from 'app/components/formatted_text';
import {DeviceTypes} from 'app/constants';
import {emptyFunction} from 'app/utils/general';
import {
    makeStyleSheetFromTheme,
    changeOpacity,
} from 'app/utils/theme';
import {compareEmojis} from 'app/utils/emoji_utils';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import EmojiPickerRow from './emoji_picker_row';

const EMOJI_SIZE = 30;
const EMOJI_GUTTER = 7;
const EMOJIS_PER_PAGE = 200;
const SECTION_HEADER_HEIGHT = 28;
const SECTION_MARGIN = 15;
export const SCROLLVIEW_NATIVE_ID = 'emojiPicker';

export function filterEmojiSearchInput(searchText) {
    return searchText.toLowerCase().replace(/^:|:$/g, '');
}

export default class EmojiPicker extends PureComponent {
    static propTypes = {
        customEmojisEnabled: PropTypes.bool.isRequired,
        customEmojiPage: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        emojis: PropTypes.array.isRequired,
        emojisBySection: PropTypes.array.isRequired,
        fuse: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        onEmojiPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getCustomEmojis: PropTypes.func.isRequired,
            incrementEmojiPickerPage: PropTypes.func.isRequired,
        }).isRequired,
    };

    static defaultProps = {
        onEmojiPress: emptyFunction,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.sectionListGetItemLayout = sectionListGetItemLayout({
            getItemHeight: () => {
                return (EMOJI_SIZE + 7) + (EMOJI_GUTTER * 2);
            },
            getSectionHeaderHeight: () => SECTION_HEADER_HEIGHT,
        });

        const emojis = this.renderableEmojis(props.emojisBySection, props.deviceWidth);
        const emojiSectionIndexByOffset = this.measureEmojiSections(emojis);

        this.scrollToSectionTries = 0;
        this.state = {
            emojis,
            emojiSectionIndexByOffset,
            filteredEmojis: [],
            searchTerm: '',
            currentSectionIndex: 0,
            missingPages: true,
        };
    }

    componentDidUpdate(prevProps) {
        this.rebuildEmojis = false;
        if (this.props.deviceWidth !== prevProps.deviceWidth) {
            this.rebuildEmojis = true;

            if (this.searchBarRef) {
                this.searchBarRef.blur();
            }
        }

        if (this.props.emojis !== prevProps.emojis) {
            this.rebuildEmojis = true;
            this.setRebuiltEmojis();
        }
    }

    setSearchBarRef = (ref) => {
        this.searchBarRef = ref;
    }

    setSectionListRef = (ref) => {
        this.sectionListRef = ref;
    };

    setRebuiltEmojis = (searchBarAnimationComplete = true) => {
        if (this.rebuildEmojis && searchBarAnimationComplete) {
            this.rebuildEmojis = false;
            const emojis = this.renderableEmojis(this.props.emojisBySection, this.props.deviceWidth);
            this.setState({emojis});
        }
    }

    renderableEmojis = (emojis, deviceWidth) => {
        const numberOfColumns = this.getNumberOfColumns(deviceWidth);

        const nextEmojis = emojis.map((section) => {
            const data = [];
            let row = {
                key: `${section.key}-0`,
                items: [],
            };

            section.data.forEach((emoji, index) => {
                if (index % numberOfColumns === 0 && index !== 0) {
                    data.push(row);
                    row = {
                        key: `${section.key}-${index}`,
                        items: [],
                    };
                }

                row.items.push(emoji);
            });

            if (row.items.length) {
                if (row.items.length < numberOfColumns) {
                    // push some empty items to make sure flexbox can justfiy content correctly
                    const emptyEmojis = new Array(numberOfColumns - row.items.length);
                    row.items.push(...emptyEmojis);
                }

                data.push(row);
            }

            return {
                ...section,
                data,
            };
        });

        return nextEmojis;
    };

    measureEmojiSections = (emojiSections) => {
        let lastOffset = 0;
        return emojiSections.map((section) => {
            const start = lastOffset;
            const nextOffset = (section.data.length * ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * 2))) + SECTION_HEADER_HEIGHT;
            lastOffset += nextOffset;

            return start;
        });
    };

    changeSearchTerm = (rawText) => {
        const searchTerm = filterEmojiSearchInput(rawText);
        const nextState = {
            searchTerm: rawText,
        };
        this.setState(nextState);

        if (!searchTerm) {
            nextState.currentSectionIndex = 0;
            return;
        }

        clearTimeout(this.searchTermTimeout);
        const timeout = searchTerm ? 100 : 0;
        this.searchTermTimeout = setTimeout(() => {
            const filteredEmojis = this.searchEmojis(searchTerm);
            this.setState({
                filteredEmojis,
            });
        }, timeout);
    };

    cancelSearch = () => {
        this.setState({
            currentSectionIndex: 0,
            filteredEmojis: [],
            searchTerm: '',
        });
    };

    searchEmojis = (searchTerm) => {
        const {emojis, fuse} = this.props;
        const searchTermLowerCase = searchTerm.toLowerCase();

        if (!searchTerm) {
            return [];
        }

        const results = fuse.search(searchTermLowerCase);
        const sorter = (a, b) => compareEmojis(a, b, searchTerm);
        const data = results.map((index) => emojis[index]).sort(sorter);

        return data;
    };

    getNumberOfColumns = (deviceWidth) => {
        const shorten = DeviceTypes.IS_IPHONE_WITH_INSETS && this.props.isLandscape ? 4 : 2;
        return Math.floor(Number(((deviceWidth - (SECTION_MARGIN * shorten)) / ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * shorten)))));
    };

    renderItem = ({item}) => {
        return (
            <EmojiPickerRow
                key={item.key}
                emojiGutter={EMOJI_GUTTER}
                emojiSize={EMOJI_SIZE}
                items={item.items}
                onEmojiPress={this.props.onEmojiPress}
            />
        );
    };

    renderListComponent = (shorten) => {
        const {deviceWidth, theme} = this.props;
        const {emojis, filteredEmojis, searchTerm} = this.state;
        const styles = getStyleSheetFromTheme(theme);

        let listComponent;
        if (searchTerm) {
            listComponent = (
                <FlatList
                    data={filteredEmojis}
                    initialListSize={10}
                    keyboardShouldPersistTaps='always'
                    keyExtractor={this.flatListKeyExtractor}
                    nativeID={SCROLLVIEW_NATIVE_ID}
                    pageSize={10}
                    renderItem={this.flatListRenderItem}
                    style={styles.flatList}
                />
            );
        } else {
            listComponent = (
                <SectionList
                    ref={this.setSectionListRef}
                    getItemLayout={this.sectionListGetItemLayout}
                    initialNumToRender={50}
                    keyboardShouldPersistTaps='always'
                    keyboardDismissMode='interactive'
                    ListFooterComponent={this.renderFooter}
                    nativeID={SCROLLVIEW_NATIVE_ID}
                    onEndReached={this.loadMoreCustomEmojis}
                    onEndReachedThreshold={Platform.OS === 'ios' ? 0 : 1}
                    onMomentumScrollEnd={this.onMomentumScrollEnd}
                    onScroll={this.onScroll}
                    onScrollToIndexFailed={this.handleScrollToSectionFailed}
                    pageSize={50}
                    removeClippedSubviews={false}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    sections={emojis}
                    showsVerticalScrollIndicator={false}
                    style={[styles.sectionList, {width: deviceWidth - (SECTION_MARGIN * shorten)}]}
                />
            );
        }

        return listComponent;
    };

    flatListKeyExtractor = (item) => item;

    flatListRenderItem = ({item}) => {
        const style = getStyleSheetFromTheme(this.props.theme);

        return (
            <TouchableOpacity
                onPress={() => this.props.onEmojiPress(item)}
                style={style.flatListRow}
            >
                <View style={[style.flatListEmoji, padding(this.props.isLandscape)]}>
                    <Emoji
                        emojiName={item}
                        size={20}
                    />
                </View>
                <Text style={style.flatListEmojiName}>{`:${item}:`}</Text>
            </TouchableOpacity>
        );
    };

    loadMoreCustomEmojis = async () => {
        if (!this.props.customEmojisEnabled) {
            return;
        }

        const {data} = await this.props.actions.getCustomEmojis(this.props.customEmojiPage, EMOJIS_PER_PAGE);
        this.setState({loadingMore: false});

        if (!data) {
            return;
        }

        if (data.length < EMOJIS_PER_PAGE) {
            this.setState({missingPages: false});
            return;
        }

        this.props.actions.incrementEmojiPickerPage();
    };

    onScroll = (e) => {
        if (this.state.jumpToSection) {
            return;
        }

        clearTimeout(this.setIndexTimeout);

        const {contentOffset} = e.nativeEvent;
        let nextIndex = this.state.emojiSectionIndexByOffset.findIndex((offset) => contentOffset.y <= offset);

        if (nextIndex === -1) {
            nextIndex = this.state.emojiSectionIndexByOffset.length - 1;
        } else if (nextIndex !== 0) {
            nextIndex -= 1;
        }

        if (nextIndex !== this.state.currentSectionIndex) {
            this.setState({
                currentSectionIndex: nextIndex,
            });
        }
    };

    onMomentumScrollEnd = () => {
        if (this.state.jumpToSection) {
            this.setState({
                jumpToSection: false,
            });
        }
    };

    scrollToSection = (index) => {
        this.setState({
            jumpToSection: true,
            currentSectionIndex: index,
        }, () => {
            this.sectionListRef.scrollToLocation({
                sectionIndex: index,
                itemIndex: 0,
                viewOffset: 25,
            });
        });
    };

    handleScrollToSectionFailed = ({index}) => {
        if (this.scrollToSectionTries < 1) {
            setTimeout(() => {
                this.scrollToSectionTries++;
                this.scrollToSection(index);
            }, 200);
        }
    };

    renderSectionHeader = ({section}) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return (
            <View
                style={styles.sectionTitleContainer}
                key={section.title}
            >
                <FormattedText
                    style={styles.sectionTitle}
                    id={section.id}
                    defaultMessage={section.defaultMessage}
                />
            </View>
        );
    };

    handleSectionIconPress = (index, isCustomSection = false) => {
        this.scrollToSectionTries = 0;
        this.scrollToSection(index);

        if (isCustomSection && this.props.customEmojiPage === 0) {
            this.loadMoreCustomEmojis();
        }
    };

    renderSectionIcons = () => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return this.state.emojis.map((section, index) => {
            const onPress = () => this.handleSectionIconPress(index, section.key === 'custom');

            return (
                <TouchableOpacity
                    key={section.key}
                    onPress={onPress}
                    style={styles.sectionIconContainer}
                >
                    <FontAwesomeIcon
                        name={section.icon}
                        size={17}
                        style={[styles.sectionIcon, (index === this.state.currentSectionIndex && styles.sectionIconHighlight)]}
                    />
                </TouchableOpacity>
            );
        });
    };

    renderFooter = () => {
        if (!this.state.missingPages) {
            return null;
        }

        const {theme} = this.props;

        const styles = getStyleSheetFromTheme(theme);
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={theme.centerChannelColor}/>
            </View>
        );
    };
}

export const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        bottomContent: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.3),
            borderTopWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
        },
        bottomContentWrapper: {
            ...Platform.select({
                android: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                },
                ios: {
                    width: '100%',
                    flexDirection: 'row',
                },
            }),
            backgroundColor: theme.centerChannelBg,
            height: 35,
        },
        container: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        flatList: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            alignSelf: 'stretch',
        },
        flatListEmoji: {
            marginRight: 5,
        },
        flatListEmojiName: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        flatListRow: {
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
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
            overflow: 'hidden',
        },
        searchBar: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            paddingVertical: 5,
            ...Platform.select({
                ios: {
                    paddingLeft: 8,
                },
            }),
            height: 50,
        },
        sectionList: {
            ...Platform.select({
                android: {
                    marginBottom: 35,
                },
            }),
        },
        sectionIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.3),
        },
        sectionIconContainer: {
            flex: 1,
            height: 35,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sectionIconHighlight: {
            color: theme.centerChannelColor,
        },
        sectionTitle: {
            color: changeOpacity(theme.centerChannelColor, 0.2),
            fontSize: 15,
            fontWeight: '700',
        },
        sectionTitleContainer: {
            height: SECTION_HEADER_HEIGHT,
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        loading: {
            flex: 1,
            alignItems: 'center',
        },
    };
});
