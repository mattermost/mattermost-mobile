// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import deepEqual from 'deep-equal';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Keyboard,
    Platform,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {changeOpacity} from 'app/utils/theme';

import {General} from 'mattermost-redux/constants';
import {sortChannelsByDisplayName} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';
import {t} from 'app/utils/i18n';
import ChannelItem from 'app/components/sidebars/main/channels_list/channel_item';
import {ListTypes} from 'app/constants';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

const VIEWABILITY_CONFIG = ListTypes.VISIBILITY_CONFIG_DEFAULTS;

class FilteredList extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            getProfilesInTeam: PropTypes.func.isRequired,
            makeGroupMessageVisibleIfNecessary: PropTypes.func.isRequired,
            searchChannels: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
        }).isRequired,
        channels: PropTypes.object.isRequired,
        currentTeam: PropTypes.object.isRequired,
        currentUserId: PropTypes.string,
        currentChannel: PropTypes.object,
        groupChannelMemberDetails: PropTypes.object,
        intl: intlShape.isRequired,
        teammateNameDisplay: PropTypes.string,
        onSelectChannel: PropTypes.func.isRequired,
        otherChannels: PropTypes.array,
        archivedChannels: PropTypes.array,
        profiles: PropTypes.object,
        teamProfiles: PropTypes.object,
        searchOrder: PropTypes.array.isRequired,
        pastDirectMessages: PropTypes.array,
        restrictDms: PropTypes.bool.isRequired,
        statuses: PropTypes.object,
        styles: PropTypes.object.isRequired,
        term: PropTypes.string,
        theme: PropTypes.object.isRequired,
        previewChannel: PropTypes.func,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        currentChannel: {},
        pastDirectMessages: [],
    };

    constructor(props) {
        super(props);

        this.keyboardDismissProp = {
            keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'none',
            onScrollBeginDrag: Keyboard.dismiss,
        };

        this.state = {
            dataSource: this.buildData(props),
        };
    }

    componentDidMount() {
        if (this.props.restrictDms) {
            this.props.actions.getProfilesInTeam(this.props.currentTeam.id);
        }
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
                // Android has a fatal error if we send a blank term
                if (!term) {
                    return;
                }

                searchProfiles(term);
                searchChannels(currentTeam.id, term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        }
    }

    onSelectChannel = (channel) => {
        const {actions, currentChannel} = this.props;
        const {makeGroupMessageVisibleIfNecessary} = actions;

        if (channel.type === General.GM_CHANNEL) {
            makeGroupMessageVisibleIfNecessary(channel.id);
        }

        this.props.onSelectChannel(channel, currentChannel.id);
    };

    createChannelElement = (channel) => {
        return (
            <ChannelItem
                channelId={channel.id}
                channel={channel}
                isSearchResult={true}
                isUnread={channel.isUnread}
                mentions={0}
                onSelectChannel={this.onSelectChannel}
                previewChannel={this.props.previewChannel}
            />
        );
    };

    filterChannels = (channels, term) => {
        if (!term) {
            return channels;
        }

        const text = term.toLowerCase();
        return channels.filter((c) => {
            const fieldsToCheck = ['display_name', 'username', 'email', 'full_name', 'nickname'];

            let match = false;
            for (const field of fieldsToCheck) {
                if (c.hasOwnProperty(field) && c[field].toLowerCase().includes(text)) {
                    match = true;
                    break;
                }
            }

            return match;
        });
    };

    getSectionBuilders = () => ({
        unreads: {
            builder: this.buildUnreadChannelsForSearch,
            id: t('mobile.channel_list.unreads'),
            defaultMessage: 'UNREADS',
        },
        channels: {
            builder: this.buildChannelsForSearch,
            id: t('mobile.channel_list.channels'),
            defaultMessage: 'CHANNELS',
        },
        dms: {
            builder: this.buildCurrentDMSForSearch,
            id: t('sidebar.direct'),
            defaultMessage: 'DIRECT MESSAGES',
        },
        members: {
            builder: this.buildMembersForSearch,
            id: t('mobile.channel_list.members'),
            defaultMessage: 'MEMBERS',
        },
        nonmembers: {
            builder: this.buildOtherMembersForSearch,
            id: t('mobile.channel_list.not_member'),
            defaultMessage: 'NOT A MEMBER',
        },
        archived: {
            builder: this.buildArchivedForSearch,
            id: t('mobile.channel_list.archived'),
            defaultMessage: 'ARCHIVED',
        },
    });

    buildUnreadChannelsForSearch = (props, term) => {
        const {unreadChannels} = props.channels;

        return this.filterChannels(unreadChannels, term).map((item) => {
            item.isUnread = true;
            return item;
        });
    };

    buildCurrentDMSForSearch = (props, term) => {
        const {channels, teammateNameDisplay, profiles, statuses, pastDirectMessages, groupChannelMemberDetails} = props;
        const {favoriteChannels} = channels;

        const favoriteDms = favoriteChannels.filter((c) => {
            return c.type === General.DM_CHANNEL;
        });

        const directChannelUsers = [];
        let groupChannels = [];

        channels.directAndGroupChannels.forEach((c) => {
            if (c.type === General.DM_CHANNEL) {
                if (profiles.hasOwnProperty(c.teammate_id)) {
                    directChannelUsers.push(profiles[c.teammate_id]);
                }
            } else {
                groupChannels.push(c);
            }
        });

        const pastDirectMessageUsers = pastDirectMessages.map((p) => profiles[p]).filter((p) => typeof p !== 'undefined');

        const dms = [...directChannelUsers, ...pastDirectMessageUsers].map((u) => {
            const displayName = displayUsername(u, teammateNameDisplay, false);

            return {
                id: u.id,
                status: statuses[u.id],
                display_name: displayName,
                username: u.username,
                email: u.email,
                type: General.DM_CHANNEL,
                fake: true,
                nickname: u.nickname,
                fullname: `${u.first_name} ${u.last_name}`,
                delete_at: u.delete_at,
                isBot: u.is_bot,

                // need name key for DM's as we use it for sortChannelsByDisplayName with same display_name
                name: displayName,
            };
        });

        groupChannels = groupChannels.map((channel) => {
            return {
                ...channel,
                ...groupChannelMemberDetails[channel.id],
            };
        });

        return this.filterChannels([...favoriteDms, ...dms, ...groupChannels], term).sort(sortChannelsByDisplayName.bind(null, props.intl.locale));
    }

    buildMembersForSearch = (props, term) => {
        const {channels, currentUserId, teammateNameDisplay, profiles, teamProfiles, statuses, pastDirectMessages, restrictDms} = props;
        const {favoriteChannels, unreadChannels} = channels;

        const favoriteAndUnreadDms = [...favoriteChannels, ...unreadChannels].filter((c) => {
            return c.type === General.DM_CHANNEL;
        });

        const directAndGroupChannelMembers = [...channels.directAndGroupChannels, ...favoriteAndUnreadDms].filter((c) => c.type === General.DM_CHANNEL).map((c) => c.teammate_id);

        const profilesToUse = restrictDms ? teamProfiles : profiles;

        const userNotInDirectOrGroupChannels = Object.values(profilesToUse).filter((u) => directAndGroupChannelMembers.indexOf(u.id) === -1 && pastDirectMessages.indexOf(u.id) === -1 && u.id !== currentUserId);

        const members = userNotInDirectOrGroupChannels.map((u) => {
            const displayName = displayUsername(u, teammateNameDisplay, false);

            return {
                id: u.id,
                status: statuses[u.id],
                display_name: displayName,
                username: u.username,
                email: u.email,
                name: displayName,
                type: General.DM_CHANNEL,
                fake: true,
                nickname: u.nickname,
                fullname: `${u.first_name} ${u.last_name}`,
                delete_at: u.delete_at,
                isBot: u.is_bot,
            };
        });

        const fakeDms = this.filterChannels([...members], term);

        return [...fakeDms].sort(sortChannelsByDisplayName.bind(null, props.intl.locale));
    }

    buildChannelsForSearch = (props, term) => {
        const {
            favoriteChannels,
            publicChannels,
            privateChannels,
        } = props.channels;

        const favorites = favoriteChannels.filter((c) => {
            return c.type !== General.DM_CHANNEL && c.type !== General.GM_CHANNEL;
        });

        return this.filterChannels([...favorites, ...publicChannels, ...privateChannels], term).
            sort(sortChannelsByDisplayName.bind(null, props.intl.locale));
    }

    buildArchivedForSearch = (props, term) => {
        const {currentChannel, archivedChannels} = props;

        return this.filterChannels(archivedChannels.reduce((acc, channel) => {
            // when there is no search text, display an archived channel only if we are in it at the moment.
            if (term || channel.id === currentChannel.id) {
                acc.push({...channel});
            }

            return acc;
        }, []), term);
    }

    buildOtherMembersForSearch = (props, term) => {
        const {otherChannels} = props;

        const notMemberOf = otherChannels.map((o) => {
            return {
                ...o,
                fake: true,
            };
        });

        return this.filterChannels(notMemberOf, term);
    }

    buildSectionsForSearch = (props, term) => {
        const items = [];
        const {searchOrder, styles} = props;
        const sectionBuilders = this.getSectionBuilders();

        let previousDataLength = 0;
        for (const section of searchOrder) {
            if (sectionBuilders.hasOwnProperty(section)) {
                const sectionBuilder = sectionBuilders[section];
                const {builder, defaultMessage, id} = sectionBuilder;
                const data = builder(props, term);

                if (data.length) {
                    const title = this.renderTitle(styles, id, defaultMessage, null, previousDataLength > 0, true);
                    items.push(title, ...data);
                    previousDataLength = data.length;
                }
            }
        }

        return items;
    };

    buildData = (props, term) => {
        if (!props.currentChannel) {
            return null;
        }

        return this.buildSectionsForSearch(props, term);
    };

    renderSectionAction = (styles, action) => {
        const {theme} = this.props;
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={action}
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
                        <Text style={[styles.title, padding(this.props.isLandscape)]}>
                            {formatMessage({id, defaultMessage}).toUpperCase()}
                        </Text>
                        {action && this.renderSectionAction(styles, action)}
                    </View>
                    {bottomDivider && this.renderDivider(styles, 16)}
                </View>
            ),
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
                    data={dataSource}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={this.updateUnreadIndicators}
                    {...this.keyboardDismissProp}
                    keyboardShouldPersistTaps={'always'}
                    maxToRenderPerBatch={10}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                />
            </View>
        );
    }
}

export default injectIntl(FilteredList);
