// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {NavigationActions} from 'react-navigation';
import {
    ActivityIndicator,
    SectionList,
    Text,
    View,
} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';

import SearchBar from 'app/components/search_bar';
import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ExtensionChannelItem from './extension_channel_item';

const defaultTheme = Preferences.THEMES.default;

export default class ExtensionChannel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            searchChannelsTyping: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            makeDirectChannel: PropTypes.func.isRequired,
        }).isRequired,
        restrictDirectMessage: PropTypes.bool.isRequired,
        directChannels: PropTypes.array,
        navigation: PropTypes.object.isRequired,
        privateChannels: PropTypes.array,
        publicChannels: PropTypes.array,
    };

    static defaultProps = {
        directChannels: [],
        privateChannels: [],
        publicChannels: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    static navigationOptions = ({navigation}) => ({
        title: navigation.state.params.title,
    });

    state = {
        sections: null,
        loading: true,
    };

    componentDidMount() {
        this.buildSections();
        this.searchChannels('');
    }

    setSearchBarRef = (ref) => {
        this.searchBarRef = ref;
    }

    buildSections = (term) => {
        const sections = [];
        let {
            directChannels: directFiltered,
            privateChannels: privateFiletered,
            publicChannels: publicFiltered,
        } = this.props;

        directFiltered = directFiltered.filter((c) => c.delete_at === 0);
        privateFiletered = privateFiletered.filter((c) => c.delete_at === 0);
        publicFiltered = publicFiltered.filter((c) => c.delete_at === 0);

        if (term) {
            directFiltered = directFiltered.filter((c) => c.display_name.toLowerCase().includes(term.toLowerCase()));
            privateFiletered = privateFiletered.filter((c) => c.display_name.toLowerCase().includes(term.toLowerCase()));
            publicFiltered = publicFiltered.filter((c) => c.display_name.toLowerCase().includes(term.toLowerCase()));
        }

        if (publicFiltered.length) {
            sections.push({
                id: 'sidebar.channels',
                defaultMessage: 'PUBLIC CHANNELS',
                data: publicFiltered,
            });
        }

        if (privateFiletered.length) {
            sections.push({
                id: 'sidebar.pg',
                defaultMessage: 'PRIVATE CHANNELS',
                data: privateFiletered,
            });
        }

        if (directFiltered.length) {
            sections.push({
                id: 'sidebar.direct',
                defaultMessage: 'DIRECT MESSAGES',
                data: directFiltered,
            });
        }

        this.setState({sections});
    };

    handleSelectChannel = async (channel, notCreatedYet) => {
        const {actions} = this.props;
        const {state} = this.props.navigation;
        const backAction = NavigationActions.back();

        if (state.params && state.params.onSelectChannel) {
            if (notCreatedYet) {
                const newChannel = await actions.makeDirectChannel(channel.otherUserId);
                state.params.onSelectChannel(newChannel.data.id);
            } else {
                state.params.onSelectChannel(channel.id);
            }
        }

        this.props.navigation.dispatch(backAction);
    };

    searchChannels = (term) => {
        const {actions, navigation} = this.props;
        const {params = {}} = navigation.state;
        const {teamId} = params;
        actions.searchChannelsTyping(teamId, term).then(() => {
            this.buildSections(term);
            this.setState({loading: false});
        });
    };

    searchUsers = (term) => {
        if (term) {
            const {actions, navigation, restrictDirectMessage} = this.props;
            const {params = {}} = navigation.state;
            const {teamId} = params;
            const lowerCasedTerm = term.toLowerCase();

            if (restrictDirectMessage) {
                actions.searchProfiles(lowerCasedTerm).then(() => {
                    this.buildSections(term);
                    this.setState({loading: false});
                });
            } else {
                actions.searchProfiles(lowerCasedTerm, {team_id: teamId}).then(() => {
                    this.buildSections(term);
                    this.setState({loading: false});
                });
            }
        } else {
            this.buildSections(term);
            this.setState({loading: false});
        }
    };

    handleSearch = (term) => {
        this.setState({term, loading: true}, async () => {
            if (this.throttleTimeout) {
                clearTimeout(this.throttleTimeout);
            }

            this.throttleTimeout = setTimeout(() => {
                this.searchUsers(term);
            }, 300);
        });
    };

    renderSpinner = () => {
        const {loading} = this.state;
        const styles = getStyleSheet(defaultTheme);

        if (loading) {
            return (
                <View style={styles.loadingSpinner}>
                    <ActivityIndicator/>
                </View>
            );
        }
        return null;
    };

    renderNoResults = () => {
        const style = getStyleSheet(defaultTheme);

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='mobile.custom_list.no_results'
                    defaultMessage='No Results'
                    style={style.noResultText}
                />
            </View>
        );
    };

    keyExtractor = (item) => item.id;

    renderBody = (styles) => {
        const {sections} = this.state;

        return (
            <React.Fragment>
                {this.renderSearchBar(styles)}
                <SectionList
                    style={styles.flex}
                    sections={sections}
                    ItemSeparatorComponent={this.renderItemSeparator}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    ListEmptyComponent={this.renderNoResults}
                    keyExtractor={this.keyExtractor}
                    keyboardShouldPersistTaps='always'
                    keyboardDismissMode='on-drag'
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    stickySectionHeadersEnabled={true}
                    scrollEventThrottle={100}
                    windowSize={5}
                />
                {this.renderSpinner()}
            </React.Fragment>
        );
    };

    renderItem = ({item}) => {
        const {navigation} = this.props;
        const {params = {}} = navigation.state;
        const {currentChannelId} = params;

        return (
            <ExtensionChannelItem
                channel={item}
                currentChannelId={currentChannelId}
                onSelectChannel={this.handleSelectChannel}
                theme={defaultTheme}
            />
        );
    };

    renderItemSeparator = () => {
        const styles = getStyleSheet(defaultTheme);

        return (
            <View style={styles.separator}/>
        );
    };

    renderSearchBar = (styles) => {
        const {formatMessage} = this.context.intl;

        return (
            <View style={styles.searchContainer}>
                <SearchBar
                    ref={this.setSearchBarRef}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    backgroundColor='transparent'
                    inputHeight={43}
                    inputStyle={styles.searchBarInput}
                    placeholderTextColor={changeOpacity(defaultTheme.centerChannelColor, 0.5)}
                    tintColorSearch={changeOpacity(defaultTheme.centerChannelColor, 0.5)}
                    tintColorDelete={changeOpacity(defaultTheme.centerChannelColor, 0.3)}
                    titleCancelColor={defaultTheme.centerChannelColor}
                    onChangeText={this.handleSearch}
                    autoCapitalize='none'
                    value={this.state.term}
                />
            </View>
        );
    };

    renderSectionHeader = ({section}) => {
        const {intl} = this.context;
        const styles = getStyleSheet(defaultTheme);
        const {
            defaultMessage,
            id,
        } = section;

        return (
            <View style={[styles.titleContainer, {backgroundColor: defaultTheme.centerChannelColor}]}>
                <View style={{backgroundColor: changeOpacity(defaultTheme.centerChannelBg, 0.6), justifyContent: 'center'}}>
                    <Text style={styles.title}>
                        {intl.formatMessage({id, defaultMessage}).toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    render() {
        const styles = getStyleSheet(defaultTheme);

        return (
            <View style={styles.flex}>
                {this.renderBody(styles)}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flexGrow: 0,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
        loadingContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        searchContainer: {
            paddingBottom: 2,
        },
        searchBarInput: {
            backgroundColor: '#fff',
            color: theme.centerChannelColor,
            fontSize: 15,
        },
        titleContainer: {
            height: 30,
        },
        title: {
            color: theme.centerChannelColor,
            fontSize: 15,
            height: 30,
            textAlignVertical: 'center',
            paddingHorizontal: 15,
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15,
        },
        error: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
        noResultContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 25,
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        loadingSpinner: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginTop: 15,
        },
    };
});
