// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-lines */

import Fuse from 'fuse.js';
import React, {PureComponent} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {ActivityIndicator, FlatList, Platform, SectionList, Text, TouchableOpacity, View} from 'react-native';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import FormattedText from '@components/formatted_text';
import {Device} from '@constants';
import {withTheme} from '@context/theme';
import {compareEmojis} from '@utils/emoji/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiPickerRow from './emoji_picker_row';

const EMOJI_SIZE = 30;
const EMOJI_GUTTER = 7;
const EMOJIS_PER_PAGE = 200;
const SECTION_HEADER_HEIGHT = 28;
const SECTION_MARGIN = 15;
export const SCROLLVIEW_NATIVE_ID = 'emojiPicker';

export function filterEmojiSearchInput(searchText: string) {
    return searchText.toLowerCase().replace(/^:|:$/g, '');
}

type EmojiAlias = {
    aliases: string [];
    name: string;
}

type EmojiSection = {
    data: EmojiAlias[];
    defaultMessage?: string;
    icon: string;
    id: string;
    key: string;
}

type EmojiPickerProps = {
    customEmojiPage: number;
    customEmojisEnabled: boolean;
    deviceWidth: number;
    emojis: string;
    emojisBySection: EmojiSection[];
    intl: IntlShape;
    isLandscape: boolean;
    onEmojiPress: (emoji: string) => void;
    theme: Theme;
}

type EmojiPickerState = {
    emojis: RenderableEmojis[];
    emojiSectionIndexByOffset: number[];
    filteredEmojis: string[];
    searchTerm: string;
    currentSectionIndex: number;
    missingPages: boolean;
    jumpToSection: boolean;
};

type EmojisData = {
    key: string;
    items: EmojiAlias[];
}

type RenderableEmojis = {
    id: string;
    icon: string;
    key: string;
    data: EmojisData[];
}

class EmojiPicker extends PureComponent<EmojiPickerProps, EmojiPickerState> {
    private fuse: Fuse<unknown>;
    private rebuildEmojis: boolean | undefined;
    private scrollToSectionTries: number;
    private searchBarRef: any;
    private searchTermTimeout: NodeJS.Timeout | undefined;
    private sectionListGetItemLayout: any;

    constructor(props: EmojiPickerProps) {
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
            jumpToSection: false, // fixme : should it be false or null
        };

