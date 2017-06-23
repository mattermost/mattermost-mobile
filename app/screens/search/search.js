// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import Autocomplete from 'app/components/autocomplete';
import Post from 'app/components/post';
import SectionList from 'app/components/scrollable_section_list';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const SEARCH = 'search';
const SECTION_HEIGHT = 20;
const RECENT_LABEL_HEIGHT = 42;
const RECENT_SEPARATOR_HEIGHT = 3;

class Search extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired,
            removeSearchTerms: PropTypes.func.isRequired,
            searchPosts: PropTypes.func.isRequired
        }).isRequired,
        channels: PropTypes.array.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        recent: PropTypes.object,
        posts: PropTypes.array,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        recent: {},
        posts: []
    };

    state = {
        isFocused: true,
        value: ''
    };

    componentDidMount() {
        this.refs.search_bar.focus();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            this.props.recent !== nextProps.recent ||
            this.props.posts !== nextProps.posts ||
            this.state !== nextState
        );
    }

    componentDidUpdate() {
        const {posts, recent} = this.props;
        const recentLenght = Object.keys(recent).length;

        if (posts.length && !this.state.isFocused) {
            this.refs.list.getWrapperRef().getListRef().scrollToOffset({
                animated: true,
                offset: SECTION_HEIGHT + (recentLenght * RECENT_LABEL_HEIGHT) + ((recentLenght - 1) * RECENT_SEPARATOR_HEIGHT)
            });
        }
    }

    attachAutocomplete = (c) => {
        this.autocomplete = c;
    };

    cancelSearch = () => {
        const {actions, navigator} = this.props;
        actions.clearSearch();
        this.handleTextChanged('');
        navigator.dismissModal({animationType: 'slide-down'});
    };

    handleSelectionChange = (event) => {
        if (this.autocomplete) {
            this.autocomplete.handleSelectionChange(event);
        }
    };

    handleTextChanged = (value) => {
        this.setState({value});
        this.props.actions.handlePostDraftChanged(SEARCH, value);
    };

    keyRecentExtractor = (item) => {
        return `recent-${item.terms}`;
    };

    keyPostExtractor = (item) => {
        return `result-${item.id}`;
    };

    onBlur = () => {
        this.setState({isFocused: false});
    };

    onFocus = () => {
        const {posts} = this.props;
        this.setState({isFocused: true});
        if (posts.length) {
            this.refs.list.getWrapperRef().getListRef().scrollToOffset({
                animated: true,
                offset: 0
            });
        }
    };

    removeSearchTerms = (item) => {
        const {actions, currentTeamId} = this.props;
        actions.removeSearchTerms(currentTeamId, item.terms);
    };

    renderPost = ({item}) => {
        const {channels, theme} = this.props;
        const style = getStyleFromTheme(theme);

        const channel = channels.find((c) => c.id === item.channel_id);
        let displayName = '';

        if (channel) {
            displayName = channel.display_name;
        }

        return (
            <View>
                <Text style={style.channelName}>
                    {displayName}
                </Text>
                <Post
                    post={item}
                    renderReplies={false}
                    isFirstReply={false}
                    isLastReply={false}
                    commentedOnPost={null}
                    onPress={() => true}
                    isSearchResult={true}
                    navigator={this.props.navigator}
                />
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

        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionLabel}>
                        {title}
                    </Text>
                </View>
            </View>
        );
    };

    renderRecentItem = ({item}) => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <TouchableHighlight
                key={item.terms}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={() => preventDoubleTap(this.setRecentValue, this, item)}
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
                        onPress={() => preventDoubleTap(this.removeSearchTerms, this, item)}
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

    search = (terms, isOrSearch) => {
        const {actions, currentTeamId} = this.props;
        actions.searchPosts(currentTeamId, terms, isOrSearch);
    };

    setRecentValue = (recent) => {
        const {terms, isOrSearch} = recent;
        this.handleTextChanged(terms);
        this.search(terms, isOrSearch);
        this.refs.search_bar.blur();
    };

    render() {
        const {
            intl,
            recent,
            posts,
            theme
        } = this.props;

        const {value} = this.state;
        const recentKeys = Object.keys(recent);
        const style = getStyleFromTheme(theme);
        const sections = [];

        if (recentKeys.length) {
            const recentArray = recentKeys.map((key) => {
                return {
                    terms: key,
                    isOrSearch: recent[key]
                };
            });

            sections.push({
                data: recentArray,
                key: 'recent',
                title: intl.formatMessage({id: 'mobile.search.recentTitle', defaultMessage: 'Recent Searches'}),
                renderItem: this.renderRecentItem,
                keyExtractor: this.keyRecentExtractor,
                ItemSeparatorComponent: this.renderRecentSeparator
            });
        }

        if (posts.length) {
            sections.push({
                data: posts,
                key: 'results',
                title: intl.formatMessage({id: 'search_header.results', defaultMessage: 'Search Results'}),
                renderItem: this.renderPost,
                keyExtractor: this.keyPostExtractor,
                ItemSeparatorComponent: this.renderPostSeparator
            });
        }

        return (
            <View style={{flex: 1}}>
                <StatusBar/>
                <View style={style.header}>
                    <SearchBar
                        ref='search_bar'
                        placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                        cancelTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        backgroundColor='transparent'
                        inputHeight={Platform.OS === 'ios' ? 33 : 46}
                        inputStyle={{
                            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
                            color: theme.sidebarHeaderTextColor,
                            ...Platform.select({
                                android: {
                                    fontSize: 15
                                },
                                ios: {
                                    fontSize: 13
                                }
                            })
                        }}
                        placeholderTextColor={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                        tintColorSearch={changeOpacity(theme.sidebarHeaderTextColor, 0.8)}
                        tintColorDelete={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                        titleCancelColor={theme.sidebarHeaderTextColor}
                        onChangeText={this.handleTextChanged}
                        onBlur={this.onBlur}
                        onFocus={this.onFocus}
                        onSearchButtonPress={(text) => preventDoubleTap(this.search, this, text)}
                        onCancelButtonPress={() => preventDoubleTap(this.cancelSearch, this)}
                        onSelectionChange={this.handleSelectionChange}
                        autoCapitalize='none'
                        value={value}
                        containerStyle={{padding: 0}}
                        backArrowSize={28}
                    />
                </View>
                <Autocomplete
                    ref={this.attachAutocomplete}
                    onChangeText={this.handleTextChanged}
                    rootId={SEARCH}
                    isSearch={true}
                />
                <SectionList
                    ref='list'
                    style={style.sectionList}
                    renderSectionHeader={this.renderSectionHeader}
                    sections={sections}
                    keyboardShouldPersistTaps='handled'
                    stickySectionHeadersEnabled={true}
                />
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            width: Dimensions.get('window').width,
            ...Platform.select({
                android: {
                    height: 46,
                    justifyContent: 'center'
                },
                ios: {
                    height: 64,
                    paddingTop: 20
                }
            })
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg
        },
        sectionContainer: {
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 16,
            height: SECTION_HEIGHT
        },
        sectionLabel: {
            color: theme.centerChannelColor,
            fontSize: 12,
            fontWeight: '600'
        },
        recentItemContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: RECENT_LABEL_HEIGHT
        },
        recentItemLabel: {
            color: theme.centerChannelColor,
            fontSize: 14,
            height: 20,
            flex: 1,
            paddingHorizontal: 16
        },
        recentRemove: {
            alignItems: 'center',
            height: RECENT_LABEL_HEIGHT,
            justifyContent: 'center',
            width: 50
        },
        separatorContainer: {
            justifyContent: 'center',
            flex: 1,
            height: RECENT_SEPARATOR_HEIGHT
        },
        postsSeparator: {
            height: 15
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: StyleSheet.hairlineWidth
        },
        channelName: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 14,
            fontWeight: '600',
            marginTop: 5,
            paddingHorizontal: 16
        },
        sectionList: {
            flex: 1,
            zIndex: -1
        }
    });
});

export default injectIntl(Search);
