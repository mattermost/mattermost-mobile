// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    Platform,
    SectionList,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {RequestStatus} from 'mattermost-redux/constants';

import {debounce} from 'mattermost-redux/actions/helpers';

import Autocomplete from 'app/components/autocomplete';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import DateHeader from 'app/components/post_list/date_header';
import {isDateLine} from 'app/components/post_list/date_header/utils';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import PostListRetry from 'app/components/post_list_retry';
import PostSeparator from 'app/components/post_separator';
import SafeAreaView from 'app/components/safe_area_view';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {DeviceTypes, ListTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDisplayName from './channel_display_name';
import SearchResultPost from './search_result_post';

const SECTION_HEIGHT = 20;
const RECENT_LABEL_HEIGHT = 42;
const RECENT_SEPARATOR_HEIGHT = 3;
const MODIFIER_LABEL_HEIGHT = 58;
const SCROLL_UP_MULTIPLIER = 6;
const SEARCHING = 'searching';
const NO_RESULTS = 'no results';

export default class Search extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            handleSearchDraftChanged: PropTypes.func.isRequired,
            loadChannelsByTeamName: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            removeSearchTerms: PropTypes.func.isRequired,
            searchPostsWithParams: PropTypes.func.isRequired,
            getMorePostsForSearch: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        initialValue: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        postIds: PropTypes.array,
        archivedPostIds: PropTypes.arrayOf(PropTypes.string),
        recent: PropTypes.array.isRequired,
        searchingStatus: PropTypes.string,
        isSearchGettingMore: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
        enableDateSuggestion: PropTypes.bool,
        timezoneOffsetInSeconds: PropTypes.number.isRequired,
        viewArchivedChannels: PropTypes.bool,
    };

    static defaultProps = {
        initialValue: '',
        postIds: [],
        recent: [],
        archivedPostIds: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        this.contentOffsetY = 0;
        this.state = {
            channelName: '',
            cursorPosition: 0,
            value: props.initialValue,
            managedConfig: {},
        };
    }

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('change', this.setManagedConfig);
    }

    componentDidMount() {
        this.setManagedConfig();

        if (this.props.initialValue) {
            this.search(this.props.initialValue);
        }

        setTimeout(() => {
            if (this.refs.searchBar) {
                this.refs.searchBar.focus();
            }
        }, 150);
    }

    componentDidUpdate(prevProps) {
        const {searchingStatus: status, recent, enableDateSuggestion} = this.props;
        const {searchingStatus: prevStatus} = prevProps;
        const shouldScroll = prevStatus !== status &&
            (status === RequestStatus.SUCCESS || status === RequestStatus.STARTED) &&
            !this.props.isSearchGettingMore && !prevProps.isSearchGettingMore;

        if (this.props.isLandscape !== prevProps.isLandscape) {
            this.refs.searchBar.blur();
        }

        if (shouldScroll) {
            setTimeout(() => {
                const recentLabelsHeight = (recent.length + (Platform.OS === 'ios' ? 1 : 0)) * RECENT_LABEL_HEIGHT;
                const recentSeparatorsHeight = (recent.length + (Platform.OS === 'ios' ? 0 : 2)) * RECENT_SEPARATOR_HEIGHT;
                const modifiersCount = enableDateSuggestion ? 5 : 2;
                if (this.refs.list) {
                    this.refs.list._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                        animated: true,
                        offset: SECTION_HEIGHT + (modifiersCount * MODIFIER_LABEL_HEIGHT) +
                            recentLabelsHeight + recentSeparatorsHeight,
                    });
                }
            }, 100);
        }
    }

    componentWillUnmount() {
        mattermostManaged.removeEventListener(this.listenerId);
    }

    archivedIndicator = (postID, style) => {
        const channelIsArchived = this.props.archivedPostIds.includes(postID);
        let archivedIndicator = null;
        if (channelIsArchived) {
            archivedIndicator = (
                <View style={style.archivedIndicator}>
                    <Text>
                        <AwesomeIcon
                            name='archive'
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
        return archivedIndicator;
    };

    cancelSearch = preventDoubleTap(() => {
        const {navigator} = this.props;
        this.handleTextChanged('', true);
        navigator.dismissModal({animationType: 'slide-down'});
    });

    goToThread = (post) => {
        const {actions, navigator, theme} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);

        Keyboard.dismiss();
        actions.loadThreadIfNecessary(rootId, channelId);
        actions.selectPost(rootId);

        const options = {
            screen: 'Thread',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                channelId,
                rootId,
            },
        };

        navigator.push(options);
    };

    handleHashtagPress = (hashtag) => {
        if (this.showingPermalink) {
            this.props.navigator.dismissModal();
            this.handleClosePermalink();
        }

        const terms = '#' + hashtag;

        this.handleTextChanged(terms);
        this.search(terms, false);

        Keyboard.dismiss();
    };

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handleLayout = (event) => {
        const {height} = event.nativeEvent.layout;
        this.setState({searchListHeight: height});
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.loadChannelsByTeamName(teamName);
        this.showPermalinkView(postId, true);
    };

    handleScroll = (event) => {
        const pageOffsetY = event.nativeEvent.contentOffset.y;
        if (pageOffsetY > 0) {
            const contentHeight = event.nativeEvent.contentSize.height;
            const direction = (this.contentOffsetY < pageOffsetY) ?
                ListTypes.VISIBILITY_SCROLL_UP :
                ListTypes.VISIBILITY_SCROLL_DOWN;

            this.contentOffsetY = pageOffsetY;
            if (
                direction === ListTypes.VISIBILITY_SCROLL_UP &&
                (contentHeight - pageOffsetY) < (this.state.searchListHeight * SCROLL_UP_MULTIPLIER)
            ) {
                this.getMoreSearchResults();
            }
        }
    };

    handleSelectionChange = (event) => {
        const cursorPosition = event.nativeEvent.selection.end;
        this.setState({
            cursorPosition,
        });
    };

    handleSearchButtonPress = preventDoubleTap((text) => {
        this.search(text);
    });

    handleTextChanged = (value, selectionChanged) => {
        const {actions, searchingStatus, isSearchGettingMore} = this.props;
        this.setState({value});
        actions.handleSearchDraftChanged(value);

        if (!value && searchingStatus === RequestStatus.SUCCESS && !isSearchGettingMore) {
            actions.clearSearch();
            this.scrollToTop();
        }

        // FIXME: Workaround for iOS when setting the value directly
        // in the inputText, bug in RN 0.48
        if (Platform.OS === 'ios' && selectionChanged) {
            this.handleSelectionChange({
                nativeEvent: {
                    selection: {
                        end: value.length,
                    },
                },
            });
        }
    };

    keyModifierExtractor = (item) => {
        return `modifier-${item.value}`;
    };

    keyRecentExtractor = (item) => {
        return `recent-${item.terms}`;
    };

    keyPostExtractor = (item) => {
        return item.id || item;
    };

    getMoreSearchResults = debounce(() => {
        if (this.state.value && this.props.postIds.length) {
            this.props.actions.getMorePostsForSearch();
        }
    }, 100);

    onNavigatorEvent = (event) => {
        if (event.id === 'backPress') {
            if (this.state.preview) {
                this.refs.preview.getWrappedInstance().handleClose();
            } else {
                this.props.navigator.dismissModal();
            }
        }
    };

    previewPost = (post) => {
        Keyboard.dismiss();

        this.showPermalinkView(post.id, false);
    };

    removeSearchTerms = preventDoubleTap((item) => {
        const {actions, currentTeamId} = this.props;
        actions.removeSearchTerms(currentTeamId, item.terms);
    });

    renderFooter = () => {
        if (this.props.isSearchGettingMore) {
            const style = getStyleFromTheme(this.props.theme);
            return (
                <View style={style.loadingMore}>
                    <Loading/>
                </View>
            );
        }

        return null;
    };

    renderModifiers = ({item}) => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <TouchableHighlight
                key={item.modifier}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={() => this.setModifierValue(item.value)}
            >
                <View style={style.modifierItemContainer}>
                    <View style={style.modifierItemWrapper}>
                        <View style={style.modifierItemLabelContainer}>
                            <View style={style.modifierLabelIconContainer}>
                                <AwesomeIcon
                                    style={style.modifierLabelIcon}
                                    name='plus-square-o'
                                />
                            </View>
                            <Text
                                style={style.modifierItemLabel}
                            >
                                {item.modifier}
                            </Text>
                        </View>
                        <Text style={style.modifierItemDescription}>
                            {item.description}
                        </Text>
                    </View>
                </View>
            </TouchableHighlight>
        );
    };

    renderPost = ({item, index}) => {
        const {postIds, theme} = this.props;
        const {managedConfig} = this.state;
        const style = getStyleFromTheme(theme);

        if (item.id) {
            return (
                <View style={style.customItem}>
                    {item.component}
                </View>
            );
        }

        if (isDateLine(item)) {
            return (
                <DateHeader
                    dateLineString={item}
                    index={index}
                />
            );
        }

        let separator;
        const nextPost = postIds[index + 1];
        if (nextPost && !isDateLine(nextPost)) {
            separator = <PostSeparator theme={theme}/>;
        }

        return (
            <View style={style.postResult}>
                <ChannelDisplayName postId={item}/>
                {this.archivedIndicator(postIds[index], style)}
                <SearchResultPost
                    postId={item}
                    previewPost={this.previewPost}
                    goToThread={this.goToThread}
                    navigator={this.props.navigator}
                    onHashtagPress={this.handleHashtagPress}
                    onPermalinkPress={this.handlePermalinkPress}
                    managedConfig={managedConfig}
                    skipPinnedHeader={true}
                />
                {separator}
            </View>
        );
    };

    renderRecentSeparator = () => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.separatorContainer}>
                <View style={style.separator}/>
            </View>
        );
    };

    renderSectionHeader = ({section}) => {
        const {theme} = this.props;
        const {title} = section;
        const style = getStyleFromTheme(theme);

        if (title) {
            return (
                <View style={style.sectionWrapper}>
                    <View style={style.sectionContainer}>
                        <Text style={style.sectionLabel}>
                            {title}
                        </Text>
                    </View>
                </View>
            );
        }

        return <View/>;
    };

    renderRecentItem = ({item}) => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <TouchableHighlight
                key={item.terms}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={() => this.setRecentValue(item)}
            >
                <View
                    style={style.recentItemContainer}
                >
                    <Text
                        style={style.recentItemLabel}
                    >
                        {item.terms}
                    </Text>
                    <TouchableOpacity
                        onPress={() => this.removeSearchTerms(item)}
                        style={style.recentRemove}
                    >
                        <IonIcon
                            name='ios-close-circle-outline'
                            size={20}
                            color={changeOpacity(theme.centerChannelColor, 0.6)}
                        />
                    </TouchableOpacity>
                </View>
            </TouchableHighlight>
        );
    };

    retry = () => {
        this.search(this.state.value.trim());
    };

    setManagedConfig = async (config) => {
        let nextConfig = config;
        if (!nextConfig) {
            nextConfig = await mattermostManaged.getLocalConfig();
        }

        this.setState({
            managedConfig: nextConfig,
        });
    };

    showPermalinkView = (postId, isPermalink) => {
        const {actions, navigator} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const options = {
                screen: 'Permalink',
                animationType: 'none',
                backButtonTitle: '',
                overrideBackPress: true,
                navigatorStyle: {
                    navBarHidden: true,
                    screenBackgroundColor: changeOpacity('#000', 0.2),
                    modalPresentationStyle: 'overCurrentContext',
                },
                passProps: {
                    isPermalink,
                    onClose: this.handleClosePermalink,
                },
            };

            this.showingPermalink = true;
            navigator.showModal(options);
        }
    };

    scrollToTop = () => {
        if (this.refs.list) {
            this.refs.list._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                animated: false,
                offset: 0,
            });
        }
    };

    search = (terms, isOrSearch) => {
        const {actions, currentTeamId, viewArchivedChannels} = this.props;

        this.handleTextChanged(`${terms.trim()} `);

        // Trigger onSelectionChanged Manually when submitting
        this.handleSelectionChange({
            nativeEvent: {
                selection: {
                    end: terms.length + 1,
                },
            },
        });

        // timezone offset in seconds
        const params = {
            terms: terms.trim(),
            is_or_search: isOrSearch,
            time_zone_offset: this.props.timezoneOffsetInSeconds,
            page: 0,
            per_page: 20,
            include_deleted_channels: viewArchivedChannels,
        };
        actions.searchPostsWithParams(currentTeamId, params, true);
    };

    setModifierValue = preventDoubleTap((modifier) => {
        const {value} = this.state;
        let newValue = '';

        if (!value) {
            newValue = modifier;
        } else if (value.endsWith(' ')) {
            newValue = `${value}${modifier}`;
        } else {
            newValue = `${value} ${modifier}`;
        }

        this.handleTextChanged(newValue, true);

        if (this.refs.searchBar) {
            this.refs.searchBar.focus();
        }
    });

    setRecentValue = preventDoubleTap((recent) => {
        const {terms, isOrSearch} = recent;
        this.handleTextChanged(terms);
        this.search(terms, isOrSearch);
        Keyboard.dismiss();
    });

    render() {
        const {
            isLandscape,
            postIds,
            recent,
            searchingStatus,
            theme,
            isSearchGettingMore,
        } = this.props;

        const {intl} = this.context;
        const {
            cursorPosition,
            value,
        } = this.state;
        const style = getStyleFromTheme(theme);

        const sectionsData = [{
            value: 'from:',
            modifier: `from:${intl.formatMessage({id: 'mobile.search.from_modifier_title', defaultMessage: 'username'})}`,
            description: intl.formatMessage({
                id: 'mobile.search.from_modifier_description',
                defaultMessage: 'to find posts from specific users',
            }),
        }, {
            value: 'in:',
            modifier: `in:${intl.formatMessage({id: 'mobile.search.in_modifier_title', defaultMessage: 'channel-name'})}`,
            description: intl.formatMessage({
                id: 'mobile.search.in_modifier_description',
                defaultMessage: 'to find posts in specific channels',
            }),
        }];

        // if search by date filters supported
        if (this.props.enableDateSuggestion) {
            sectionsData.push({
                value: 'on:',
                modifier: 'on: YYYY-MM-DD',
                description: intl.formatMessage({
                    id: 'mobile.search.on_modifier_description',
                    defaultMessage: 'to find posts on a specific date',
                }),
            });
            sectionsData.push({
                value: 'after:',
                modifier: 'after: YYYY-MM-DD',
                description: intl.formatMessage({
                    id: 'mobile.search.after_modifier_description',
                    defaultMessage: 'to find posts after a specific date',
                }),
            });
            sectionsData.push({
                value: 'before:',
                modifier: 'before: YYYY-MM-DD',
                description: intl.formatMessage({
                    id: 'mobile.search.before_modifier_description',
                    defaultMessage: 'to find posts before a specific date',
                }),
            });
        }

        const sections = [{
            data: sectionsData,
            key: 'modifiers',
            title: '',
            renderItem: this.renderModifiers,
            keyExtractor: this.keyModifierExtractor,
            ItemSeparatorComponent: this.renderRecentSeparator,
        }];

        if (recent.length) {
            sections.push({
                data: recent,
                key: 'recent',
                title: intl.formatMessage({id: 'mobile.search.recent_title', defaultMessage: 'Recent Searches'}),
                renderItem: this.renderRecentItem,
                keyExtractor: this.keyRecentExtractor,
                ItemSeparatorComponent: this.renderRecentSeparator,
            });
        }

        let results;
        switch (searchingStatus) {
        case RequestStatus.STARTED:
            if (isSearchGettingMore) {
                results = postIds;
            } else {
                results = [{
                    id: SEARCHING,
                    component: (
                        <View style={style.searching}>
                            <Loading/>
                        </View>
                    ),
                }];
            }
            break;
        case RequestStatus.SUCCESS:
            if (postIds.length) {
                results = postIds;
            } else if (this.state.value) {
                results = [{
                    id: NO_RESULTS,
                    component: (
                        <FormattedText
                            id='mobile.search.no_results'
                            defaultMessage='No Results Found'
                            style={style.noResults}
                        />
                    ),
                }];
            }
            break;
        case RequestStatus.FAILURE:
            if (postIds.length) {
                results = postIds;
            } else {
                results = [{
                    id: RequestStatus.FAILURE,
                    component: (
                        <View style={style.searching}>
                            <PostListRetry
                                retry={this.retry}
                                theme={theme}
                            />
                        </View>
                    ),
                }];
            }
            break;
        }

        if (results) {
            sections.push({
                data: results,
                key: 'results',
                title: intl.formatMessage({id: 'search_header.results', defaultMessage: 'Search Results'}),
                renderItem: this.renderPost,
                keyExtractor: this.keyPostExtractor,
            });
        }

        const searchBarInput = {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
            color: theme.sidebarHeaderTextColor,
            fontSize: 15,
        };

        return (
            <SafeAreaView
                excludeHeader={isLandscape && DeviceTypes.IS_IPHONE_X}
                forceTop={44}
            >
                <KeyboardLayout>
                    <StatusBar/>
                    <View style={style.header}>
                        <SearchBar
                            ref='searchBar'
                            placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                            cancelTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                            backgroundColor='transparent'
                            inputHeight={Platform.OS === 'ios' ? 33 : 46}
                            inputStyle={searchBarInput}
                            placeholderTextColor={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                            selectionColor={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                            tintColorSearch={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                            tintColorDelete={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                            titleCancelColor={theme.sidebarHeaderTextColor}
                            onChangeText={this.handleTextChanged}
                            onSearchButtonPress={this.handleSearchButtonPress}
                            onCancelButtonPress={this.cancelSearch}
                            onSelectionChange={this.handleSelectionChange}
                            autoCapitalize='none'
                            value={value}
                            containerStyle={style.searchBarContainer}
                            backArrowSize={28}
                        />
                    </View>
                    <SectionList
                        ref='list'
                        style={style.sectionList}
                        renderSectionHeader={this.renderSectionHeader}
                        sections={sections}
                        keyboardShouldPersistTaps='always'
                        keyboardDismissMode='interactive'
                        stickySectionHeadersEnabled={Platform.OS === 'ios'}
                        onLayout={this.handleLayout}
                        onScroll={this.handleScroll}
                        scrollEventThrottle={60}
                        ListFooterComponent={this.renderFooter}
                    />
                    <Autocomplete
                        cursorPosition={cursorPosition}
                        onChangeText={this.handleTextChanged}
                        isSearch={true}
                        value={value}
                        enableDateSuggestion={this.props.enableDateSuggestion}
                    />
                </KeyboardLayout>
            </SafeAreaView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            width: '100%',
            ...Platform.select({
                android: {
                    height: 46,
                    justifyContent: 'center',
                },
                ios: {
                    height: 44,
                },
            }),
        },
        searchBarContainer: {
            padding: 0,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        sectionContainer: {
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 16,
            height: SECTION_HEIGHT,
        },
        sectionLabel: {
            color: theme.centerChannelColor,
            fontSize: 12,
            fontWeight: '600',
        },
        modifierItemContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: MODIFIER_LABEL_HEIGHT,
        },
        modifierItemWrapper: {
            flex: 1,
            flexDirection: 'column',
            paddingHorizontal: 16,
        },
        modifierItemLabelContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        modifierLabelIconContainer: {
            alignItems: 'center',
            marginRight: 5,
        },
        modifierLabelIcon: {
            fontSize: 16,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        modifierItemLabel: {
            fontSize: 14,
            color: theme.centerChannelColor,
        },
        modifierItemDescription: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginTop: 5,
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