        this.fuse = this.getFuseInstance();
    }

    getFuseInstance = () => {
        const emojis = selectEmojisByName(state);
        const options = {
            findAllMatches: true,
            ignoreLocation: true,
            includeMatches: true,
            shouldSort: false,
        };

        const list = emojis.length ? emojis : [];
        return new Fuse(list, options);
    }

    componentDidUpdate(prevProps: EmojiPickerProps) {
        this.rebuildEmojis = false;
        if (this.props.deviceWidth !== prevProps.deviceWidth) {
            this.rebuildEmojis = true;

            if (this.searchBarRef) {
                this.searchBarRef.blur();
            }
        }

        if (this.props.emojis !== prevProps.emojis) {
            this.rebuildEmojis = true;
        }

        this.setRebuiltEmojis();
    }

    setSearchBarRef = (ref) => {
        this.searchBarRef = ref;
    };

    setSectionListRef = (ref) => {
        this.sectionListRef = ref;
    };

    setRebuiltEmojis = (searchBarAnimationComplete = true) => {
        if (this.rebuildEmojis && searchBarAnimationComplete) {
            this.rebuildEmojis = false;
            const emojis = this.renderableEmojis(
                this.props.emojisBySection,
                this.props.deviceWidth,
            );
            this.setState({emojis});
        }
    };

    renderableEmojis = (emojis: EmojiSection[], deviceWidth: number): RenderableEmojis[] => {
        const numberOfColumns = this.getNumberOfColumns(deviceWidth);

        const nextEmojis = emojis.map((section) => {
            const data = [];
            let row = {key: `${section.key}-0`, items: [] as EmojiAlias[]};

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
                    // push some empty items to make sure flexbox can justify content correctly
                    const emptyEmojis = new Array(
                        numberOfColumns - row.items.length,
                    );
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

    measureEmojiSections = (emojiSections: RenderableEmojis[]): number[] => {
        let lastOffset = 0;
        return emojiSections.map((section) => {
            const start = lastOffset;
            const nextOffset = (section.data.length * ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * 2))) + SECTION_HEADER_HEIGHT;
            lastOffset += nextOffset;

            return start;
        });
    };

    changeSearchTerm = (rawText: string) => {
        const {searchTerm: prevSearchTerm} = this.state;

        const searchTerm = filterEmojiSearchInput(rawText);
        const nextState = {searchTerm: rawText};
        this.setState(nextState);

        if (!searchTerm) {
            // nextState.currentSectionIndex = 0; // ??? why ???
            return;
        }

        if (this.searchTermTimeout) {
            clearTimeout(this.searchTermTimeout);
        }

        if (prevSearchTerm === '') {
            const filteredEmojis = this.searchEmojis(searchTerm);
            this.setState({
                filteredEmojis,
            });
        } else {
            this.searchTermTimeout = setTimeout(() => {
                const filteredEmojis = this.searchEmojis(searchTerm);
                this.setState({
                    filteredEmojis,
                });
            }, 100);
        }
    };

    cancelSearch = () => {
        this.setState({
            currentSectionIndex: 0,
            filteredEmojis: [],
            searchTerm: '',
        });
    };

    searchEmojis = (searchTerm: string): string[] => {
        const searchTermLowerCase = searchTerm.toLowerCase();

        if (!searchTerm) {
            return [];
        }

        const sorter = (a: string, b: string) => {
            return compareEmojis(a, b, searchTermLowerCase);
        };

        const fuzz = this.fuse.search(searchTermLowerCase);

        const results = fuzz.reduce((values, r) => {
            const v = r?.matches?.[0]?.value;
            if (v) {
                values.push(v);
            }

            return values;
        }, [] as string[]);

        const data = results.sort(sorter);

        return data;
    };

    getNumberOfColumns = (deviceWidth: number) => {
        const shorten = Device.IS_IPHONE_WITH_INSETS && this.props.isLandscape ? 4 : 2;
        return Math.floor(Number(((deviceWidth - (SECTION_MARGIN * shorten)) / ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * shorten)))));
    };

    renderItem = ({item, section}) => {
        return (
            <View testID={section.defaultMessage}>
                <EmojiPickerRow
                    key={item.key}
                    emojiGutter={EMOJI_GUTTER}
                    emojiSize={EMOJI_SIZE}
                    items={item.items}
                    onEmojiPress={this.props.onEmojiPress}
                />
            </View>
        );
    };

    renderListComponent = (shorten) => {
        const {deviceWidth, theme} = this.props;
        const {emojis, filteredEmojis, searchTerm} = this.state;
        const styles = getStyleSheetFromTheme(theme);

        let listComponent;
        if (searchTerm) {
            const contentContainerStyle = filteredEmojis.length ? null : styles.flex;

            listComponent = (
                <FlatList
                    contentContainerStyle={contentContainerStyle}
                    data={filteredEmojis}
                    keyboardShouldPersistTaps='always'
                    keyExtractor={this.flatListKeyExtractor}
                    initialListSize={10}
                    ListEmptyComponent={this.renderEmptyList}
                    nativeID={SCROLLVIEW_NATIVE_ID}
                    pageSize={10}
                    renderItem={this.flatListRenderItem}
                    removeClippedSubviews={true}
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
                    removeClippedSubviews={true}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    sections={emojis}
                    showsVerticalScrollIndicator={false}
                    style={[
                        styles.sectionList,
                        {width: deviceWidth - SECTION_MARGIN * shorten},
                    ]}
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
                <View style={style.flatListEmoji}>
                    <Emoji
                        emojiName={item}
                        textStyle={style.emojiText}
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

        const {data} = await this.props.actions.getCustomEmojis(
            this.props.customEmojiPage,
            EMOJIS_PER_PAGE,
        );

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
        let nextIndex = this.state.emojiSectionIndexByOffset.findIndex(
            (offset) => contentOffset.y <= offset,
        );

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
        this.setState(
            {
                jumpToSection: true,
                currentSectionIndex: index,
            },
            () => {
                this.sectionListRef.scrollToLocation({
                    sectionIndex: index,
                    itemIndex: 0,
                    viewOffset: 25,
                });
            },
        );
    };

    handleScrollToSectionFailed = ({index}: {index: number}) => {
        if (this.scrollToSectionTries < 1) {
            const sfTimeout = setTimeout(() => {
                this.scrollToSectionTries++;
                this.scrollToSection(index);
                clearTimeout(sfTimeout);
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

    handleSectionIconPress = (index: number, isCustomSection = false) => {
        this.scrollToSectionTries = 0;
        this.scrollToSection(index);

        if (isCustomSection && this.props.customEmojiPage === 0) {
            this.loadMoreCustomEmojis();
        }
    };

    renderSectionIcons = () => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return this.state.emojis.map((section, index: number) => {
            const onPress = () => this.handleSectionIconPress(index, section.key === 'custom');

            return (
                <TouchableOpacity
                    key={section.key}
                    onPress={onPress}
                    style={styles.sectionIconContainer}
                >
                    <CompassIcon
                        name={section.icon}
                        size={17}
                        style={[
                            styles.sectionIcon,
                            index === this.state.currentSectionIndex && styles.sectionIconHighlight,
                        ]}
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

    renderEmptyList = () => {
        const {theme} = this.props;
        const {formatMessage} = this.context.intl;
        const {searchTerm} = this.state;
        const styles = getStyleSheetFromTheme(theme);
        const title = formatMessage(
            {
                id: 'mobile.emoji_picker.search.not_found_title',
                defaultMessage: 'No results found for "{searchTerm}"',
            },
            {
                searchTerm,
            },
        );
        const description = formatMessage({
            id: 'mobile.emoji_picker.search.not_found_description',
            defaultMessage: 'Check the spelling or try another search.',
        });
        return (
            <View style={[styles.flex, styles.flexCenter]}>
                <View style={styles.flexCenter}>
                    <View style={styles.notFoundIcon}>
                        <CompassIcon
                            name='magnify'
                            size={72}
                            color={theme.buttonBg}
                        />
                    </View>
                    <Text style={[styles.notFoundText, styles.notFoundText20]}>
                        {title}
                    </Text>
                    <Text style={[styles.notFoundText, styles.notFoundText15]}>
                        {description}
                    </Text>
                </View>
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
        emojiText: {
            color: '#000',
            fontWeight: 'bold',
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
        flexCenter: {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        },
        notFoundIcon: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            width: 120,
            height: 120,
            borderRadius: 60,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        notFoundText: {
            color: theme.centerChannelColor,
            marginTop: 16,
        },
        notFoundText20: {
            fontSize: 20,
            fontWeight: '600',
        },
        notFoundText15: {
            fontSize: 15,
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

export default injectIntl(withTheme(EmojiPicker));
