// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ExtensionChannelItem from './extension_channel_item';

const defaultTheme = Preferences.THEMES.default;

export default class ExtensionTeam extends PureComponent {
    static propTypes = {
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
    };

    componentWillMount() {
        this.buildSections();
    }

    buildSections = (term) => {
        const sections = [];
        let {
            directChannels: directFiltered,
            privateChannels: privateFiletered,
            publicChannels: publicFiltered,
        } = this.props;

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

    handleSelectChannel = async (channel) => {
        const {state} = this.props.navigation;
        const backAction = NavigationActions.back();

        if (state.params && state.params.onSelectChannel) {
            state.params.onSelectChannel(channel.id);
        }

        this.props.navigation.dispatch(backAction);
    };

    handleSearch = (term) => {
        this.setState({term}, () => {
            if (this.throttleTimeout) {
                clearTimeout(this.throttleTimeout);
            }

            this.throttleTimeout = setTimeout(() => {
                this.buildSections(term);
            }, 300);
        });
    };

    keyExtractor = (item) => item.id;

    renderBody = (styles) => {
        const {sections} = this.state;

        if (!sections) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator/>
                </View>
            );
        }

        return (
            <SectionList
                sections={sections}
                ListHeaderComponent={this.renderSearchBar(styles)}
                ItemSeparatorComponent={this.renderItemSeparator}
                renderItem={this.renderItem}
                renderSectionHeader={this.renderSectionHeader}
                keyExtractor={this.keyExtractor}
                keyboardShouldPersistTaps='always'
                keyboardDismissMode='on-drag'
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                stickySectionHeadersEnabled={true}
                scrollEventThrottle={100}
                windowSize={5}
            />
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
                    ref='search_bar'
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
            flex: 1,
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
    };
});
