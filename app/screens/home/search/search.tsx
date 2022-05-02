// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import {debounce} from 'lodash';
import React, {useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {LayoutChangeEvent, DeviceEventEmitter, Keyboard, Text, FlatList, View, Platform, SectionList, SectionListData} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';

import Autocomplete from '@components/autocomplete';
import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import FreezeScreen from '@components/freeze_screen';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import DateSeparator from '@components/post_list/date_separator';
import ListTypes from '@constants/list';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';
import {getDateForDateLine, isDateLine} from '@utils/post_list';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Modifier, {MODIFIER_LABEL_HEIGHT, ModifierItem} from './modifier';
import RecentItem, {RECENT_LABEL_HEIGHT, RecentItemType} from './recent_item';
import ShowMoreButton from './show_more';

import type {HeaderRightButton} from '@components/navigation_header/header';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;
const SCROLL_UP_MULTIPLIER = 6;
const SEARCHING = 'searching';
const NO_RESULTS = 'no results';
const FAILURE = 'failure';

const EDGES: Edge[] = ['bottom', 'left', 'right'];

const emptySections: Array<SectionListData<ModifierItem | RecentItemType>> = [];

//    static propTypes = {
//     actions: PropTypes.shape({
//         clearSearch: PropTypes.func.isRequired,
//         handleSearchDraftChanged: PropTypes.func.isRequired,
//         removeSearchTerms: PropTypes.func.isRequired,
//         searchPostsWithParams: PropTypes.func.isRequired,
//         getMorePostsForSearch: PropTypes.func.isRequired,
//     }).isRequired,
// };

type Props = {
    timezoneOffsetInSeconds: number;
    archivedPostIds: string[];
    currentTeamId: string;
    value: string;
    isSearchGettingMore: boolean;
    postIds: string[];
    recent: [];
    viewArchivedChannels: boolean;
}

const getModifiersSectionsData = (intl: IntlShape, showMore: boolean): ModifierItem[] => {
    const formatMessage = intl.formatMessage;
    const sectionsData = [
        {
            value: 'From:',
            testID: 'search.from_section',
            modifier: `${formatMessage({id: 'mobile.search.from_modifier_title', defaultMessage: 'username'})}`,
            description: formatMessage({
                id: 'mobile.search.from_modifier_description',
                defaultMessage: ' a specific user',
            }),
        }, {
            value: 'In:',
            testID: 'search.in_section',
            modifier: `${formatMessage({id: 'mobile.search.in_modifier_title', defaultMessage: 'channel-name'})}`,
            description: formatMessage({
                id: 'mobile.search.in_modifier_description',
                defaultMessage: ' a specific channel',
            }),
        }, {
            value: 'On:',
            testID: 'search.on_section',
            modifier: 'YYYY-MM-DD',
            description: formatMessage({
                id: 'mobile.search.on_modifier_description',
                defaultMessage: ' a specific date',
            }),
        }];

    if (showMore) {
        sectionsData.push(
            {

                // TODO: After is not shown in figma
                value: 'After:',
                testID: 'search.after_section',
                modifier: 'YYYY-MM-DD',
                description: formatMessage({
                    id: 'mobile.search.after_modifier_description',
                    defaultMessage: ' after a date',
                }),
            }, {
                value: 'Before:',
                testID: 'search.before_section',
                modifier: 'YYYY-MM-DD',
                description: formatMessage({
                    id: 'mobile.search.before_modifier_description',
                    defaultMessage: ' before a date',
                }),
            }, {
                value: '-',
                testID: 'search.exclude_section',
                modifier: 'YYYY-MM-DD',
                description: formatMessage({
                    id: 'mobile.search.exclude_modifier_description',
                    defaultMessage: ' exclude search terms',
                }),
            }, {
                value: '""',
                testID: 'search.phrases_section',
                modifier: 'YYYY-MM-DD',
                description: formatMessage({
                    id: 'mobile.search.phrases_modifier_description',
                    defaultMessage: ' messages with phrases',
                }),
            },
        );
    }
    return sectionsData;
};

const SearchScreen = ({archivedPostIds, currentTeamId, value, isSearchGettingMore, postIds, recent, timezoneOffsetInSeconds, viewArchivedChannels}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const theme = useTheme();
    const intl = useIntl();
    const formatMessage = intl.formatMessage;

    const listRef = useRef(null);
    const searchBarRef = useRef<TextInput>(null);

    // const [sections, setSections] = useState<Array<SectionListData<Channel>>>(emptySections);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [searchValue, setValue] = useState(value);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('not_started');
    const [didFail, setDidFail] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [recentValues, setRecent] = useState(recent || []);
    const [contentOffsetY, setContentOffsetY] = useState(0);

    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const {searchTerm} = nav.getState().routes[stateIndex].params;
    const styles = getStyleFromTheme(theme);

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],
        };
    }, [isFocused, stateIndex]);

    // Todo: Remove example
    const isLargeTitle = true;
    const subtitle = '';
    const title = 'Search';
    const hasSearch = true;
    const showBackButton = false;
    const addLeftComponent = false;
    const addRightButtons = false;
    let leftComponent;
    let rightButtons: HeaderRightButton[] | undefined;

    if (addLeftComponent) {
        leftComponent = (
            <View>
                <Badge
                    type='Small'
                    visible={true}
                    value={1}
                    style={{top: 0, left: 2, position: 'relative'}}
                    borderColor='transparent'
                />
            </View>
        );
    }

    if (addRightButtons) {
        rightButtons = [{
            iconName: 'magnify',
            onPress: () => true,
        }, {
            iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
            onPress: () => true,
            rippleRadius: 15,
            borderless: true,
            buttonType: 'opacity',
        }];
    }

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<FlatList<string>>(isLargeTitle, Boolean(subtitle), hasSearch);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop}), [scrollPaddingTop]);

    useEffect(() => {
        // this.navigationEventListener = Navigation.events().bindComponent(this);
        HWKeyboardEvent.onHWKeyPressed(handleHardwareEnterPress);

        if (value) {
            search(value, false);
        }

        // setTimeout(() => {
        if (searchBarRef && !value) {
            searchBarRef.current?.focus();
        }

        // }, 150);
        return () => HWKeyboardEvent.removeOnHWKeyPressed();
    }, [value]);

    // componentDidUpdate(prevProps, prevState) {
    //     const {recent, didFail, isLoaded, status} = this.state;
    //     const {status: prevStatus} = prevState;
    //     const shouldScroll = prevStatus !== status &&
    //         (isLoaded || didFail) &&
    //         !this.props.isSearchGettingMore && !prevProps.isSearchGettingMore && prevState.recent.length === recent.length;
    //
    //     if (shouldScroll) {
    //         setTimeout(() => {
    //             const recentLabelsHeight = recent.length * RECENT_LABEL_HEIGHT;
    //             const recentSeparatorsHeight = (recent.length - 1) * RECENT_SEPARATOR_HEIGHT;
    //             const modifiersCount = 5;
    //             const modifiersHeight = modifiersCount * MODIFIER_LABEL_HEIGHT;
    //             const modifiersSeparatorHeight = (modifiersCount - 1) * RECENT_SEPARATOR_HEIGHT;
    //             const offset = modifiersHeight + modifiersSeparatorHeight + SECTION_HEIGHT + recentLabelsHeight + recentSeparatorsHeight;
    //
    //             Keyboard.dismiss();
    //             if (this.listRef?._wrapperListRef) {
    //                 this.listRef._wrapperListRef.getListRef().scrollToOffset({
    //                     animated: true,
    //                     offset,
    //                 });
    //             }
    //         }, 250);
    //     }
    // }
    //
    // componentWillUnmount() {
    //     HWKeyboardEvent.removeOnHWKeyPressed();
    // }

    const handleHardwareEnterPress = (keyEvent) => {
        if (EphemeralStore.getNavigationTopComponentId() === 'Search') {
            switch (keyEvent.pressedKey) {
                case 'enter':
                    search(searchValue);
                    break;
            }
        }
    };

    type archivedIndicatorType = {
        postID: string;
        style;
    }
    const archivedIndicator = ({postID, style}: archivedIndicatorType) => {
        const channelIsArchived = archivedPostIds.includes(postID);
        let indicator = null;
        if (channelIsArchived) {
            indicator = (
                <View style={style.archivedIndicator}>
                    <Text>
                        <CompassIcon
                            name='archive-outline'
                            style={style.archivedText}
                        />
                        {' '}
                        <FormattedText
                            style={style.archivedText}
                            id='search_item.channelArchived'
                            defaultMessage='Archived'
                        />
                    </Text>
                </View>
            );
        }
        return indicator;
    };

    // const cancelSearch = preventDoubleTap(() => {
    //     handleTextChanged('', true);
    //     dismissModal();
    // });

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        this.setState({searchListHeight: height});
    }, []);

    const handleScroll = (event) => {
        const pageOffsetY = event.nativeEvent.contentOffset.y;
        if (pageOffsetY > 0) {
            const contentHeight = event.nativeEvent.contentSize.height;
            const direction = (contentOffsetY < pageOffsetY) ? ListTypes.VISIBILITY_SCROLL_UP : ListTypes.VISIBILITY_SCROLL_DOWN;

            setContentOffsetY(pageOffsetY);
            if (
                direction === ListTypes.VISIBILITY_SCROLL_UP &&
                (contentHeight - pageOffsetY) < (this.state.searchListHeight * SCROLL_UP_MULTIPLIER)
            ) {
                getMoreSearchResults();
            }
        }
    };

    const handleSelectionChange = (event) => {
        const newCursorPosition = event.nativeEvent.selection.end;
        setCursorPosition(newCursorPosition);
    };

    const handleSearchButtonPress = preventDoubleTap((text) => {
        search(text, false);
    });

    const handleTextChanged = useCallback((value: string, selectionChanged: boolean) => {
        // const {actions} = this.props;
        console.log('value', value);
        setValue(value);

        // actions.handleSearchDraftChanged(value);

        // if (!value && isLoaded && !isSearchGettingMore) {
        //     actions.clearSearch();
        //     scrollToTop();
        // }

        // FIXME: Workaround for iOS when setting the value directly
        // in the inputText, bug in RN 0.48
        // if (Platform.OS === 'ios' && selectionChanged) {
        //     handleSelectionChange({
        //         nativeEvent: {
        //             selection: {
        //                 end: value.length,
        //             },
        //         },
        //     });
        // }
    }, [value]);

    const keyModifierExtractor = (item) => {
        return `modifier-${item.value}`;
    };

    const keyRecentExtractor = (item: RecentItemType) => {
        return `recent-${item.terms}`;
    };

    const keyPostExtractor = (item) => {
        return item.id || item;
    };

    const getMoreSearchResults = debounce(() => {
        if (searchValue && postIds.length) {
            this.props.actions.getMorePostsForSearch();
        }
    }, 100);

    const onViewableItemsChanged = ({viewableItems}) => {
        const visible = viewableItems.filter((item) => item.section.key === 'results');
        if (!visible.length) {
            return;
        }

        const viewableItemsMap = visible.reduce((acc, {item, isViewable}) => {
            if (isViewable) {
                acc[item] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit('scrolled', viewableItemsMap);
    };

    const removeSearchTerms = preventDoubleTap((item) => {
        const {actions} = this.props;
        const newRecent = [...recentValues];
        const index = recentValues.indexOf(item);

        if (index !== -1) {
            recentValues.splice(index, 1);
            setRecent({newRecent});
        }

        actions.removeSearchTerms(currentTeamId, item.terms);
    });

    const renderFooter = () => {
        if (isSearchGettingMore) {
            return (
                <View style={styles.loadingMore}>
                    <Loading color={theme.centerChannelColor}/>
                </View>
            );
        }

        return null;
    };

    const renderModifiers = ({item}: ModifierItem) => {
        return (
            <Modifier
                item={item}
                setModifierValue={setModifierValue}
            />
        );
    };

    // const renderPost = ({item, index}) => {
    //     if (item.id) {
    //         return (
    //             <View style={style.customItem}>
    //                 {item.component}
    //             </View>
    //         );
    //     }
    //
    //     if (isDateLine(item)) {
    //         return (
    //             <DateSeparator
    //                 date={getDateForDateLine(item)}
    //                 theme={theme}
    //             />
    //         );
    //     }
    //
    //     let separator;
    //     const nextPost = postIds[index + 1];
    //     if (nextPost && !isDateLine(nextPost)) {
    //         separator = <PostSeparator theme={theme}/>;
    //     }
    //
    //     return (
    //         <View style={style.postResult}>
    //             <ChannelDisplayName postId={item}/>
    //             {archivedIndicator(postIds[index], style)}
    //             <SearchResultPost
    //                 postId={item}
    //                 skipPinnedHeader={true}
    //                 theme={theme}
    //             />
    //             {separator}
    //         </View>
    //     );
    // };

    const renderRecentSeparator = () => {
        return (
            <View style={styles.separatorContainer}>
                <View style={styles.separator}/>
            </View>
        );
    };

    const renderSectionHeader = ({section}) => {
        const {title} = section;

        if (title) {
            return (

                // <View style={styles.sectionWrapper}>
                // <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                    {title}
                </Text>

            // </View>
            //  </View>
            );
        }

        return <View/>;
    };

    const renderRecentItem = ({item}) => {
        return (
            <RecentItem
                item={item}
                removeSearchTerms={removeSearchTerms}
                setRecentValue={setRecentValue}
                theme={theme}
            />
        );
    };

    const retry = () => {
        search(searchValue.trim(), false);
    };

    const scrollToTop = () => {
        if (listRef?._wrapperListRef) {
            listRef._wrapperListRef.getListRef().scrollToOffset({
                animated: false,
                offset: 0,
            });
        }
    };

    const search = async (text: string, isOrSearch: boolean) => {
        const {actions} = this.props;
        const newRecent = [...recentValues];
        const terms = text.trim();

        handleTextChanged(`${terms} `, false);

        // Trigger onSelectionChanged Manually when submitting
        handleSelectionChange({
            nativeEvent: {
                selection: {
                    end: terms.length + 1,
                },
            },
        });

        // timezone offset in seconds
        const params = {
            terms,
            is_or_search: isOrSearch,
            time_zone_offset: timezoneOffsetInSeconds,
            page: 0,
            per_page: 20,
            include_deleted_channels: viewArchivedChannels,
        };
        setStatus('isLoading');
        setIsLoading(true);
        setIsLoaded(false);
        const {error} = await actions.searchPostsWithParams(currentTeamId, params, true);

        if (!newRecent.find((r) => r.terms === terms)) {
            newRecent.push({
                terms,
            });
            setRecent({newRecent});
        }
        setIsLoading(false);
        setDidFail(Boolean(error));
        setIsLoaded(true);
        setStatus(error ? 'didFail' : 'isLoaded');
    };

    const setModifierValue = preventDoubleTap((modifier) => {
        console.log('modifier', modifier);
        let newValue = '';

        if (!searchValue) {
            newValue = modifier;
        } else if (searchValue.endsWith(' ')) {
            newValue = `${searchValue}${modifier}`;
        } else {
            newValue = `${searchValue} ${modifier}`;
        }

        console.log('newValue', newValue);
        handleTextChanged(newValue, true);

        // searchBarRef.focus();
    });

    const setRecentValue = preventDoubleTap(({recentNew}: RecentItemType) => {
        const {terms, isOrSearch} = recentNew;
        handleTextChanged(terms, false);
        search(terms, isOrSearch);
        Keyboard.dismiss();
    });

    const sectionsData = getModifiersSectionsData(intl, showMore);

    const renderShowMoreItem = useCallback(() => {
        return (
            <ShowMoreButton
                theme={theme}
                onPress={() => {
                    setShowMore(!showMore);
                }}
                showMore={showMore}
            />
        );
    }, [showMore]);

    const sections: typeof emptySections = [{
        data: sectionsData,
        key: 'modifiers',
        title: 'Search options',
        renderItem: renderModifiers,
        keyExtractor: keyModifierExtractor,

        // ItemSeparatorComponent: renderRecentSeparator,
    }];

    sections.push({
        data: [showMore],
        renderItem: renderShowMoreItem,
        ItemSeparatorComponent: renderRecentSeparator,
    });

    if (recentValues.length) {
        sections.push({
            data: recentValues,
            key: 'recent',
            title: formatMessage({id: 'mobile.search.recent_title', defaultMessage: 'Recent Searches'}),
            renderItem: renderRecentItem,
            keyExtractor: keyRecentExtractor,
            ItemSeparatorComponent: renderRecentSeparator,
        });
    }

    let results;

    if (didFail) {
        if (postIds.length) {
            results = postIds;
        } else {
            results = [{
                id: FAILURE,
                component: (
                    <View style={styles.searching}>
                        {/* <PostListRetry */}
                        {/*     retry={retry} */}
                        {/*     theme={theme} */}
                        {/* /> */}
                        <Text>
                            {'did fail not yet implemented'}
                        </Text>
                    </View>
                ),
            }];
        }
    } else if (isLoading) {
        if (isSearchGettingMore) {
            results = postIds;
        } else {
            results = [{
                id: SEARCHING,
                component: (
                    <View style={styles.searching}>
                        <Loading color={theme.centerChannelColor}/>
                    </View>
                ),
            }];
        }
    } else if (isLoaded) {
        if (postIds.length) {
            results = postIds;
        } else if (searchValue) {
            results = [{
                id: NO_RESULTS,
                component: (
                    <FormattedText
                        id='mobile.search.no_results'
                        defaultMessage='No Results Found'
                        style={styles.noResults}
                    />
                ),
            }];
        }
    }

    if (results) {
        sections.push({
            data: results,
            key: 'results',
            title: formatMessage({id: 'search_header.results', defaultMessage: 'Search Results'}),
            renderItem: renderPost,
            keyExtractor: keyPostExtractor,
        });
    }

    // const searchBarInput = {
    //     backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
    //     color: theme.sidebarHeaderTextColor,
    //     fontSize: 15,
    // };

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={isLargeTitle}
                leftComponent={leftComponent}
                onBackPress={() => {
                    // eslint-disable-next-line no-console
                    console.log('BACK');
                }}
                rightButtons={rightButtons}
                showBackButton={showBackButton}
                subtitle={subtitle}
                title={title}
                hasSearch={hasSearch}
                scrollValue={scrollValue}

                // forwardedRef={searchBarRef}
                forwardedRef={scrollRef}
                onChangeText={(text) => {
                    // eslint-disable-next-line no-console
                    console.log('Search for value', text);
                }}
                onSubmitEditing={() => {
                    // eslint-disable-next-line no-console
                    console.log('Execute search');
                }}
                blurOnSubmit={true}
                placeholder={formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                defaultValue={searchValue}
            />
            <SafeAreaView
                style={styles.flex}
                edges={EDGES}
            >
                <Animated.View style={[styles.flex, animated]}>
                    <AnimatedSectionList
                        contentContainerStyle={paddingTop}

                        // ref={scrollRef}
                        //     style={style.sectionList}
                        removeClippedSubviews={true}
                        renderSectionHeader={renderSectionHeader}
                        sections={sections}
                        keyboardShouldPersistTaps='always'
                        keyboardDismissMode='interactive'
                        stickySectionHeadersEnabled={Platform.OS === 'ios'}

                        // onLayout={handleLayout}
                        onScroll={handleScroll}
                        scrollEventThrottle={60}

                        // SectionSeparatorComponent={renderRecentSeparator}
                        ListFooterComponent={renderFooter}
                        onViewableItemsChanged={onViewableItemsChanged}
                        testID='search.results_list'
                    />
                </Animated.View>
            </SafeAreaView>
            <Autocomplete
                cursorPosition={cursorPosition}
                updateValue={setValue}
                isSearch={true}
                value={searchValue}
                enableDateSuggestion={true}
            />
        </FreezeScreen>
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            width: '100%',
            ...Platform.select({
                android: {
                    height: 46,
                    justifyContent: 'center',
                },
                ios: {
                    height: 61,
                    paddingLeft: 14,
                    paddingRight: 5,
                    paddingTop: 14,
                },
            }),
        },
        searchBarContainer: {
            padding: 0,
        },
        sectionWrapper: {
            marginBottom: 12,
            height: 48,
            backgroundColor: theme.centerChannelBg,
        },
        sectionContainer: {
            justifyContent: 'center',
            paddingLeft: 20,
            height: SECTION_HEIGHT,
        },
        sectionTitle: {
            padding: 20,
            color: theme.centerChannel,
            ...typography('Heading', 600, 'SemiBold'),
        },
        showMore: {
            padding: 20,
            color: theme.buttonBg,
            ...typography('Body', 600, 'SemiBold'),
        },
        recentItemContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: RECENT_LABEL_HEIGHT,
        },
        recentItemLabel: {
            color: theme.centerChannelColor,
            fontSize: 14,
            height: 20,
            flex: 1,
            paddingHorizontal: 16,
        },
        recentRemove: {
            alignItems: 'center',
            height: RECENT_LABEL_HEIGHT,
            justifyContent: 'center',
            width: 50,
        },
        separatorContainer: {
            justifyContent: 'center',
            flex: 1,
            height: RECENT_SEPARATOR_HEIGHT,
        },
        postsSeparator: {
            height: 15,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        sectionList: {
            flex: 1,
        },
        customItem: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        noResults: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 20,
            fontWeight: '400',
            marginTop: 65,
            textAlign: 'center',
            textAlignVertical: 'center',
        },
        searching: {
            marginTop: 65,
        },
        archivedIndicator: {
            alignItems: 'flex-end',
            width: 150,
            alignSelf: 'flex-end',
            marginTop: -17,
            marginRight: 10,
        },
        archivedText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
        },
        postResult: {
            overflow: 'hidden',
        },
        loadingMore: {
            height: 60,
        },
    };
});

export default SearchScreen;

