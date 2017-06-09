// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import deepEqual from 'deep-equal';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity} from 'app/utils/theme';

import {General} from 'mattermost-redux/constants';
import {sortChannelsByDisplayName} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ChannelDrawerItem from 'app/components/channel_drawer/channels_list/channel_item';

class ChannelDrawerList extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            makeGroupMessageVisibleIfNecessary: PropTypes.func.isRequired,
            searchChannels: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired
        }).isRequired,
        channels: PropTypes.object.isRequired,
        channelMembers: PropTypes.object,
        currentTeam: PropTypes.object.isRequired,
        currentUserId: PropTypes.string,
        currentChannel: PropTypes.object,
        groupChannels: PropTypes.array,
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
        profilesInChannel: PropTypes.object,
        statuses: PropTypes.object,
        styles: PropTypes.object.isRequired,
        term: PropTypes.string,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    };

    constructor(props) {
        super(props);
        this.state = {
            dataSource: this.buildData(props)
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !deepEqual(this.props, nextProps, {strict: true}) || !deepEqual(this.state, nextState, {strict: true});
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.term !== nextProps.term) {
            const {actions, currentTeam} = this.props;
            const {term} = nextProps;
            const {searchChannels, searchProfiles} = actions;
            const dataSource = this.buildData(this.props, term);

            this.setState({dataSource, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                searchProfiles(term);
                searchChannels(currentTeam.id, term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        }
    }

    onSelectChannel = (channel) => {
        const {
            makeGroupMessageVisibleIfNecessary,
            setChannelDisplayName
        } = this.props.actions;

        setChannelDisplayName(channel.display_name);
        if (channel.type === General.GM_CHANNEL) {
            makeGroupMessageVisibleIfNecessary(channel.id);
        }

        this.props.onSelectChannel(channel);
    };

    createChannelElement = (channel) => {
        return (
            <ChannelDrawerItem
                ref={channel.id}
                channel={channel}
                hasUnread={false}
                mentions={0}
                onSelectChannel={this.onSelectChannel}
                isActive={channel.isCurrent || false}
                theme={this.props.theme}
            />
        );
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

    completeDirectGroupInfo = (channel) => {
        const {currentUserId, myPreferences, profiles, profilesInChannel} = this.props;
        const profilesIds = profilesInChannel[channel.id];
        if (profilesIds) {
            function sortUsernames(a, b) {
                const locale = profiles[currentUserId].locale;
                return a.localeCompare(b, locale, {numeric: true});
            }

            const displayName = [];
            profilesIds.forEach((teammateId) => {
                if (teammateId !== currentUserId) {
                    displayName.push(displayUsername(profiles[teammateId], myPreferences));
                }
            });

            const gm = {...channel};
            return Object.assign(gm, {
                display_name: displayName.sort(sortUsernames).join(', ')
            });
        }
        return channel;
    };

    buildChannelsForSearch = (props, term) => {
        const data = [];
        const {groupChannels, otherChannels, styles} = props;
        const {
            unreadChannels,
            favoriteChannels,
            publicChannels,
            privateChannels
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
        const groups = this.filterChannels(groupChannels.map((g) => this.completeDirectGroupInfo(g)), term);
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
        if (!props.currentChannel) {
            return null;
        }

        return this.buildChannelsForSearch(props, term);
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

    render() {
        const {styles} = this.props;

        const {dataSource} = this.state;

        return (
            <View
                style={styles.container}
            >
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
            </View>
        );
    }
}

export default injectIntl(ChannelDrawerList);
