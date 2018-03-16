// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
import DeviceInfo from 'react-native-device-info';
import IonIcon from 'react-native-vector-icons/Ionicons';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {RequestStatus} from 'mattermost-redux/constants';

import Autocomplete from 'app/components/autocomplete';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import PostListRetry from 'app/components/post_list_retry';
import SafeAreaView from 'app/components/safe_area_view';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import mattermostManaged from 'app/mattermost_managed';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDisplayName from './channel_display_name';
import SearchResultPost from './search_result_post';

const SECTION_HEIGHT = 20;
const RECENT_LABEL_HEIGHT = 42;
const RECENT_SEPARATOR_HEIGHT = 3;
const MODIFIER_LABEL_HEIGHT = 58;
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
            searchPosts: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        postIds: PropTypes.array,
        recent: PropTypes.array.isRequired,
        searchingStatus: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        postIds: [],
        recent: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        this.isX = DeviceInfo.getModel() === 'iPhone X';
        this.state = {
            channelName: '',
            value: '',
            managedConfig: {},
        };
    }

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('change', this.setManagedConfig);
    }

    componentDidMount() {
        this.setManagedConfig();
        if (this.refs.searchBar) {
            setTimeout(() => {
                this.refs.searchBar.focus();
            }, 150);
        }
    }

    componentDidUpdate(prevProps) {
        const {searchingStatus: status, recent} = this.props;
        const {searchingStatus: prevStatus} = prevProps;
        const recentLength = recent.length;
        const shouldScroll = prevStatus !== status && (status === RequestStatus.SUCCESS || status === RequestStatus.STARTED);

        if (this.props.isLandscape !== prevProps.isLandscape) {
            this.refs.searchBar.blur();
        }

        if (shouldScroll) {
            requestAnimationFrame(() => {
                this.refs.list._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                    animated: true,
                    offset: SECTION_HEIGHT + (2 * MODIFIER_LABEL_HEIGHT) + (recentLength * RECENT_LABEL_HEIGHT) + ((recentLength + 1) * RECENT_SEPARATOR_HEIGHT),
                });
            });
        }
    }

    componentWillUnmount() {
        mattermostManaged.removeEventListener(this.listenerId);
    }

    attachAutocomplete = (c) => {
        this.autocomplete = c;
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

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.loadChannelsByTeamName(teamName);
        this.showPermalinkView(postId, true);
    };

    handleSelectionChange = (event) => {
        if (this.autocomplete) {
            this.autocomplete.getWrappedInstance().handleSelectionChange(event);
        }
    };

    handleTextChanged = (value, selectionChanged) => {
        const {actions, searchingStatus} = this.props;
        this.setState({value});
        actions.handleSearchDraftChanged(value);

        if (!value && searchingStatus === RequestStatus.SUCCESS) {
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
                    onPermalinkPress: this.handlePermalinkPress,
                },
            };

            this.showingPermalink = true;
            navigator.showModal(options);
        }
    };

    removeSearchTerms = preventDoubleTap((item) => {
        const {actions, currentTeamId} = this.props;
        actions.removeSearchTerms(currentTeamId, item.terms);
    });

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

        let separator;
        if (index === postIds.length - 1) {
            separator = this.renderPostSeparator();
        }

        return (
            <View>
                <ChannelDisplayName postId={item}/>
                <SearchResultPost
                    postId={item}
                    previewPost={this.previewPost}
                    goToThread={this.goToThread}
                    navigator={this.props.navigator}
                    onPermalinkPress={this.handlePermalinkPress}
                    managedConfig={managedConfig}
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

    renderPostSeparator = () => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={[style.separatorContainer, style.postsSeparator]}>
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

    scrollToTop = () => {
        if (this.refs.list) {
            this.refs.list._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                animated: false,
                offset: 0,
            });
        }
    };

    search = (terms, isOrSearch) => {
        const {actions, currentTeamId} = this.props;

        this.handleTextChanged(`${terms.trim()} `);

        // Trigger onSelectionChanged Manually when submitting
        this.handleSelectionChange({
            nativeEvent: {
                selection: {
                    end: terms.length + 1,
                },
            },
        });

        actions.searchPosts(currentTeamId, terms.trim(), isOrSearch);
    };

    handleSearchButtonPress = preventDoubleTap((text) => {
        this.search(text);
    });

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
        } = this.props;

        const {intl} = this.context;
        const {value} = this.state;
        const style = getStyleFromTheme(theme);
        const sections = [{
            data: [{
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
            }],
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
            results = [{
                id: SEARCHING,
                component: (
                    <View style={style.searching}>
                        <Loading/>
                    </View>
                ),
            }];
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
            break;
        }

        if (results) {
            sections.push({
                data: results,
                key: 'results',
                title: intl.formatMessage({id: 'search_header.results', defaultMessage: 'Search Results'}),
                renderItem: this.renderPost,
                keyExtractor: this.keyPostExtractor,
                ItemSeparatorComponent: this.renderPostSeparator,
            });
        }

        const searchBarInput = {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
            color: theme.sidebarHeaderTextColor,
            fontSize: 15,
        };

        return (
            <SafeAreaView
                excludeHeader={isLandscape && this.isX}
                forceTop={44}
            >
                <View style={style.container}>
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
                    />
                    <Autocomplete
                        ref={this.attachAutocomplete}
                        onChangeText={this.handleTextChanged}
                        isSearch={true}
                        value={value}
                    />
                </View>
            </SafeAreaView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
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
    };
});

