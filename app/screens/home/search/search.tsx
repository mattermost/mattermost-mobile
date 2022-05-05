// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useIntl} from 'react-intl';
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
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {RECENT_LABEL_HEIGHT, RecentItemType} from './recent_searches/recent_item';
import RecentSearches from './recent_searches/recent_searches';
import {MODIFIER_LABEL_HEIGHT, ModifierItem} from './search_modifiers/modifier';
import SearchModifiers from './search_modifiers/search_modifiers';
import SearchResults from './search_results/search_results';

import type {HeaderRightButton} from '@components/navigation_header/header';

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;
const SCROLL_UP_MULTIPLIER = 6;
const SEARCHING = 'searching';
const NO_RESULTS = 'no results';
const FAILURE = 'failure';

const EDGES: Edge[] = ['bottom', 'left', 'right'];

const isLargeTitle = true;
const subtitle = '';
const title = 'Search';
const hasSearch = true;
const showBackButton = false;

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
    initialValue: string;
    isSearchGettingMore: boolean;
    postIds: string[];
    recent: [];
    viewArchivedChannels: boolean;
}

const SearchScreen = ({teamsCount, archivedPostIds, currentTeamId, initialValue, isSearchGettingMore, postIds, recent, timezoneOffsetInSeconds, viewArchivedChannels}: Props) => {
    console.log('\n<><><> enhanced SearchScreen Component');
    console.log('currentTeamId', currentTeamId);

    console.log('teamsCount', teamsCount);
    console.log('viewArchivedChannels', viewArchivedChannels);

    // console.log('recent', recent);
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const theme = useTheme();
    const intl = useIntl();
    const formatMessage = intl.formatMessage;

    const listRef = useRef(null);
    const searchBarRef = useRef<TextInput>(null);

    const [cursorPosition, setCursorPosition] = useState(0);
    const [searchValue, setValue] = useState(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('not_started');
    const [didFail, setDidFail] = useState(false);
    const [recentValues, setRecent] = useState(recent || []);

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

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<FlatList<string>>(isLargeTitle, Boolean(subtitle), hasSearch);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop}), [scrollPaddingTop]);

    useEffect(() => {
        // this.navigationEventListener = Navigation.events().bindComponent(this);
        HWKeyboardEvent.onHWKeyPressed(handleHardwareEnterPress);

        if (searchValue) {
            search(searchValue, false);
        }

        // setTimeout(() => {
        if (searchBarRef && !searchValue) {
            searchBarRef.current?.focus();
        }

        // }, 150);
        return () => HWKeyboardEvent.removeOnHWKeyPressed();
    }, [searchValue]);

    useEffect(() => {
        const shouldScroll = (isLoaded || didFail) &&
            !isSearchGettingMore && recent.length;

        if (shouldScroll) {
            setTimeout(() => {
                const recentLabelsHeight = recent.length * RECENT_LABEL_HEIGHT;
                const recentSeparatorsHeight = (recent.length - 1) * RECENT_SEPARATOR_HEIGHT;
                const modifiersCount = 5;
                const modifiersHeight = modifiersCount * MODIFIER_LABEL_HEIGHT;
                const modifiersSeparatorHeight = (modifiersCount - 1) * RECENT_SEPARATOR_HEIGHT;
                const offset = modifiersHeight + modifiersSeparatorHeight + SECTION_HEIGHT + recentLabelsHeight + recentSeparatorsHeight;
                Keyboard.dismiss();

                //             if (this.listRef?._wrapperListRef) {
                //                 this.listRef._wrapperListRef.getListRef().scrollToOffset({
                //                     animated: true,
                //                     offset,
                //                 });
                //             }
            }, 250);
        }

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
    }, [recent, didFail, isLoaded, status]);

    //
    // componentWillUnmount() {
    //     HWKeyboardEvent.removeOnHWKeyPressed();
    // }

    const handleHardwareEnterPress = useCallback((keyEvent) => {
        if (EphemeralStore.getNavigationTopComponentId() === 'Search') {
            switch (keyEvent.pressedKey) {
                case 'enter':
                    search(searchValue, false);
                    break;
            }
        }
    }, [searchValue]);

    // const cancelSearch = preventDoubleTap(() => {
    //     handleTextChanged('', true);
    //     dismissModal();
    // });

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        this.setState({searchListHeight: height});
    }, []);

    const handleSelectionChange = (event) => {
        const newCursorPosition = event.nativeEvent.selection.end;
        setCursorPosition(newCursorPosition);
    };

    const handleSearchButtonPress = preventDoubleTap((text) => {
        search(text, false);
    });

    const handleTextChanged = useCallback((value: string, selectionChanged: boolean) => {
        // const {actions} = this.props;
        setValue(value);

        // actions.handleSearchDraftChanged(value);

        if (!value && isLoaded && !isSearchGettingMore) {
            // actions.clearSearch();
            scrollToTop();
        }

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
    }, [searchValue]);

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

    const search = async (isOrSearch: boolean) => {
        // const {actions} = this.props;
        const newRecent = [...recentValues];
        const terms = searchValue.trim();
        console.log('terms', terms);

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

        // const {error} = await actions.searchPostsWithParams(currentTeamId, params, true);

        // if (!newRecent.find((r) => r.terms === terms)) {
        //     newRecent.push({
        //         terms,
        //     });
        //     setRecent({newRecent});
        // }
        setIsLoading(false);

        // setDidFail(Boolean(error));
        setIsLoaded(true);

        // setStatus(error ? 'didFail' : 'isLoaded');
    };

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

    // const searchBarInput = {
    //     backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
    //     color: theme.sidebarHeaderTextColor,
    //     fontSize: 15,
    // };

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={isLargeTitle}
                onBackPress={() => {
                    // eslint-disable-next-line no-console
                    console.log('BACK');
                }}
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
                    search(true);
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
                    <SearchModifiers
                        handleTextChanged={handleTextChanged}
                        paddingTop={paddingTop}
                        searchValue={searchValue}
                    />
                    <RecentSearches
                        handleTextChanged={handleTextChanged}
                        recent={recent}
                        searchValue={searchValue}
                    />
                    {(results || true) &&
                        <SearchResults
                            results={results}
                            paddingTop={paddingTop}
                        />
                    }

                </Animated.View>

            </SafeAreaView>
            {/* <Autocomplete */}
            {/*     cursorPosition={cursorPosition} */}
            {/*     updateValue={setValue} */}
            {/*     isSearch={true} */}
            {/*     value={searchValue} */}
            {/*     enableDateSuggestion={true} */}
            {/* /> */}
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
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
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
        loadingMore: {
            height: 60,
        },
    };
});

export default SearchScreen;

