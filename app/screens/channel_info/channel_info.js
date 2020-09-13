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

import {dismissModal, showModalOverCurrentContext} from '@actions/navigation';
import StatusBar from '@components/status_bar';
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
            loadChannelsByTeamName: PropTypes.func.isRequired,
            getCustomEmojisInText: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
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

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.loadChannelsByTeamName(teamName);
        this.showPermalinkView(postId);
    };

    showPermalinkView = (postId) => {
        const {actions} = this.props;
        const screen = 'Permalink';
        const passProps = {
            isPermalink: true,
            onClose: this.handleClosePermalink,
        };
        const options = {
            layout: {
                backgroundColor: changeOpacity('#000', 0.2),
            },
        };

        actions.selectFocusedPostId(postId);

        this.showingPermalink = true;
        showModalOverCurrentContext(screen, passProps, options);
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
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <Separator theme={theme}/>
                <Mute
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    userId={currentUserId}
                    theme={theme}
                />
                <Separator theme={theme}/>
                <IgnoreMentions
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <Separator theme={theme}/>
                {!isDirectMessage &&
                <NotificationPreference
                    isLandscape={isLandscape}
                    theme={theme}
                />
                }
                <Separator theme={theme}/>
                <Pinned
                    channelId={currentChannel.id}
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <ManageMembers
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <AddMembers
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <ConvertPrivate
                    isLandscape={isLandscape}
                    theme={theme}
                />
                <EditChannel
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
            <View style={style.container}>
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
