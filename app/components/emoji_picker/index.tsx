// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import Fuse from 'fuse.js';
import React, {PureComponent} from 'react';
import {IntlShape} from 'react-intl';
import {ActivityIndicator, FlatList, Platform, SectionList, Text, TouchableOpacity, View} from 'react-native';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {getEmojisByName, selectEmojisBySection} from '@actions/local/custom_emoji';
import {getCustomEmojis} from '@actions/remote/custom_emoji';
import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import EmptyList from '@components/emoji_picker/empty_list';
import FormattedText from '@components/formatted_text';
import {Device} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {WithDatabaseArgs} from '@typings/database/database';
import SystemModel from '@typings/database/models/servers/system';
import {compareEmojis, isCustomEmojiEnabled} from '@utils/emoji/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiPickerComponent from './emoji_picker';
import EmojiPickerRow from './emoji_picker_row';

const EMOJI_SIZE = 30;
const EMOJI_GUTTER = 7;
const EMOJIS_PER_PAGE = 200;
const SECTION_HEADER_HEIGHT = 28;
const SECTION_MARGIN = 15;
export const SCROLL_VIEW_NATIVE_ID = 'emojiPicker';

export function filterEmojiSearchInput(searchText: string) {
    return searchText.toLowerCase().replace(/^:|:$/g, '');
}

type EmojiPickerProps = {
    deviceWidth: number;
    intl: IntlShape;
    isLandscape: boolean;
    onEmojiPress: (emoji: string) => void;
    serverUrl: string;
    testID: string;
    theme: Theme;
}

type EmojiPickerState = {
    currentSectionIndex: number;
    emojiSectionIndexByOffset: number[];
    emojis: RenderableEmojis[];
    filteredEmojis: string[];
    jumpToSection: boolean;
    loadingMore: boolean;
    missingPages: boolean;
    searchTerm: string;
};

type ConnectedEmojiPickerProps = EmojiPickerProps & {
    database: Database;
    config: ClientConfig;
    customEmojiPage: number;
    emojis: string;
    emojisBySection: EmojiSection[];
}

class EmojiPicker extends PureComponent<ConnectedEmojiPickerProps, EmojiPickerState> {
    private fuse: Fuse<unknown> | null | undefined;
    private readonly customEmojisEnabled: boolean;
    private readonly sectionListGetItemLayout: any;
    private rebuildEmojis: boolean | undefined;
    private scrollToSectionTries: number;
    private searchBarRef: any;
    private searchTermTimeout: NodeJS.Timeout | undefined;
    private sectionListRef: any;

    constructor(props: ConnectedEmojiPickerProps) {
        super(props);

        this.sectionListGetItemLayout = sectionListGetItemLayout({
            getItemHeight: () => {
                return (EMOJI_SIZE + 7) + (EMOJI_GUTTER * 2);
            },
            getSectionHeaderHeight: () => SECTION_HEADER_HEIGHT,
        });

        const {config} = props;

        this.customEmojisEnabled = isCustomEmojiEnabled(config);
        this.scrollToSectionTries = 0;
        this.state = {
            currentSectionIndex: 0,
            emojiSectionIndexByOffset: [],
            emojis: [],
            filteredEmojis: [],
            jumpToSection: false, // fixme : should it be false or null
            loadingMore: false,
            missingPages: true,
            searchTerm: '',

        //    customEmojiPage : fixme : track this value in State
        };
    }

    async componentDidMount() {
        await this.setUp();
    }

     setUp = async () => {
         const {serverUrl, deviceWidth} = this.props;
         this.fuse = await this.getFuseInstance();

         const {emoticons: emojisBySection} = await selectEmojisBySection(serverUrl);
         if (emojisBySection) {
             const emojis = this.renderableEmojis(emojisBySection, deviceWidth);
             const emojiSectionIndexByOffset = this.measureEmojiSections(emojis);

             this.setState({
                 emojis,
                 emojiSectionIndexByOffset,
             });
         }
     }

    getFuseInstance = async () => {
        const {serverUrl} = this.props;

        const {data: emojis} = await getEmojisByName(serverUrl);

        const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false};

        if (emojis) {
            const list = emojis.length ? emojis : [];
            return new Fuse(list, options);
        }

