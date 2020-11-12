// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ScrollView,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {dismissModal} from '@actions/navigation';
import StatusBar from '@components/status_bar';
import {alertErrorWithFallback} from '@utils/general';
import {t} from '@utils/i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AddMembers from './add_members';
import NotificationPreference from './notification_preference';
import Archive from './archive';
import ChannelInfoHeader from './channel_info_header';
import ConvertPrivate from './convert_private';
import EditChannel from './edit_channel';
import Favorite from './favorite';
import IgnoreMentions from './ignore_mentions';
import Leave from './leave';
import ManageMembers from './manage_members';
import Mute from './mute';
import Pinned from './pinned';
import Separator from './separator';

export default class ChannelInfo extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getChannelStats: PropTypes.func.isRequired,
            getCustomEmojisInText: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            showPermalink: PropTypes.func.isRequired,
        }),
        currentChannel: PropTypes.object.isRequired,
        currentChannelCreatorName: PropTypes.string,
        currentChannelGuestCount: PropTypes.number,
        currentChannelMemberCount: PropTypes.number,
        currentUserId: PropTypes.string,
        isBot: PropTypes.bool.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        isTeammateGuest: PropTypes.bool.isRequired,
        isDirectMessage: PropTypes.bool.isRequired,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        currentChannelGuestCount: 0,
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        this.props.actions.getChannelStats(this.props.currentChannel.id);
        this.props.actions.getCustomEmojisInText(this.props.currentChannel.header);
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'close-info') {
            dismissModal();
        }
    }

    close = (redirect = true) => {
        const {actions} = this.props;

        if (redirect) {
            actions.setChannelDisplayName('');
        }

        dismissModal();
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.showPermalink(this.context.intl, teamName, postId);
    };

    permalinkBadTeam = () => {
        const {intl} = this.context;
        const message = {
            id: t('mobile.server_link.unreachable_team.error'),
            defaultMessage: 'This link belongs to a deleted team or to a team to which you do not have access.',
        };

        alertErrorWithFallback(intl, {}, message);
    };

    actionsRows = (channelIsArchived) => {
        const {currentChannel, currentUserId, isLandscape, isDirectMessage, theme} = this.props;

        if (channelIsArchived) {
            return (
                <ManageMembers
                    isLandscape={isLandscape}
                    theme={theme}
                    separator={false}
                />);
        }

        return (
            <>
                <Favorite
                    testID='channel_info.favorite.action'
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <Separator theme={theme}/>
                <Mute
                    testID='channel_info.mute.action'
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    userId={currentUserId}
                    theme={theme}
                />
                <Separator theme={theme}/>
                <IgnoreMentions
                    testID='channel_info.ignore_mentions.action'
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <Separator theme={theme}/>
                {!isDirectMessage &&
                <>
                    <NotificationPreference
                        testID='channel_info.notification_preference.action'
                        isLandscape={isLandscape}
                        theme={theme}
                    />
                    <Separator theme={theme}/>
                </>
                }
                <Pinned
                    testID='channel_info.pinned.action'
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <ManageMembers
                    testID='channel_info.manage_members.action'
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <AddMembers
                    testID='channel_info.add_members.action'
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <ConvertPrivate
                    testID='channel_info.convert_private.action'
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <EditChannel
                    testID='channel_info.edit_channel.action'
                    isLandscape={isLandscape}
                    theme={theme}
                />
            </>
        );
    };

    render() {
        const {
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            currentChannelGuestCount,
            status,
            theme,
            isBot,
            isTeammateGuest,
            isLandscape,
        } = this.props;

        const style = getStyleSheet(theme);
        const channelIsArchived = currentChannel.delete_at !== 0;

        return (
            <View
                testID='channel_info.screen'
                style={style.container}
            >
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                >
                    {Boolean(currentChannel?.id) &&
                    <ChannelInfoHeader
                        createAt={currentChannel.create_at}
                        creator={currentChannelCreatorName}
                        displayName={currentChannel.display_name}
                        header={currentChannel.header}
                        memberCount={currentChannelMemberCount}
                        onPermalinkPress={this.handlePermalinkPress}
                        purpose={currentChannel.purpose}
                        status={status}
                        theme={theme}
                        type={currentChannel.type}
                        isArchived={channelIsArchived}
                        isBot={isBot}
                        isTeammateGuest={isTeammateGuest}
                        hasGuests={currentChannelGuestCount > 0}
                        isGroupConstrained={currentChannel.group_constrained}
                        isLandscape={isLandscape}
                    />
                    }
                    <View style={style.rowsContainer}>
                        {this.actionsRows(channelIsArchived)}
                    </View>
                    <View style={style.footer}>
                        <Leave
                            close={this.close}
                            isLandscape={isLandscape}
                            theme={theme}
                        />
                        <Archive
                            close={this.close}
                            isLandscape={isLandscape}
                            theme={theme}
                        />
                    </View>
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        footer: {
            marginTop: 40,
        },
        rowsContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
    };
});
