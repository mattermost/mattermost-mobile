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
    View,
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';
import {Navigation} from 'react-native-navigation';

import {debounce} from 'mattermost-redux/actions/helpers';
import {RequestStatus} from 'mattermost-redux/constants';
import {isDateLine, getDateForDateLine} from 'mattermost-redux/utils/post_list';

import Autocomplete from 'app/components/autocomplete';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import DateHeader from 'app/components/post_list/date_header';
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
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

import ChannelDisplayName from './channel_display_name';
import Modifier, {MODIFIER_LABEL_HEIGHT} from './modifier';
import RecentItem, {RECENT_LABEL_HEIGHT} from './recent_item';
import SearchResultPost from './search_result_post';

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;
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
            dismissModal: PropTypes.func.isRequired,
            goToScreen: PropTypes.func.isRequired,
            showModalOverCurrentContext: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        initialValue: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
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

        this.contentOffsetY = 0;
        this.state = {
            channelName: '',
            cursorPosition: 0,
            value: props.initialValue,
            recent: props.recent,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);

        if (this.props.initialValue) {
            this.search(this.props.initialValue);
        }

        setTimeout(() => {
            if (this.refs.searchBar) {
                this.refs.searchBar.focus();
            }
        }, 150);
    }

    componentDidUpdate(prevProps, prevState) {
        const {searchingStatus: status, enableDateSuggestion} = this.props;
        const {recent} = this.state;
        const {searchingStatus: prevStatus} = prevProps;
        const shouldScroll = prevStatus !== status &&
            (status === RequestStatus.SUCCESS || status === RequestStatus.FAILURE) &&
            !this.props.isSearchGettingMore && !prevProps.isSearchGettingMore && prevState.recent.length === recent.length;

        if (this.props.isLandscape !== prevProps.isLandscape) {
            this.refs.searchBar.blur();
        }

        if (shouldScroll) {
            setTimeout(() => {
                const recentLabelsHeight = recent.length * RECENT_LABEL_HEIGHT;
                const recentSeparatorsHeight = (recent.length - 1) * RECENT_SEPARATOR_HEIGHT;
                const modifiersCount = enableDateSuggestion ? 5 : 2;
                const modifiersHeight = modifiersCount * MODIFIER_LABEL_HEIGHT;
                const modifiersSeparatorHeight = (modifiersCount - 1) * RECENT_SEPARATOR_HEIGHT;
                const offset = modifiersHeight + modifiersSeparatorHeight + SECTION_HEIGHT + recentLabelsHeight + recentSeparatorsHeight;

                Keyboard.dismiss();
                if (this.refs.list) {
                    this.refs.list._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                        animated: true,
                        offset,
                    });
                }
            }, 250);
        }
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'backPress') {
            if (this.state.preview) {
                this.refs.preview.handleClose();
            } else {
                this.props.actions.dismissModal();
            }
        }
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
        this.handleTextChanged('', true);
        this.props.actions.dismissModal();
    });

    goToThread = (post) => {
        const {actions} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);

        Keyboard.dismiss();
        actions.loadThreadIfNecessary(rootId);
        actions.selectPost(rootId);

        const screen = 'Thread';
        const title = '';
        const passProps = {
            channelId,
            rootId,
        };

        actions.goToScreen(screen, title, passProps);
    };

    handleHashtagPress = (hashtag) => {
        if (this.showingPermalink) {
            this.props.actions.dismissModal();
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

    previewPost = (post) => {
        Keyboard.dismiss();

        this.showPermalinkView(post.id, false);
    };

    removeSearchTerms = preventDoubleTap((item) => {
        const {actions, currentTeamId} = this.props;
        const recent = [...this.state.recent];
        const index = recent.indexOf(item);

        if (index !== -1) {
            recent.splice(index, 1);
            this.setState({recent});
        }

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
        const {theme, isLandscape} = this.props;

        return (
            <Modifier
                item={item}
                setModifierValue={this.setModifierValue}
                theme={theme}
                isLandscape={isLandscape}
            />
        );
    };

    renderPost = ({item, index}) => {
        const {postIds, theme, isLandscape} = this.props;
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
                    date={getDateForDateLine(item)}
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
            <View style={[style.postResult, padding(isLandscape)]}>
                <ChannelDisplayName postId={item}/>
                {this.archivedIndicator(postIds[index], style)}
                <SearchResultPost
                    postId={item}
                    previewPost={this.previewPost}
                    goToThread={this.goToThread}
                    onHashtagPress={this.handleHashtagPress}
                    onPermalinkPress={this.handlePermalinkPress}
                    managedConfig={mattermostManaged.getCachedConfig()}
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
        const {theme, isLandscape} = this.props;
        const {title} = section;
        const style = getStyleFromTheme(theme);

        if (title) {
            return (
                <View style={style.sectionWrapper}>
                    <View style={style.sectionContainer}>
                        <Text style={[style.sectionLabel, padding(isLandscape, -16)]}>
                            {title}
                        </Text>
                    </View>
                </View>
            );
        }

        return <View/>;
    };

    renderRecentItem = ({item}) => {
        const {theme, isLandscape} = this.props;

        return (
            <RecentItem
                item={item}
                removeSearchTerms={this.removeSearchTerms}
                setRecentValue={this.setRecentValue}
                theme={theme}
                isLandscape={isLandscape}
            />
        );
    };

    retry = () => {
        this.search(this.state.value.trim());
    };

    showPermalinkView = (postId, isPermalink) => {
        const {actions} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const screen = 'Permalink';
            const passProps = {
                isPermalink,
                onClose: this.handleClosePermalink,
            };
            const options = {
                layout: {
                    backgroundColor: changeOpacity('#000', 0.2),
                },
            };

            this.showingPermalink = true;
            actions.showModalOverCurrentContext(screen, passProps, options);
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

    search = (text, isOrSearch) => {
        const {actions, currentTeamId, viewArchivedChannels} = this.props;
        const recent = [...this.state.recent];
        const terms = text.trim();

        this.handleTextChanged(`${terms} `);

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
            terms,
            is_or_search: isOrSearch,
            time_zone_offset: this.props.timezoneOffsetInSeconds,
            page: 0,
            per_page: 20,
            include_deleted_channels: viewArchivedChannels,
        };
        actions.searchPostsWithParams(currentTeamId, params, true);
        if (!recent.find((r) => r.terms === terms)) {
            recent.push({
                terms,
            });
            this.setState({recent});
        }
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
            searchingStatus,
            theme,
            isSearchGettingMore,
        } = this.props;

        const {intl} = this.context;
        const {
            cursorPosition,
            recent,
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
                    <View style={[style.header, padding(isLandscape)]}>
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
                            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
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

