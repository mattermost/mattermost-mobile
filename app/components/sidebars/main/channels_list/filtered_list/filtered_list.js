// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    SectionList,
    Text,
    View,
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import {t} from 'app/utils/i18n';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import ChannelItem from 'app/components/sidebars/main/channels_list/channel_item';
import {General, ListTypes} from 'app/constants';
import {SidebarSectionTypes} from 'app/constants/view';
import {getChannelDisplayName} from 'app/realm/utils/channel';

const VIEWABILITY_CONFIG = ListTypes.VISIBILITY_CONFIG_DEFAULTS;

class FilteredList extends PureComponent {
    static propTypes = {
        channels: PropTypes.array.isRequired,
        currentTeamId: PropTypes.string,
        currentUserId: PropTypes.string,
        currentChannelId: PropTypes.string,
        getProfilesInTeam: PropTypes.func.isRequired,
        groupChannelMemberDetails: PropTypes.object,
        intl: intlShape.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        locale: PropTypes.string,
        makeGroupMessageVisibleIfNecessary: PropTypes.func.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        previewChannel: PropTypes.func,
        searchOrder: PropTypes.array.isRequired,
        restrictDms: PropTypes.bool.isRequired,
        searchChannels: PropTypes.func.isRequired,
        searchProfiles: PropTypes.func.isRequired,
        styles: PropTypes.object.isRequired,
        term: PropTypes.string,
        teammateDisplayNameSettings: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.keyboardDismissProp = {
            keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'none',
            onScrollBeginDrag: Keyboard.dismiss,
        };

        this.state = {
            data: this.buildData(props),
        };
    }

