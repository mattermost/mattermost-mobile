// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    Platform,
    SectionList,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';

import Autocomplete from 'app/components/autocomplete';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const SEARCH = 'search';

class Search extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired,
            removeSearchTerms: PropTypes.func.isRequired,
            searchPosts: PropTypes.func.isRequired
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        recent: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        recent: {}
    };

    state = {
        value: ''
    };

    componentDidMount() {
        this.refs.search_bar.focus();
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

    renderSeparatorComponent = () => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);
        return <View style={style.recentSeparator}/>;
    };

    renderSectionHeader = ({section}) => {
        const {theme} = this.props;
        const {title} = section;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.sectionContainer}>
                <Text style={style.sectionLabel}>
                    {title}
                </Text>
            </View>
        );
    };

    renderRecentItem = ({item}) => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <TouchableHighlight
                key={item.tems}
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
    };

    render() {
        const {
            intl,
            recent,
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
                ItemSeparatorComponent: this.renderSeparatorComponent
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
                    style={{flex: 1}}
                    renderSectionHeader={this.renderSectionHeader}
                    sections={sections}
                    keyboardShouldPersistTaps='always'
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
        sectionContainer: {
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 16,
            height: 20
        },
        sectionLabel: {
            color: theme.centerChannelColor,
            fontSize: 12,
            fontWeight: '600'
        },
        recentItemContainer: {
            flex: 1,
            height: 42,
            justifyContent: 'center',
            paddingHorizontal: 16
        },
        recentItemLabel: {
            color: theme.centerChannelColor,
            fontSize: 14
        },
        recentSeparator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: StyleSheet.hairlineWidth
        },
        postList: {
            flex: 1,
            ...Platform.select({
                android: {
                    marginTop: 46
                },
                ios: {
                    marginTop: 64
                }
            })
        }
    });
});

export default injectIntl(Search);
