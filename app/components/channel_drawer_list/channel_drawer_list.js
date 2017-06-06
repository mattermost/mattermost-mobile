// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import deepEqual from 'deep-equal';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import Badge from 'app/components/badge';
import FormattedText from 'app/components/formatted_text';
import SearchBar from 'app/components/search_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {General} from 'mattermost-redux/constants';
import {sortChannelsByDisplayName} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ChannelDrawerItem from './channel_drawer_item';
import UnreadIndicator from './unread_indicator';

class ChannelDrawerList extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            searchChannels: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired
        }).isRequired,
        canCreatePrivateChannels: PropTypes.bool.isRequired,
        channels: PropTypes.object.isRequired,
        channelMembers: PropTypes.object,
        currentTeam: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        intl: intlShape.isRequired,
        myPreferences: PropTypes.object,
        myTeamMembers: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onJoinChannel: PropTypes.func.isRequired,
        onSearchEnds: PropTypes.func.isRequired,
        onSearchStart: PropTypes.func.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        onShowTeams: PropTypes.func.isRequired,
        otherChannels: PropTypes.array,
        profiles: PropTypes.object,
        statuses: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    };

    constructor(props) {
        super(props);
        this.firstUnreadChannel = null;
        this.state = {
            dataSource: this.buildData(props),
            searching: false,
            showAbove: false,
            showBelow: false,
            term: null
        };

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).
        then((source) => {
            this.closeButton = source;
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        const currentProps = {...this.props};
        const props = {...nextProps};

        // remove the profiles, otherChannels, myPreferences and statuses
        // to prevent the component to re-render every time they change
        Reflect.deleteProperty(currentProps, 'profiles');
        Reflect.deleteProperty(currentProps, 'otherChannels');
        Reflect.deleteProperty(currentProps, 'myPreferences');
        Reflect.deleteProperty(currentProps, 'statuses');
        Reflect.deleteProperty(props, 'profiles');
        Reflect.deleteProperty(props, 'otherChannels');
        Reflect.deleteProperty(props, 'myPreferences');
        Reflect.deleteProperty(props, 'statuses');

        return !deepEqual(currentProps, props, {strict: true}) || !deepEqual(this.state, nextState, {strict: true});
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            dataSource: this.buildData(nextProps, this.state.term)
        }, () => {
            if (this.refs.list) {
                this.refs.list.recordInteraction();
                this.updateUnreadIndicators({
                    viewableItems: Array.from(this.refs.list._listRef._viewabilityHelper._viewableItems.values()) //eslint-disable-line
                });
            }
        });
    }

    updateUnreadIndicators = ({viewableItems}) => {
        let showAbove = false;
        const visibleIndexes = viewableItems.map((v) => v.index);

        if (visibleIndexes.length) {
            const {dataSource} = this.state;
            const firstVisible = parseInt(visibleIndexes[0], 10);

            if (this.firstUnreadChannel) {
                const index = dataSource.findIndex((item) => {
                    return item.display_name === this.firstUnreadChannel;
                });
                showAbove = index < firstVisible;
            }

            this.setState({
                showAbove
            });
        }
    };

    onSelectChannel = (channel) => {
        this.props.actions.setChannelDisplayName(channel.display_name);

        if (channel.fake) {
            this.props.onJoinChannel(channel);
        } else {
            this.props.onSelectChannel(channel.id);
        }

        this.refs.search_bar.cancel();
    };

    onLayout = (event) => {
        const {width} = event.nativeEvent.layout;
        this.width = width;
    };

    getUnreadMessages = (channel) => {
        const member = this.props.channelMembers[channel.id];
        let mentions = 0;
        let unreadCount = 0;
        if (member && channel) {
            mentions = member.mention_count;
            unreadCount = channel.total_msg_count - member.msg_count;

            if (member.notify_props && member.notify_props.mark_unread === General.MENTION) {
                unreadCount = 0;
            }
        }

        return {
            mentions,
            unreadCount
        };
    };

    findUnreadChannels = (data) => {
        data.forEach((c) => {
            if (c.id) {
                const {mentions, unreadCount} = this.getUnreadMessages(c);
                const unread = (mentions + unreadCount) > 0;

                if (unread && c.id !== this.props.currentChannel.id) {
                    if (!this.firstUnreadChannel) {
                        this.firstUnreadChannel = c.display_name;
                    }
                }
            }
        });
    };

    createChannelElement = (channel) => {
        const {mentions, unreadCount} = this.getUnreadMessages(channel);

        let msgCount = 0;
        let unread = false;
        if (!this.state.term) {
            msgCount = mentions + unreadCount;
            unread = msgCount > 0;
        }

        return (
            <ChannelDrawerItem
                ref={channel.id}
                channel={channel}
                hasUnread={unread}
                mentions={mentions}
                onSelectChannel={this.onSelectChannel}
                isActive={channel.isCurrent || false}
                theme={this.props.theme}
            />
        );
    };

    createPrivateChannel = () => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'CreateChannel',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'mobile.create_channel.private', defaultMessage: 'New Private Channel'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                channelType: General.PRIVATE_CHANNEL,
                closeButton: this.closeButton
            }
        });
    };

    filterChannels = (channels, term) => {
        if (!term) {
            return channels;
        }

        const text = term.toLowerCase();
        return channels.filter((c) => {
            return c.display_name.toLowerCase().includes(text);
        });
    };

    buildChannels = (props) => {
        const {canCreatePrivateChannels, theme} = props;
        const {
            unreadChannels,
            favoriteChannels,
            publicChannels,
            privateChannels,
            directAndGroupChannels
        } = props.channels;

        const data = [];
        const styles = getStyleSheet(theme);

        if (unreadChannels.length) {
            data.push(
                this.renderTitle(styles, 'mobile.channel_list.unreads', 'UNREADS', null, false, true),
                ...unreadChannels
            );
        }

        if (favoriteChannels.length) {
            data.push(
                this.renderTitle(styles, 'sidebar.favorite', 'FAVORITES', null, unreadChannels.length > 0, true),
                ...favoriteChannels
            );
        }

        data.push(
            this.renderTitle(styles, 'sidebar.channels', 'CHANNELS', this.showMoreChannelsModal, favoriteChannels.length > 0, publicChannels.length > 0),
            ...publicChannels
        );

        let createPrivateChannel;
        if (canCreatePrivateChannels) {
            createPrivateChannel = this.createPrivateChannel;
        }
        data.push(
            this.renderTitle(styles, 'sidebar.pg', 'PRIVATE CHANNELS', createPrivateChannel, true, privateChannels.length > 0),
            ...privateChannels
        );

        data.push(
            this.renderTitle(styles, 'sidebar.direct', 'DIRECT MESSAGES', this.showDirectMessagesModal, true, directAndGroupChannels.length > 0),
            ...directAndGroupChannels
        );

        return data;
    };

    buildChannelsForSearch = (props, term) => {
        const data = [];
        const {otherChannels, theme} = props;
        const styles = getStyleSheet(theme);
        const {
            unreadChannels,
            favoriteChannels,
            publicChannels,
            privateChannels,
            directAndGroupChannels
        } = props.channels;

        const notMemberOf = otherChannels.map((o) => {
            return {
                ...o,
                fake: true
            };
        });

        const favorites = favoriteChannels.filter((c) => {
            return c.type !== General.DM_CHANNEL && c.type !== General.GM_CHANNEL;
        });

        const unreads = this.filterChannels(unreadChannels, term);
        const channels = this.filterChannels([...favorites, ...publicChannels, ...privateChannels], term);
        const others = this.filterChannels(notMemberOf, term);
        const groups = this.filterChannels([...directAndGroupChannels, ...favoriteChannels].filter((c) => c.type === General.GM_CHANNEL), term);
        const fakeDms = this.filterChannels(this.buildFakeDms(props), term);
        const directMessages = [...groups, ...fakeDms].sort(sortChannelsByDisplayName.bind(null, props.intl.locale));

        if (unreads.length) {
            data.push(
                this.renderTitle(styles, 'mobile.channel_list.unreads', 'UNREADS', null, false, true),
                ...unreads
            );
        }

        if (channels.length) {
            data.push(
                this.renderTitle(styles, 'sidebar.channels', 'CHANNELS', null, unreads.length > 0, true),
                ...channels
            );
        }

        if (others.length) {
            data.push(
                this.renderTitle(styles, 'mobile.channel_list.not_member', 'NOT A MEMBER', null, channels.length > 0, true),
                ...others
            );
        }

        if (directMessages.length) {
            data.push(
                this.renderTitle(styles, 'sidebar.direct', 'DIRECT MESSAGES', null, others.length > 0, true),
                ...directMessages
            );
        }

        return data;
    };

    buildFakeDms = (props) => {
        const {myPreferences, profiles, statuses} = props;
        const users = Object.values(profiles);

        return users.map((u) => {
            return {
                id: u.id,
                status: statuses[u.id],
                display_name: displayUsername(u, myPreferences),
                type: General.DM_CHANNEL,
                fake: true
            };
        });
    };

    buildData = (props, term) => {
        let data;

        if (!props.currentChannel) {
            return data;
        }

        if (term) {
            data = this.buildChannelsForSearch(props, term);
        } else {
            data = this.buildChannels(props);
        }

        this.firstUnreadChannel = null;

        if (!term) {
            this.findUnreadChannels(data);
        }

        return data;
    };

    openSettingsModal = () => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'Settings',
            title: intl.formatMessage({id: 'mobile.routes.settings', defaultMessage: 'Settings'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton
                }]
            }
        });
    };

    showDirectMessagesModal = () => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'MoreDirectMessages',
            title: intl.formatMessage({id: 'more_direct_channels.title', defaultMessage: 'Direct Messages'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-dms',
                    icon: this.closeButton
                }]
            }
        });
    };

    showMoreChannelsModal = () => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'MoreChannels',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'more_channels.title', defaultMessage: 'More Channels'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                channelType: General.PRIVATE_CHANNEL,
                closeButton: this.closeButton
            }
        });
    };

    renderSectionAction = (styles, action) => {
        const {theme} = this.props;
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={() => preventDoubleTap(action, this)}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            >
                <MaterialIcon
                    name='add'
                    style={styles.action}
                />
            </TouchableHighlight>
        );
    };

    renderDivider = (styles, marginLeft) => {
        return (
            <View
                style={[styles.divider, {marginLeft}]}
            />
        );
    };

    renderItem = ({item}) => {
        if (!item.isTitle) {
            return this.createChannelElement(item);
        }
        return item.title;
    };

    renderTitle = (styles, id, defaultMessage, action, topDivider, bottomDivider) => {
        const {formatMessage} = this.props.intl;

        return {
            id,
            isTitle: true,
            title: (
                <View>
                    {topDivider && this.renderDivider(styles, 0)}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>
                            {formatMessage({id, defaultMessage}).toUpperCase()}
                        </Text>
                        {action && this.renderSectionAction(styles, action)}
                    </View>
                    {bottomDivider && this.renderDivider(styles, 16)}
                </View>
            )
        };
    };

    onSearch = (term) => {
        const {actions, currentTeam} = this.props;
        const {searchChannels, searchProfiles} = actions;
        const dataSource = this.buildData(this.props, term);

        this.setState({dataSource, term});
        clearTimeout(this.searchTimeoutId);

        this.searchTimeoutId = setTimeout(() => {
            searchProfiles(term);
            searchChannels(currentTeam.id, term);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    };

    onSearchFocused = () => {
        this.setState({searching: true});
        this.props.onSearchStart();
    };

    cancelSearch = () => {
        this.props.onSearchEnds();
        this.setState({searching: false});
        this.onSearch(null);
    };

    render() {
        const {
            currentChannel,
            currentTeam,
            intl,
            myTeamMembers,
            onShowTeams,
            theme
        } = this.props;

        const {dataSource, searching, showAbove} = this.state;
        const teamMembers = Object.values(myTeamMembers);

        if (!currentChannel) {
            return <Text>{'Loading'}</Text>;
        }
        const styles = getStyleSheet(theme);

        let settings;
        if (!searching) {
            settings = (
                <TouchableHighlight
                    style={styles.settingsContainer}
                    onPress={() => preventDoubleTap(this.openSettingsModal)}
                    underlayColor={changeOpacity(theme.sidebarHeaderBg, 0.5)}
                >
                    <AwesomeIcon
                        name='cog'
                        style={styles.settings}
                    />
                </TouchableHighlight>
            );
        }

        let above;
        if (showAbove && !searching) {
            above = (
                <UnreadIndicator
                    style={[styles.above, {width: (this.width - 40)}]}
                    onPress={() => this.refs.list.scrollToOffset({x: 0, y: 0, animated: true})}
                    text={(
                        <FormattedText
                            style={styles.indicatorText}
                            id='sidebar.unreadAbove'
                            defaultMessage='Unread post(s) above'
                        />
                    )}
                />
            );
        }

        const title = (
            <View style={styles.searchContainer}>
                <SearchBar
                    ref='search_bar'
                    placeholder={intl.formatMessage({id: 'mobile.channel_drawer.search', defaultMessage: 'Jump to a conversation'})}
                    cancelTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    backgroundColor='transparent'
                    inputHeight={Platform.OS === 'android' ? 32 : 33}
                    inputStyle={{
                        backgroundColor: changeOpacity(theme.sidebarText, 0.4),
                        color: theme.sidebarText,
                        fontSize: 13
                    }}
                    placeholderTextColor={changeOpacity(theme.sidebarText, 0.5)}
                    tintColorSearch={changeOpacity(theme.sidebarText, 0.5)}
                    tintColorDelete={changeOpacity(theme.sidebarText, 0.5)}
                    titleCancelColor={theme.sidebarHeaderTextColor}
                    onSearchButtonPress={this.onSearch}
                    onCancelButtonPress={this.cancelSearch}
                    onChangeText={this.onSearch}
                    onFocus={this.onSearchFocused}
                />
            </View >
        );

        let badge;
        let switcher;
        if (teamMembers.length > 1 && !searching) {
            let mentionCount = 0;
            let messageCount = 0;
            teamMembers.forEach((m) => {
                if (m.team_id !== currentTeam.id) {
                    mentionCount = mentionCount + (m.mention_count || 0);
                    messageCount = messageCount + (m.msg_count || 0);
                }
            });

            let badgeCount = 0;
            if (mentionCount) {
                badgeCount = mentionCount;
            } else if (messageCount) {
                badgeCount = -1;
            }

            if (badgeCount) {
                badge = (
                    <Badge
                        style={styles.badge}
                        countStyle={styles.mention}
                        count={badgeCount}
                        minHeight={5}
                        minWidth={5}
                    />
                );
            }

            switcher = (
                <TouchableHighlight
                    onPress={() => preventDoubleTap(onShowTeams)}
                    underlayColor={changeOpacity(theme.sidebarHeaderBg, 0.5)}
                >
                    <View style={styles.switcherContainer}>
                        <AwesomeIcon
                            name='chevron-left'
                            size={12}
                            color={theme.sidebarHeaderBg}
                        />
                        <View style={styles.switcherDivider}/>
                        <Text style={styles.switcherTeam}>
                            {currentTeam.display_name.substr(0, 2).toUpperCase()}
                        </Text>
                    </View>
                </TouchableHighlight>
            );
        }

        return (
            <View
                style={styles.container}
                onLayout={this.onLayout}
            >
                <View style={styles.statusBar}>
                    <View style={styles.headerContainer}>
                        {switcher}
                        {title}
                        {settings}
                        {badge}
                    </View>
                </View>
                <FlatList
                    ref='list'
                    data={dataSource}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={this.updateUnreadIndicators}
                    keyboardDismissMode='on-drag'
                    maxToRenderPerBatch={10}
                    viewabilityConfig={{
                        viewAreaCoveragePercentThreshold: 3,
                        waitForInteraction: false
                    }}
                />
                {above}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.sidebarBg,
            flex: 1
        },
        statusBar: {
            backgroundColor: theme.sidebarHeaderBg,
            ...Platform.select({
                ios: {
                    paddingTop: 20
                }
            })
        },
        headerContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.sidebarHeaderTextColor, 0.10),
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 44
                }
            })
        },
        header: {
            color: theme.sidebarHeaderTextColor,
            flex: 1,
            fontSize: 17,
            fontWeight: 'normal',
            paddingLeft: 16
        },
        settingsContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10,
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 44
                }
            })
        },
        settings: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontWeight: '300'
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 48,
            marginLeft: 16
        },
        title: {
            flex: 1,
            color: theme.sidebarText,
            opacity: 1,
            fontSize: 15,
            fontWeight: '400',
            letterSpacing: 0.8,
            lineHeight: 18
        },
        searchContainer: {
            flex: 1,
            ...Platform.select({
                android: {
                    marginBottom: 1
                },
                ios: {
                    marginBottom: 3
                }
            })
        },
        switcherContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderTextColor,
            borderRadius: 2,
            flexDirection: 'row',
            height: 32,
            justifyContent: 'center',
            marginLeft: 16,
            paddingHorizontal: 6
        },
        switcherDivider: {
            backgroundColor: theme.sidebarHeaderBg,
            height: 15,
            marginHorizontal: 6,
            width: 1
        },
        switcherTeam: {
            color: theme.sidebarHeaderBg,
            fontFamily: 'OpenSans',
            fontSize: 14
        },
        badge: {
            backgroundColor: theme.mentionBj,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            height: 20,
            padding: 3,
            position: 'absolute',
            left: 5,
            top: 0,
            width: 20
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10
        },
        divider: {
            backgroundColor: changeOpacity(theme.sidebarText, 0.1),
            height: 1
        },
        actionContainer: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            width: 50
        },
        action: {
            color: theme.sidebarText,
            fontSize: 20,
            fontWeight: '500',
            lineHeight: 18
        },
        above: {
            backgroundColor: theme.mentionBj,
            top: 79
        },
        indicatorText: {
            backgroundColor: 'transparent',
            color: theme.mentionColor,
            fontSize: 14,
            paddingVertical: 2,
            paddingHorizontal: 4,
            textAlign: 'center',
            textAlignVertical: 'center'
        }
    });
});

export default injectIntl(ChannelDrawerList);
