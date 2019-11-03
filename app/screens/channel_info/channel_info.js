// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    Dimensions,
    ScrollView,
    View,
} from 'react-native';

import {General, Users} from 'mattermost-redux/constants';

import StatusBar from 'app/components/status_bar';
import {getChannelDisplayName, isOwnDirectMessage} from 'app/realm/utils/channel';
import {preventDoubleTap} from 'app/utils/tap';
import {alertErrorWithFallback} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import {goToScreen, popTopScreen, showModalOverCurrentContext} from 'app/actions/navigation';

import pinIcon from 'assets/images/channel_info/pin.png';

import ChannelInfoHeader from './channel_info_header';
import ChannelInfoRow from './channel_info_row';

export default class ChannelInfo extends PureComponent {
    static propTypes = {
        canDeleteChannel: PropTypes.bool.isRequired,
        canEditChannel: PropTypes.bool.isRequired,
        canConvertChannel: PropTypes.bool.isRequired,
        canManageUsers: PropTypes.bool.isRequired,
        closeDirectChannel: PropTypes.func.isRequired,
        componentId: PropTypes.string.isRequired,
        convertChannelToPrivate: PropTypes.func.isRequired,
        currentChannel: PropTypes.object,
        currentChannelGuestCount: PropTypes.number,
        currentChannelCreatorName: PropTypes.string,
        currentChannelMemberCount: PropTypes.number,
        currentChannelPinnedPostCount: PropTypes.number,
        currentUserId: PropTypes.string,
        currentUserIsGuest: PropTypes.bool.isRequired,
        deleteChannel: PropTypes.func.isRequired,
        getChannel: PropTypes.func.isRequired,
        getChannelStats: PropTypes.func.isRequired,
        getCustomEmojisInText: PropTypes.func.isRequired,
        handleSelectChannel: PropTypes.func.isRequired,
        ignoreChannelMentions: PropTypes.bool.isRequired,
        isBot: PropTypes.bool.isRequired,
        isChannelMuted: PropTypes.bool.isRequired,
        isFavorite: PropTypes.bool.isRequired,
        isTeammateGuest: PropTypes.bool.isRequired,
        leaveChannel: PropTypes.func.isRequired,
        loadChannelsByTeamName: PropTypes.func.isRequired,
        locale: PropTypes.string,
        markChannelAsFavorite: PropTypes.func.isRequired,
        selectInitialChannel: PropTypes.func.isRequired,
        status: PropTypes.string,
        teammateDisplayNameSettings: PropTypes.string,
        theme: PropTypes.object.isRequired,
        updateChannelNotifyProps: PropTypes.func.isRequired,
        viewArchivedChannels: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        currentChannelGuestCount: 0,
        currentChannelMemberCount: 0,
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static getDerivedStateFromProps(props, state) {
        if (state.isFavorite !== props.isFavorite ||
            state.isMuted !== props.isChannelMuted ||
            state.ignoreChannelMentions !== props.ignoreChannelMentions) {
            return {
                isFavorite: props.isFavorite,
                isMuted: props.isChannelMuted,
                ignoreChannelMentions: props.ignoreChannelMentions,
            };
        }

        return null;
    }

    constructor(props) {
        super(props);

        this.state = {
            isFavorite: props.isFavorite,
            isMuted: props.isChannelMuted,
            ignoreChannelMentions: props.ignoreChannelMentions,
        };
    }

    componentDidMount() {
        this.props.getChannelStats(this.props.currentChannel.id);
        this.props.getCustomEmojisInText(this.props.currentChannel.header);
    }

    componentDidUpdate(prevProps) {
        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.componentId, this.props.theme);
        }
    }

    goToChannelAddMembers = preventDoubleTap(() => {
        const {intl} = this.context;
        const screen = 'ChannelAddMembers';
        const title = intl.formatMessage({id: 'channel_header.addMembers', defaultMessage: 'Add Members'});

        goToScreen(screen, title);
    });

    goToChannelMembers = preventDoubleTap(() => {
        const {canManageUsers} = this.props;
        const {intl} = this.context;
        const id = canManageUsers ? t('channel_header.manageMembers') : t('channel_header.viewMembers');
        const defaultMessage = canManageUsers ? 'Manage Members' : 'View Members';
        const screen = 'ChannelMembers';
        const title = intl.formatMessage({id, defaultMessage});

        goToScreen(screen, title);
    });

    goToPinnedPosts = preventDoubleTap(() => {
        const {currentChannel} = this.props;
        const {formatMessage} = this.context.intl;
        const id = t('channel_header.pinnedPosts');
        const defaultMessage = 'Pinned Posts';
        const screen = 'PinnedPosts';
        const title = formatMessage({id, defaultMessage});
        const passProps = {
            currentChannelId: currentChannel.id,
        };

        goToScreen(screen, title, passProps);
    });

    handleArchive = () => {
        this.handleArchiveOrLeave('archive');
    };

    handleArchiveError = (error) => {
        const {currentChannel, currentUserId, locale, teammateDisplayNameSettings} = this.props;
        alertErrorWithFallback(
            this.context.intl,
            error,
            {
                id: t('mobile.channel_info.delete_failed'),
                defaultMessage: "We couldn't archive the channel {displayName}. Please check your connection and try again.",
            },
            {
                displayName: getChannelDisplayName(currentChannel, currentUserId, locale, teammateDisplayNameSettings),
            }
        );
        if (error.server_error_id === 'api.channel.delete_channel.deleted.app_error') {
            this.props.getChannel(currentChannel.id);
        }
    };

    handleArchiveOrLeave = preventDoubleTap((eventType) => {
        const {formatMessage} = this.context.intl;
        const {currentChannel, currentUserId, locale, teammateDisplayNameSettings} = this.props;
        let term;
        let title;
        let message;
        let onPressAction;

        if (currentChannel.type === General.OPEN_CHANNEL) {
            term = formatMessage({id: 'mobile.channel_info.publicChannel', defaultMessage: 'Public Channel'});
        } else {
            term = formatMessage({id: 'mobile.channel_info.privateChannel', defaultMessage: 'Private Channel'});
        }

        if (eventType === 'leave') {
            title = {id: t('mobile.channel_info.alertTitleLeaveChannel'), defaultMessage: 'Leave {term}'};
            message = {
                id: t('mobile.channel_info.alertMessageLeaveChannel'),
                defaultMessage: 'Are you sure you want to leave the {term} {name}?',
            };
            onPressAction = () => {
                this.props.leaveChannel(currentChannel, true).then(() => {
                    popTopScreen();
                });
            };
        } else if (eventType === 'archive') {
            title = {id: t('mobile.channel_info.alertTitleDeleteChannel'), defaultMessage: 'Archive {term}'};
            message = {
                id: t('mobile.channel_info.alertMessageDeleteChannel'),
                defaultMessage: 'Are you sure you want to archive the {term} {name}?',
            };
            onPressAction = async () => {
                const result = await this.props.deleteChannel(currentChannel.id);
                if (result.error) {
                    this.handleArchiveError(result.error);
                } else if (this.props.viewArchivedChannels) {
                    this.props.handleSelectChannel(currentChannel.id);
                    popTopScreen();
                } else {
                    this.props.selectInitialChannel(currentChannel.team.id, 1);
                    popTopScreen();
                }
            };
        }

        Alert.alert(
            formatMessage(title, {term}),
            formatMessage(
                message,
                {
                    term: term.toLowerCase(),
                    name: getChannelDisplayName(currentChannel, currentUserId, locale, teammateDisplayNameSettings),
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

    handleCloseDirectMessage = preventDoubleTap(() => {
        const {closeDirectChannel, currentChannel} = this.props;
        closeDirectChannel(currentChannel);
        popTopScreen();
    });

    handleClosePermalink = () => {
        this.showingPermalink = false;
    };

    handleConfirmConvertToPrivate = preventDoubleTap(async () => {
        const {convertChannelToPrivate, currentChannel, currentUserId, locale, teammateDisplayNameSettings} = this.props;
        const result = await convertChannelToPrivate(currentChannel.id);
        const displayName = {displayName: getChannelDisplayName(currentChannel, currentUserId, locale, teammateDisplayNameSettings)};
        const {formatMessage} = this.context.intl;
        if (result.error) {
            alertErrorWithFallback(
                this.context.intl,
                result.error,
                {
                    id: t('mobile.channel_info.convert_failed'),
                    defaultMessage: 'We were unable to convert {displayName} to a private channel.',
                },
                {
                    displayName,
                },
                [{
                    text: formatMessage({id: 'mobile.share_extension.error_close', defaultMessage: 'Close'}),
                }, {
                    text: formatMessage({id: 'mobile.terms_of_service.alert_retry', defaultMessage: 'Try Again'}),
                    onPress: this.handleConfirmConvertToPrivate,
                }]
            );
        } else {
            Alert.alert(
                '',
                formatMessage({id: t('mobile.channel_info.convert_success'), defaultMessage: '{displayName} is now a private channel.'}, displayName),
            );
        }
    });

    handleConvertToPrivate = preventDoubleTap(() => {
        const {currentChannel, currentUserId, locale, teammateDisplayNameSettings} = this.props;
        const {formatMessage} = this.context.intl;
        const displayName = {displayName: getChannelDisplayName(currentChannel, currentUserId, locale, teammateDisplayNameSettings)};
        const title = {id: t('mobile.channel_info.alertTitleConvertChannel'), defaultMessage: 'Convert {displayName} to a private channel?'};
        const message = {
            id: t('mobile.channel_info.alertMessageConvertChannel'),
            defaultMessage: 'When you convert {displayName} to a private channel, history and membership are preserved. Publicly shared files remain accessible to anyone with the link. Membership in a private channel is by invitation only.\n\nThe change is permanent and cannot be undone.\n\nAre you sure you want to convert {displayName} to a private channel?',
        };

        Alert.alert(
            formatMessage(title, displayName),
            formatMessage(message, displayName),
            [{
                text: formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'}),
            }, {
                text: formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
                onPress: this.handleConfirmConvertToPrivate,
            }],
        );
    });

    handleEditChannel = preventDoubleTap(() => {
        const {intl} = this.context;
        const id = t('mobile.channel_info.edit');
        const defaultMessage = 'Edit Channel';
        const screen = 'EditChannel';
        const title = intl.formatMessage({id, defaultMessage});

        goToScreen(screen, title);
    });

    handleFavorite = preventDoubleTap(async () => {
        const {markChannelAsFavorite, currentChannel, isFavorite} = this.props;
        const result = await markChannelAsFavorite(currentChannel.id, !isFavorite);

        if (!result.error) {
            this.setState({isFavorite: !isFavorite});
        }
    });

    handleIgnoreChannelMentions = preventDoubleTap(() => {
        const {currentChannel, currentUserId, ignoreChannelMentions, updateChannelNotifyProps} = this.props;
        const opts = {
            ignore_channel_mentions: ignoreChannelMentions ? Users.IGNORE_CHANNEL_MENTIONS_OFF : Users.IGNORE_CHANNEL_MENTIONS_ON,
        };

        this.setState({ignoreChannelMentions: !ignoreChannelMentions});
        updateChannelNotifyProps(currentUserId, currentChannel.id, opts);
    });

    handleLeave = () => {
        this.handleArchiveOrLeave('leave');
    };

    handleMuteChannel = preventDoubleTap(() => {
        const {currentChannel, currentUserId, isChannelMuted, updateChannelNotifyProps} = this.props;
        const opts = {
            mark_unread: isChannelMuted ? 'all' : 'mention',
        };

        this.setState({isMuted: !isChannelMuted});
        updateChannelNotifyProps(currentUserId, currentChannel.id, opts);
    });

    handlePermalinkPress = (postId, teamName) => {
        this.props.loadChannelsByTeamName(teamName);
        this.showPermalinkView(postId);
    };

    renderActions = (style, channelIsArchived, isLandscape) => {
        const {
            currentChannelMemberCount,
            currentChannelPinnedPostCount,
            canManageUsers,
            canEditChannel,
            theme,
            currentChannel,
        } = this.props;

        if (channelIsArchived) {
            return (this.shouldRenderViewOrManageMembersRow() &&
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
                    detail={currentChannelPinnedPostCount}
                    image={pinIcon}
                    textId={t('channel_header.pinnedPosts')}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                {this.shouldRenderViewOrManageMembersRow() &&
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
                {this.shouldRenderConvertToPrivateRow() && (
                    <React.Fragment>
                        <View style={style.separator}/>
                        <ChannelInfoRow
                            action={this.handleConvertToPrivate}
                            defaultMessage='Convert to Private Channel'
                            icon='lock'
                            textId={t('mobile.channel_info.convert')}
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                    </React.Fragment>
                )}
                {canEditChannel && (
                    <React.Fragment>
                        <View style={style.separator}/>
                        <ChannelInfoRow
                            action={this.handleEditChannel}
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

    showPermalinkView = (postId) => {
        const screen = 'Permalink';
        const passProps = {
            isPermalink: true,
            onClose: this.handleClosePermalink,
            postId,
        };
        const options = {
            layout: {
                backgroundColor: changeOpacity('#000', 0.2),
            },
        };

        this.showingPermalink = true;
        showModalOverCurrentContext(screen, passProps, options);
    };

    shouldRenderArchiveOrLeaveChannelRow = () => {
        const channel = this.props.currentChannel;
        const isGuest = this.props.currentUserIsGuest;
        const isDefaultChannel = channel.name === General.DEFAULT_CHANNEL;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;
        const channelIsArchived = channel.deleteAt > 0;

        return ((!isDefaultChannel && !isDirectMessage && !isGroupMessage) || (isDefaultChannel && isGuest)) && !channelIsArchived;
    };

    shouldRenderCloseDirectMessage = () => {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return isDirectMessage || isGroupMessage;
    };

    shouldRenderConvertToPrivateRow = () => {
        const {currentChannel, canConvertChannel} = this.props;
        const isDefaultChannel = currentChannel.name === General.DEFAULT_CHANNEL;
        const isPublicChannel = currentChannel.type === General.OPEN_CHANNEL;
        return !isDefaultChannel && isPublicChannel && canConvertChannel;
    }

    shouldRenderViewOrManageMembersRow = () => {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;

        return !isDirectMessage;
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {
            canDeleteChannel,
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            currentChannelGuestCount,
            currentUserId,
            locale,
            isBot,
            isTeammateGuest,
            status,
            teammateDisplayNameSettings,
            theme,
        } = this.props;

        const style = getStyleSheet(theme);
        const channelIsArchived = currentChannel.deleteAt !== 0;
        const {width, height} = Dimensions.get('window');
        const isLandscape = width > height;
        let displayName = getChannelDisplayName(currentChannel, currentUserId, locale, teammateDisplayNameSettings);

        let i18nId;
        let defaultMessage;
        switch (currentChannel.type) {
        case General.DM_CHANNEL:
            i18nId = t('mobile.channel_list.closeDM');
            defaultMessage = 'Close Direct Message';

            if (isOwnDirectMessage(currentChannel, currentUserId)) {
                displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayname} (you)'}, {displayname: displayName});
            }
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
                        createAt={currentChannel.createAt}
                        creator={currentChannelCreatorName}
                        displayName={displayName}
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
                        isGroupConstrained={currentChannel.groupConstrained}
                        isLandscape={isLandscape}
                    />
                    }
                    <View style={style.rowsContainer}>
                        {this.renderActions(style, channelIsArchived, isLandscape)}
                        {this.shouldRenderArchiveOrLeaveChannelRow() &&
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
                    {this.shouldRenderArchiveOrLeaveChannelRow() && canDeleteChannel &&
                    <View style={[style.rowsContainer, style.footer]}>
                        <ChannelInfoRow
                            action={this.handleArchive}
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
                    {this.shouldRenderCloseDirectMessage() &&
                    <View style={[style.rowsContainer, style.footer]}>
                        <ChannelInfoRow
                            action={this.handleCloseDirectMessage}
                            defaultMessage={defaultMessage}
                            icon='times'
                            iconColor='#CA3B27'
                            rightArrow={false}
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
