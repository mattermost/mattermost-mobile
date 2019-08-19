// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    ScrollView,
    View,
} from 'react-native';

import {General, Users} from 'mattermost-redux/constants';

import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {alertErrorWithFallback} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import pinIcon from 'assets/images/channel_info/pin.png';

import ChannelInfoHeader from './channel_info_header';
import ChannelInfoRow from './channel_info_row';

export default class ChannelInfo extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearPinnedPosts: PropTypes.func.isRequired,
            closeDMChannel: PropTypes.func.isRequired,
            closeGMChannel: PropTypes.func.isRequired,
            deleteChannel: PropTypes.func.isRequired,
            getChannelStats: PropTypes.func.isRequired,
            getChannel: PropTypes.func.isRequired,
            leaveChannel: PropTypes.func.isRequired,
            loadChannelsByTeamName: PropTypes.func.isRequired,
            favoriteChannel: PropTypes.func.isRequired,
            unfavoriteChannel: PropTypes.func.isRequired,
            getCustomEmojisInText: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            updateChannelNotifyProps: PropTypes.func.isRequired,
            selectPenultimateChannel: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            popTopScreen: PropTypes.func.isRequired,
            goToScreen: PropTypes.func.isRequired,
            dismissModal: PropTypes.func.isRequired,
            showModalOverCurrentContext: PropTypes.func.isRequired,
        }),
        componentId: PropTypes.string,
        viewArchivedChannels: PropTypes.bool.isRequired,
        canDeleteChannel: PropTypes.bool.isRequired,
        currentChannel: PropTypes.object.isRequired,
        currentChannelCreatorName: PropTypes.string,
        currentChannelMemberCount: PropTypes.number,
        currentChannelGuestCount: PropTypes.number,
        currentUserId: PropTypes.string,
        currentUserIsGuest: PropTypes.bool,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        isChannelMuted: PropTypes.bool.isRequired,
        isCurrent: PropTypes.bool.isRequired,
        isFavorite: PropTypes.bool.isRequired,
        canManageUsers: PropTypes.bool.isRequired,
        canEditChannel: PropTypes.bool.isRequired,
        ignoreChannelMentions: PropTypes.bool.isRequired,
        isBot: PropTypes.bool.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        currentChannelGuestCount: 0,
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            isFavorite: props.isFavorite,
            isMuted: props.isChannelMuted,
            ignoreChannelMentions: props.ignoreChannelMentions,
        };
    }

    componentDidMount() {
        this.props.actions.getChannelStats(this.props.currentChannel.id);
        this.props.actions.getCustomEmojisInText(this.props.currentChannel.header);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }

        let isFavorite = this.state.isFavorite;
        if (isFavorite !== nextProps.isFavorite) {
            isFavorite = nextProps.isFavorite;
        }

        let isMuted = this.state.isMuted;
        if (isMuted !== nextProps.isChannelMuted) {
            isMuted = nextProps.isChannelMuted;
        }

        let ignoreChannelMentions = this.state.ignoreChannelMentions;
        if (ignoreChannelMentions !== nextProps.ignoreChannelMentions) {
            ignoreChannelMentions = nextProps.ignoreChannelMentions;
        }

        this.setState({isFavorite, isMuted, ignoreChannelMentions});
    }

    close = (redirect = true) => {
        const {actions} = this.props;

        if (redirect) {
            actions.setChannelDisplayName('');
        }

        actions.popTopScreen();
    };

    goToChannelAddMembers = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;
        const screen = 'ChannelAddMembers';
        const title = intl.formatMessage({id: 'channel_header.addMembers', defaultMessage: 'Add Members'});

        actions.goToScreen(screen, title);
    });

    goToChannelMembers = preventDoubleTap(() => {
        const {actions, canManageUsers} = this.props;
        const {intl} = this.context;
        const id = canManageUsers ? t('channel_header.manageMembers') : t('channel_header.viewMembers');
        const defaultMessage = canManageUsers ? 'Manage Members' : 'View Members';
        const screen = 'ChannelMembers';
        const title = intl.formatMessage({id, defaultMessage});

        actions.goToScreen(screen, title);
    });

    goToPinnedPosts = preventDoubleTap(() => {
        const {actions, currentChannel} = this.props;
        const {formatMessage} = this.context.intl;
        const id = t('channel_header.pinnedPosts');
        const defaultMessage = 'Pinned Posts';
        const screen = 'PinnedPosts';
        const title = formatMessage({id, defaultMessage});
        const passProps = {
            currentChannelId: currentChannel.id,
        };

        actions.goToScreen(screen, title, passProps);
    });

    handleChannelEdit = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;
        const id = t('mobile.channel_info.edit');
        const defaultMessage = 'Edit Channel';
        const screen = 'EditChannel';
        const title = intl.formatMessage({id, defaultMessage});

        actions.goToScreen(screen, title);
    });

    handleLeave = () => {
        this.handleDeleteOrLeave('leave');
    };

    handleDelete = () => {
        this.handleDeleteOrLeave('delete');
    };

    handleDeleteOrLeave = preventDoubleTap((eventType) => {
        const {formatMessage} = this.context.intl;
        const channel = this.props.currentChannel;
        const term = channel.type === General.OPEN_CHANNEL ?
            formatMessage({id: 'mobile.channel_info.publicChannel', defaultMessage: 'Public Channel'}) :
            formatMessage({id: 'mobile.channel_info.privateChannel', defaultMessage: 'Private Channel'});
        let title;
        let message;
        let onPressAction;
        if (eventType === 'leave') {
            title = {id: t('mobile.channel_info.alertTitleLeaveChannel'), defaultMessage: 'Leave {term}'};
            message = {
                id: t('mobile.channel_info.alertMessageLeaveChannel'),
                defaultMessage: 'Are you sure you want to leave the {term} {name}?',
            };
            onPressAction = () => {
                this.props.actions.leaveChannel(channel, true).then(() => {
                    this.close();
                });
            };
        } else if (eventType === 'delete') {
            title = {id: t('mobile.channel_info.alertTitleDeleteChannel'), defaultMessage: 'Archive {term}'};
            message = {
                id: t('mobile.channel_info.alertMessageDeleteChannel'),
                defaultMessage: 'Are you sure you want to archive the {term} {name}?',
            };
            onPressAction = async () => {
                const result = await this.props.actions.deleteChannel(channel.id);
                if (result.error) {
                    alertErrorWithFallback(
                        this.context.intl,
                        result.error,
                        {
                            id: t('mobile.channel_info.delete_failed'),
                            defaultMessage: "We couldn't archive the channel {displayName}. Please check your connection and try again.",
                        },
                        {
                            displayName: channel.display_name,
                        }
                    );
                    if (result.error.server_error_id === 'api.channel.delete_channel.deleted.app_error') {
                        this.props.actions.getChannel(channel.id);
                    }
                } else if (this.props.viewArchivedChannels) {
                    this.props.actions.handleSelectChannel(channel.id);
                    this.close(false);
                } else {
                    this.props.actions.selectPenultimateChannel(channel.team_id);
                    this.close(false);
                }
            };
        }

        Alert.alert(
            formatMessage(title, {term}),
            formatMessage(
                message,
                {
                    term: term.toLowerCase(),
                    name: channel.display_name,
                }
            ),
            [{
                text: formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'}),
            }, {
                text: formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
                onPress: onPressAction,
            }],
        );
    });

    handleClose = preventDoubleTap(() => {
        const {currentChannel, isCurrent, isFavorite} = this.props;
        const channel = Object.assign({}, currentChannel, {isCurrent}, {isFavorite});
        const {closeDMChannel, closeGMChannel} = this.props.actions;

        switch (channel.type) {
        case General.DM_CHANNEL:
            closeDMChannel(channel).then(() => {
                this.close();
            });
            break;
        case General.GM_CHANNEL:
            closeGMChannel(channel).then(() => {
                this.close();
            });
            break;
        }
    });

    handleFavorite = preventDoubleTap(() => {
        const {isFavorite, actions, currentChannel} = this.props;
        const {favoriteChannel, unfavoriteChannel} = actions;
        const toggleFavorite = isFavorite ? unfavoriteChannel : favoriteChannel;
        this.setState({isFavorite: !isFavorite});
        toggleFavorite(currentChannel.id);
    });

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.loadChannelsByTeamName(teamName);
        this.showPermalinkView(postId);
    };

    handleMuteChannel = preventDoubleTap(() => {
        const {actions, currentChannel, currentUserId, isChannelMuted} = this.props;
        const {updateChannelNotifyProps} = actions;
        const opts = {
            mark_unread: isChannelMuted ? 'all' : 'mention',
        };

        this.setState({isMuted: !isChannelMuted});
        updateChannelNotifyProps(currentUserId, currentChannel.id, opts);
    });

    handleIgnoreChannelMentions = preventDoubleTap(() => {
        const {actions, currentChannel, currentUserId, ignoreChannelMentions} = this.props;
        const {updateChannelNotifyProps} = actions;

        const opts = {
            ignore_channel_mentions: ignoreChannelMentions ? Users.IGNORE_CHANNEL_MENTIONS_OFF : Users.IGNORE_CHANNEL_MENTIONS_ON,
        };

        this.setState({ignoreChannelMentions: !ignoreChannelMentions});
        updateChannelNotifyProps(currentUserId, currentChannel.id, opts);
    });

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
        actions.showModalOverCurrentContext(screen, passProps, options);
    };

    renderViewOrManageMembersRow = () => {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;

        return !isDirectMessage;
    };

    renderLeaveOrDeleteChannelRow = () => {
        const channel = this.props.currentChannel;
        const isGuest = this.props.currentUserIsGuest;
        const isDefaultChannel = channel.name === General.DEFAULT_CHANNEL;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return (!isDefaultChannel && !isDirectMessage && !isGroupMessage) || (isDefaultChannel && isGuest);
    };

    renderCloseDirect = () => {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return isDirectMessage || isGroupMessage;
    };

    actionsRows = (style, channelIsArchived) => {
        const {
            currentChannelMemberCount,
            canManageUsers,
            canEditChannel,
            theme,
            currentChannel,
            isLandscape,
        } = this.props;

        if (channelIsArchived) {
            return (this.renderViewOrManageMembersRow() &&
                <View>
                    <ChannelInfoRow
                        action={this.goToChannelMembers}
                        defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                        detail={currentChannelMemberCount}
                        icon='users'
                        textId={canManageUsers ? t('channel_header.manageMembers') : t('channel_header.viewMembers')}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                    <View style={style.separator}/>
                </View>);
        }

        return (
            <React.Fragment>
                <ChannelInfoRow
                    action={this.handleFavorite}
                    defaultMessage='Favorite'
                    detail={this.state.isFavorite}
                    icon='star-o'
                    textId={t('mobile.routes.channelInfo.favorite')}
                    togglable={true}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                <View style={style.separator}/>
                <ChannelInfoRow
                    action={this.handleMuteChannel}
                    defaultMessage='Mute channel'
                    detail={this.state.isMuted}
                    icon='bell-slash-o'
                    textId={t('channel_notifications.muteChannel.settings')}
                    togglable={true}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                <View style={style.separator}/>
                <ChannelInfoRow
                    action={this.handleIgnoreChannelMentions}
                    defaultMessage='Ignore @channel, @here, @all'
                    detail={this.state.ignoreChannelMentions}
                    icon='at'
                    textId={t('channel_notifications.ignoreChannelMentions.settings')}
                    togglable={true}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                <View style={style.separator}/>
                <ChannelInfoRow
                    action={this.goToPinnedPosts}
                    defaultMessage='Pinned Posts'
                    image={pinIcon}
                    textId={t('channel_header.pinnedPosts')}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                {

                    /**
                     <ChannelInfoRow
                     action={() => true}
                     defaultMessage='Notification Preferences'
                     icon='bell-o'
                     textId='channel_header.notificationPreferences'
                     theme={theme}
                     />
                     <View style={style.separator}/>
                     **/
                }
                {this.renderViewOrManageMembersRow() &&
                <React.Fragment>
                    <View style={style.separator}/>
                    <ChannelInfoRow
                        action={this.goToChannelMembers}
                        defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                        detail={currentChannelMemberCount}
                        icon='users'
                        textId={canManageUsers ? t('channel_header.manageMembers') : t('channel_header.viewMembers')}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                </React.Fragment>
                }
                {canManageUsers && !currentChannel.group_constrained &&
                <React.Fragment>
                    <View style={style.separator}/>
                    <ChannelInfoRow
                        action={this.goToChannelAddMembers}
                        defaultMessage='Add Members'
                        icon='user-plus'
                        textId={t('channel_header.addMembers')}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                </React.Fragment>
                }
                {canEditChannel && (
                    <React.Fragment>
                        <View style={style.separator}/>
                        <ChannelInfoRow
                            action={this.handleChannelEdit}
                            defaultMessage='Edit Channel'
                            icon='edit'
                            textId={t('mobile.channel_info.edit')}
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                    </React.Fragment>
                )}
            </React.Fragment>
        );
    };

    render() {
        const {
            canDeleteChannel,
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            currentChannelGuestCount,
            status,
            theme,
            isBot,
            isLandscape,
            actions: {popToRoot},
        } = this.props;

        const style = getStyleSheet(theme);
        const channelIsArchived = currentChannel.delete_at !== 0;

        let i18nId;
        let defaultMessage;
        switch (currentChannel.type) {
        case General.DM_CHANNEL:
            i18nId = t('mobile.channel_list.closeDM');
            defaultMessage = 'Close Direct Message';
            break;
        case General.GM_CHANNEL:
            i18nId = t('mobile.channel_list.closeGM');
            defaultMessage = 'Close Group Message';
            break;
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                >
                    {currentChannel.hasOwnProperty('id') &&
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
                        isArchived={currentChannel.delete_at !== 0}
                        isBot={isBot}
                        hasGuests={currentChannelGuestCount > 0}
                        isGroupConstrained={currentChannel.group_constrained}
                        popToRoot={popToRoot}
                    />
                    }
                    <View style={style.rowsContainer}>
                        {this.actionsRows(style, channelIsArchived)}
                        {this.renderLeaveOrDeleteChannelRow() &&
                        <React.Fragment>
                            <View style={style.separator}/>
                            <ChannelInfoRow
                                action={this.handleLeave}
                                defaultMessage='Leave Channel'
                                icon='sign-out'
                                textId={t('navbar.leave')}
                                theme={theme}
                                isLandscape={isLandscape}
                            />
                        </React.Fragment>
                        }
                    </View>
                    {this.renderLeaveOrDeleteChannelRow() && canDeleteChannel && !channelIsArchived &&
                    <View style={[style.rowsContainer, style.footer]}>
                        <ChannelInfoRow
                            action={this.handleDelete}
                            defaultMessage='Archive Channel'
                            iconColor='#CA3B27'
                            icon='archive'
                            textId={t('mobile.routes.channelInfo.delete_channel')}
                            textColor='#CA3B27'
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                    </View>
                    }
                    {this.renderCloseDirect() &&
                    <View style={[style.rowsContainer, style.footer]}>
                        <ChannelInfoRow
                            action={this.handleClose}
                            defaultMessage={defaultMessage}
                            icon='times'
                            iconColor='#CA3B27'
                            textId={i18nId}
                            textColor='#CA3B27'
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                    </View>
                    }
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        footer: {
            marginTop: 40,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        rowsContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        separator: {
            marginHorizontal: 15,
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});