    componentDidMount() {
        if (this.props.restrictDms) {
            this.props.getProfilesInTeam(this.props.currentTeamId);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.term !== nextProps.term) {
            const {currentTeamId, searchChannels, searchProfiles} = this.props;
            const {term} = nextProps;
            const data = this.buildData(nextProps, term);

            this.setState({data, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                // Android has a fatal error if we send a blank term
                if (!term) {
                    return;
                }

                const profileOptions = {
                    allow_inactive: true,
                };
                if (nextProps.restrictDms) {
                    profileOptions.team_id = currentTeamId;
                }

                searchProfiles(term, profileOptions);
                searchChannels(currentTeamId, term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        }
    }

    buildArchivedSection = (props, term) => {
        return this.buildSectionData(props, SidebarSectionTypes.ARCHIVED, term);
    };

    buildData = (props, term) => {
        if (!props.currentChannelId) {
            return null;
        }

        return this.buildSections(props, term);
    };

    buildChannelSection = (props, term) => {
        return this.buildSectionData(props, SidebarSectionTypes.ALPHA, term);
    };

    buildDirectSection = (props, term) => {
        return this.buildSectionData(props, SidebarSectionTypes.DIRECT, term);
    };

    buildOtherChannelSection = (props, term) => {
        return this.buildSectionData(props, SidebarSectionTypes.OTHER, term);
    };

    buildProfilesSection = (props, term) => {
        return this.buildSectionData(props, SidebarSectionTypes.MEMBERS, term, true);
    };

    buildSectionData = (props, type, term, isFake = false) => {
        let items;
        const channels = props.channels.find((c) => c.type === type);
        if (isFake) {
            items = channels?.items?.map((c) => ({
                ...c,
                fake: true,
                fullName: c.fullName,
                type: c.type || General.DM_CHANNEL,
            }));
        } else {
            items = channels?.items;
        }

        if (items?.length) {
            return this.filterChannels(items, term);
        }

        return [];
    };

    buildSections = (props, term) => {
        const sections = [];
        const {searchOrder} = props;
        const sectionBuilders = this.getSectionBuilders();

        for (const section of searchOrder) {
            if (sectionBuilders.hasOwnProperty(section)) {
                const sectionBuilder = sectionBuilders[section];
                const {builder, defaultMessage, id} = sectionBuilder;
                const data = builder(props, term);

                if (data.length) {
                    sections.push({id, defaultMessage, data});
                }
            }
        }

        return sections;
    };

    buildUnreadSection = (props, term) => {
        return this.buildSectionData(props, SidebarSectionTypes.UNREADS, term);
    };

    extractItemKey = (item) => item.id || item;

    filterChannels = (channels, term) => {
        if (!term) {
            return channels;
        }

        const {currentUserId, locale, teammateDisplayNameSettings} = this.props;
        const text = term.toLowerCase();
        return channels.filter((c) => {
            const fieldsToCheck = ['displayName', 'fullName', 'username', 'nickname'];

            let match = false;
            for (const field of fieldsToCheck) {
                const isActualDirectMessage = (c.type === General.DM_CHANNEL && c.members?.length) || c.type === General.GM_CHANNEL;
                if (field === 'displayName' && isActualDirectMessage) {
                    if (getChannelDisplayName(c, currentUserId, locale, teammateDisplayNameSettings).toLowerCase().includes(text)) {
                        match = true;
                        break;
                    }
                } else if (c[field] && c[field].toLowerCase().includes(text)) {
                    match = true;
                    break;
                }
            }

            return match;
        });
    };

    getMyChannelMember = (channel, currentUserId) => {
        return channel?.members.filtered('user.id = $0', currentUserId)[0];
    };

    getSectionBuilders = () => ({
        unreads: {
            builder: this.buildUnreadSection,
            id: t('mobile.channel_list.unreads'),
            defaultMessage: 'UNREADS',
        },
        alpha: {
            builder: this.buildChannelSection,
            id: t('mobile.channel_list.channels'),
            defaultMessage: 'CHANNELS',
        },
        direct: {
            builder: this.buildDirectSection,
            id: t('sidebar.direct'),
            defaultMessage: 'DIRECT MESSAGES',
        },
        members: {
            builder: this.buildProfilesSection,
            id: t('mobile.channel_list.members'),
            defaultMessage: 'MEMBERS',
        },
        other: {
            builder: this.buildOtherChannelSection,
            id: t('mobile.channel_list.not_member'),
            defaultMessage: 'NOT A MEMBER',
        },
        archived: {
            builder: this.buildArchivedSection,
            id: t('mobile.channel_list.archived'),
            defaultMessage: 'ARCHIVED',
        },
    });

    onSelectChannel = (channel) => {
        const {currentChannelId, makeGroupMessageVisibleIfNecessary} = this.props;

        if (channel.type === General.GM_CHANNEL) {
            makeGroupMessageVisibleIfNecessary(channel.id);
        }

        this.props.onSelectChannel(channel, currentChannelId);
    };

    renderItem = ({item}) => {
        const {isLandscape, previewChannel, teammateDisplayNameSettings, theme} = this.props;

        let isUnread = false;
        if (item.members) {
            isUnread = this.showChannelAsUnread(item);
        }

        return (
            <ChannelItem
                channelId={item.id}
                fake={item.fake}
                isLandscape={isLandscape}
                isSearchResult={true}
                isUnread={isUnread}
                onSelectChannel={this.onSelectChannel}
                previewChannel={previewChannel}
                teammateDisplayNameSettings={teammateDisplayNameSettings}
                theme={theme}
            />
        );
    };

    renderSectionHeader = ({section}) => {
        const {intl, isLandscape, styles} = this.props;
        const {
            defaultMessage,
            id,
        } = section;

        return (
            <React.Fragment>
                <View style={[styles.titleContainer, padding(isLandscape)]}>
                    <Text style={styles.title}>
                        {intl.formatMessage({id, defaultMessage}).toUpperCase()}
                    </Text>
                    <View style={styles.separatorContainer}>
                        <View style={styles.separator}/>
                    </View>
                </View>
            </React.Fragment>
        );
    };

    showChannelAsUnread = (channel) => {
        const {currentUserId} = this.props;
        if (!channel?.members?.length) {
            return false;
        }

        const myMember = this.getMyChannelMember(channel, currentUserId);
        if (!myMember) {
            return false;
        }

        const hasUnreads = (channel.totalMsgCount - myMember.msgCount) > 0;
        const showUnreadForMsgs = myMember.notifyPropsAsJSON?.mark_unread !== General.MENTION; //eslint-disable-line camelcase
        return myMember.mentionCount > 0 || (hasUnreads > 0 && showUnreadForMsgs);
    };

    render() {
        const {styles} = this.props;
        const {data} = this.state;
        return (
            <View
                style={styles.container}
            >
                <SectionList
                    sections={data}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    keyExtractor={this.extractItemKey}
                    {...this.keyboardDismissProp}
                    keyboardShouldPersistTaps={'always'}
                    maxToRenderPerBatch={10}
                    stickySectionHeadersEnabled={true}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                />
            </View>
        );
    }
}

export default injectIntl(FilteredList);
