// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    SectionList,
    Text,
    View
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {intlShape} from 'react-intl';

import {Client4} from 'mattermost-redux/client';
import {General, Preferences} from 'mattermost-redux/constants';
import {getUserIdFromChannelName} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import SearchBar from 'app/components/search_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ExtensionChannelItem from './extension_channel_item';
import ExtensionNavBar from './extension_nav_bar';

export default class ExtensionChannels extends PureComponent {
    static propTypes = {
        currentChannelId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        teamId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        title: PropTypes.string.isRequired
    };

    static contextTypes = {
        intl: intlShape
    };

    state = {
        sections: null
    };

    componentWillMount() {
        this.loadChannels();
    }

    buildSections = (term) => {
        const {channels} = this.state;
        const sections = [];
        const publicChannels = [];
        const privateChannels = [];
        const directChannels = [];

        channels.forEach((channel) => {
            const include = term ? channel.display_name.toLowerCase().includes(term.toLowerCase()) : true;
            if (channel.display_name && include) {
                switch (channel.type) {
                case General.OPEN_CHANNEL:
                    publicChannels.push(channel);
                    break;
                case General.PRIVATE_CHANNEL:
                    privateChannels.push(channel);
                    break;
                default:
                    directChannels.push(channel);
                    break;
                }
            }
        });

        if (publicChannels.length) {
            sections.push({
                id: 'sidebar.channels',
                defaultMessage: 'PUBLIC CHANNELS',
                data: publicChannels.sort(this.sortDisplayName)
            });
        }

        if (privateChannels.length) {
            sections.push({
                id: 'sidebar.pg',
                defaultMessage: 'PRIVATE CHANNELS',
                data: privateChannels.sort(this.sortDisplayName)
            });
        }

        if (directChannels.length) {
            sections.push({
                id: 'sidebar.direct',
                defaultMessage: 'DIRECT MESSAGES',
                data: directChannels.sort(this.sortDisplayName)
            });
        }

        this.setState({sections});
    };

    getGroupDisplayNameFromUserIds = (userIds, profiles) => {
        const names = [];
        userIds.forEach((id) => {
            const profile = profiles.find((p) => p.id === id);
            names.push(displayUsername(profile, Preferences.DISPLAY_PREFER_FULL_NAME));
        });

        return names.sort(this.sort).join(', ');
    };

    goBack = () => {
        this.props.navigator.pop();
    };

    keyExtractor = (item) => item.id;

    loadChannels = async () => {
        try {
            const {currentUserId, teamId} = this.props;
            const channelsMap = {};

            const myChannels = await Client4.getMyChannels(teamId);
            const myPreferences = await Client4.getMyPreferences();

            const usersInDms = myPreferences.filter((pref) => pref.category === Preferences.CATEGORY_DIRECT_CHANNEL_SHOW).map((pref) => pref.name);
            const dms = myChannels.filter((channel) => {
                const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                return (channel.type === General.DM_CHANNEL && usersInDms.includes(teammateId)) || channel.type === General.GM_CHANNEL;
            });

            const dmProfiles = await Client4.getProfilesByIds(usersInDms);

            for (let i = 0; i < dms.length; i++) {
                const channel = dms[i];
                if (channel.type === General.DM_CHANNEL) {
                    const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                    const profile = dmProfiles.find((p) => p.id === teammateId);
                    channelsMap[channel.id] = displayUsername(profile, Preferences.DISPLAY_PREFER_FULL_NAME);
                } else if (channel.type === General.GM_CHANNEL) {
                    const members = await Client4.getChannelMembers(channel.id, 0, General.MAX_USERS_IN_GM);
                    const userIds = members.filter((m) => m.user_id !== currentUserId).map((m) => m.user_id);
                    const gmProfiles = await Client4.getProfilesByIds(userIds);
                    channelsMap[channel.id] = this.getGroupDisplayNameFromUserIds(userIds, gmProfiles);
                }
            }

            const channels = myChannels.map((channel) => {
                return {
                    id: channel.id,
                    display_name: channelsMap[channel.id] || channel.display_name,
                    type: channel.type
                };
            });

            this.setState({
                channels
            }, () => {
                this.buildSections();
            });
        } catch (error) {
            this.setState({error});
        }
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

    handleSelectChannel = (channel) => {
        this.props.onSelectChannel(channel);
        this.goBack();
    };

    renderBody = (styles) => {
        const {error, sections} = this.state;

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>
                        {error.message}
                    </Text>
                </View>
            );
        }

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
        const {currentChannelId, theme} = this.props;

        return (
            <ExtensionChannelItem
                channel={item}
                currentChannelId={currentChannelId}
                onSelectChannel={this.handleSelectChannel}
                theme={theme}
            />
        );
    };

    renderItemSeparator = () => {
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.separatorContainer}>
                <View style={styles.separator}/>
            </View>
        );
    };

    renderSearchBar = (styles) => {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;

        return (
            <View style={styles.searchContainer}>
                <SearchBar
                    ref='search_bar'
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    backgroundColor='transparent'
                    inputHeight={33}
                    inputStyle={styles.searchBarInput}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColorDelete={changeOpacity(theme.centerChannelColor, 0.3)}
                    titleCancelColor={theme.linkColor}
                    onChangeText={this.handleSearch}
                    value={this.state.term}
                />
            </View>
        );
    };

    renderSectionHeader = ({section}) => {
        const {intl} = this.context;
        const {theme} = this.props;
        const styles = getStyleSheet(theme);
        const {
            defaultMessage,
            id
        } = section;

        return (
            <View style={[styles.titleContainer, {backgroundColor: theme.centerChannelBg}]}>
                <View style={{backgroundColor: changeOpacity(theme.centerChannelColor, 0.1), justifyContent: 'center'}}>
                    <Text style={styles.title}>
                        {intl.formatMessage({id, defaultMessage}).toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    sort = (a, b) => {
        const locale = DeviceInfo.getDeviceLocale().split('-')[0];
        return a.localeCompare(b, locale, {numeric: true});
    };

    sortDisplayName = (a, b) => {
        const locale = DeviceInfo.getDeviceLocale().split('-')[0];
        return a.display_name.localeCompare(b.display_name, locale, {numeric: true});
    };

    render() {
        const {theme, title} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.flex}>
                <ExtensionNavBar
                    backButton={true}
                    onLeftButtonPress={this.goBack}
                    title={title}
                    theme={theme}
                />
                {this.renderBody(styles)}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1
        },
        separatorContainer: {
            paddingLeft: 35
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1
        },
        loadingContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center'
        },
        searchContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            paddingBottom: 2
        },
        searchBarInput: {
            backgroundColor: '#fff',
            color: theme.centerChannelColor,
            fontSize: 15
        },
        titleContainer: {
            height: 30
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
            lineHeight: 30,
            paddingHorizontal: 15
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15
        },
        error: {
            color: theme.errorTextColor,
            fontSize: 14
        }
    };
});