        return null;
    }

    componentDidUpdate(prevProps: EmojiPickerProps) {
        //fixme:  rework this componentDidUpdate
        // this.rebuildEmojis = false;
        // if (this.props.deviceWidth !== prevProps.deviceWidth) {
        //     this.rebuildEmojis = true;
        //
        //     if (this.searchBarRef) {
        //         this.searchBarRef.blur();
        //     }
        // }
        //
        // if (this.props.emojis !== prevProps.emojis) {
        //     this.rebuildEmojis = true;
        // }
        //
        // this.setRebuiltEmojis();
    }

    setSearchBarRef = (ref: any) => {
        this.searchBarRef = ref;
    };

    setSectionListRef = (ref: any) => {
        this.sectionListRef = ref;
    };

    setRebuiltEmojis = (searchBarAnimationComplete = true) => {
        const {emojisBySection, deviceWidth} = this.props;
        if (this.rebuildEmojis && searchBarAnimationComplete) {
            this.rebuildEmojis = false;
            const emojis = this.renderableEmojis(emojisBySection, deviceWidth);
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

        const fuzz = this.fuse?.search(searchTermLowerCase);

        if (fuzz) {
            const results = fuzz.reduce((values, r) => {
                const v = r?.matches?.[0]?.value;
                if (v) {
                    values.push(v);
                }

                return values;
            }, [] as string[]);

            const data = results.sort(sorter);

            return data;
        }

        return [];
    };

    getNumberOfColumns = (deviceWidth: number) => {
        const {isLandscape} = this.props;
        const shorten = Device.IS_IPHONE_WITH_INSETS && isLandscape ? 4 : 2;
        return Math.floor(Number(((deviceWidth - (SECTION_MARGIN * shorten)) / ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * shorten)))));
    };

    renderListComponent = (shorten: number) => {
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
                    ListEmptyComponent={
                        <EmptyList searchTerm={searchTerm}/>
                    }
                    nativeID={SCROLL_VIEW_NATIVE_ID}
                    renderItem={this.flatListRenderItem}
                    removeClippedSubviews={true}
                    style={styles.flatList}

                    // pageSize={10}
                />
            );
        } else {
            listComponent = (
                <SectionList
                    ListFooterComponent={this.renderFooter}
                    getItemLayout={this.sectionListGetItemLayout}
                    initialNumToRender={50}
                    keyboardDismissMode='interactive'
                    keyboardShouldPersistTaps='always'
                    nativeID={SCROLL_VIEW_NATIVE_ID}
                    onEndReached={this.loadMoreCustomEmojis}
                    onEndReachedThreshold={Platform.OS === 'ios' ? 0 : 1}
                    onMomentumScrollEnd={this.onMomentumScrollEnd}
                    onScroll={this.onScroll}
                    onScrollToIndexFailed={this.handleScrollToSectionFailed}
                    pageSize={50}
                    ref={this.setSectionListRef}
                    removeClippedSubviews={true}
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

    renderItem = ({item, section}: {item: EmojisData; section: RenderableEmojis}) => {
        const {onEmojiPress} = this.props;
        return (
            <View testID={section.id}>
                <EmojiPickerRow
                    key={item.key}
                    emojiGutter={EMOJI_GUTTER}
                    emojiSize={EMOJI_SIZE}
                    items={item.items}
                    onEmojiPress={onEmojiPress}
                />
            </View>
        );
    };

    renderSectionHeader = ({section}: {section: RenderableEmojis}) => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);

        return (
            <View
                style={styles.sectionTitleContainer}
                key={section.id}
            >
                <FormattedText
                    style={styles.sectionTitle}
                    id={section.id}
                    defaultMessage={section.icon}
                />
            </View>
        );
    };

    flatListKeyExtractor = (item: string) => item;

    flatListRenderItem = ({item}: {item: string}) => {
        const {theme, onEmojiPress} = this.props;
        const style = getStyleSheetFromTheme(theme);

        //fixme:  what is onEmojiPress ???
        return (
            <TouchableOpacity
                onPress={() => onEmojiPress(item)}
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
        const {customEmojiPage, serverUrl} = this.props;
        if (!this.customEmojisEnabled) {
            return;
        }

        const {data} = await getCustomEmojis(serverUrl, customEmojiPage, EMOJIS_PER_PAGE);

        this.setState({loadingMore: false});

        if (!data) {
            return;
        }

        if (data.length < EMOJIS_PER_PAGE) {
            this.setState({missingPages: false});
        }

        //todo: incrementEmojiPickerPage
        // incrementEmojiPickerPage();
    };

    onScroll = (e) => {
        if (this.state.jumpToSection) {
            return;
        }

        // clearTimeout(this.setIndexTimeout);

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

    scrollToSection = (index: number) => {
        this.setState({jumpToSection: true, currentSectionIndex: index},
            () => {
                this.sectionListRef.scrollToLocation({sectionIndex: index, itemIndex: 0, viewOffset: 25});
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

    handleSectionIconPress = (index: number, isCustomSection = false) => {
        //fixme: rework this method
        // this.scrollToSectionTries = 0;
        // this.scrollToSection(index);
        //
        // if (isCustomSection && this.props.customEmojiPage === 0) {
        //     this.loadMoreCustomEmojis();
        // }
    };

    renderSectionIcons = () => {
        const {theme} = this.props;
        const styles = getStyleSheetFromTheme(theme);
        console.log('>>>  renderSectionIcons parent');
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

    render() {
        const {searchTerm} = this.state;
        const {testID, theme} = this.props;
        console.log('>>>  in render method ');
        return (
            <EmojiPickerComponent
                onAnimationComplete={this.setRebuiltEmojis}
                onCancelSearch={this.cancelSearch}
                onChangeSearchTerm={this.changeSearchTerm}
                onSetSearchBarRef={this.setSearchBarRef}
                renderListComponent={this.renderListComponent}
                renderSectionIcons={this.renderSectionIcons}
                searchTerm={searchTerm}
                testID={testID}
                theme={theme}
            />
        );
    }
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

const withConfig = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),
    };
});

const ConnectedEmojiPicker: React.FC<EmojiPickerProps> = withDatabase(withConfig(EmojiPicker));

export default ConnectedEmojiPicker;
