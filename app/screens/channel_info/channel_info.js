// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    Platform,
    ScrollView,
    View,
} from 'react-native';

import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {alertErrorWithFallback} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelInfoHeader from './channel_info_header';
import ChannelInfoRow from './channel_info_row';

export default class ChannelInfo extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            closeDMChannel: PropTypes.func.isRequired,
            closeGMChannel: PropTypes.func.isRequired,
            deleteChannel: PropTypes.func.isRequired,
            getChannelStats: PropTypes.func.isRequired,
            leaveChannel: PropTypes.func.isRequired,
            loadChannelsByTeamName: PropTypes.func.isRequired,
            favoriteChannel: PropTypes.func.isRequired,
            unfavoriteChannel: PropTypes.func.isRequired,
            getCustomEmojisInText: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
        }),
        canDeleteChannel: PropTypes.bool.isRequired,
        currentChannel: PropTypes.object.isRequired,
        currentChannelCreatorName: PropTypes.string,
        currentChannelMemberCount: PropTypes.number,
        navigator: PropTypes.object,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        isCurrent: PropTypes.bool.isRequired,
        isFavorite: PropTypes.bool.isRequired,
        canManageUsers: PropTypes.bool.isRequired,
        canEditChannel: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            isFavorite: props.isFavorite,
        };
    }

    componentDidMount() {
        this.props.actions.getChannelStats(this.props.currentChannel.id);
        this.props.actions.getCustomEmojisInText(this.props.currentChannel.header);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const isFavorite = nextProps.isFavorite;
        if (isFavorite !== this.state.isFavorite) {
            this.setState({isFavorite});
        }
    }

    close = () => {
        EventEmitter.emit(General.DEFAULT_CHANNEL, '');
        if (Platform.OS === 'android') {
            this.props.navigator.dismissModal({animated: true});
        } else {
            this.props.navigator.pop({animated: true});
        }
    };

    goToChannelAddMembers = preventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, theme} = this.props;
        navigator.push({
            backButtonTitle: '',
            screen: 'ChannelAddMembers',
            title: intl.formatMessage({id: 'channel_header.addMembers', defaultMessage: 'Add Members'}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    goToChannelMembers = preventDoubleTap(() => {
        const {intl} = this.context;
        const {canManageUsers, navigator, theme} = this.props;
        const id = canManageUsers ? 'channel_header.manageMembers' : 'channel_header.viewMembers';
        const defaultMessage = canManageUsers ? 'Manage Members' : 'View Members';

        navigator.push({
            backButtonTitle: '',
            screen: 'ChannelMembers',
            title: intl.formatMessage({id, defaultMessage}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    handleChannelEdit = preventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, theme} = this.props;
        const id = 'mobile.channel_info.edit';
        const defaultMessage = 'Edit Channel';

        navigator.push({
            backButtonTitle: '',
            screen: 'EditChannel',
            title: intl.formatMessage({id, defaultMessage}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
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
            title = {id: 'mobile.channel_info.alertTitleLeaveChannel', defaultMessage: 'Leave {term}'};
            message = {
                id: 'mobile.channel_info.alertMessageLeaveChannel',
                defaultMessage: 'Are you sure you want to leave the {term} {name}?',
            };
            onPressAction = () => {
                this.props.actions.leaveChannel(channel, true).then(() => {
                    this.close();
                });
            };
        } else if (eventType === 'delete') {
            title = {id: 'mobile.channel_info.alertTitleDeleteChannel', defaultMessage: 'Delete {term}'};
            message = {
                id: 'mobile.channel_info.alertMessageDeleteChannel',
                defaultMessage: 'Are you sure you want to delete the {term} {name}?',
            };
            onPressAction = async () => {
                const result = await this.props.actions.deleteChannel(channel.id);
                if (result.error) {
                    alertErrorWithFallback(
                        this.context.intl,
                        result.error,
                        {
                            id: 'mobile.channel_info.delete_failed',
                            defaultMessage: "We couldn't delete the channel {displayName}. Please check your connection and try again.",
                        },
                        {
                            displayName: channel.display_name,
                        }
                    );
                } else {
                    this.close();
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

    handleFavorite = () => {
        const {isFavorite, actions, currentChannel} = this.props;
        const {favoriteChannel, unfavoriteChannel} = actions;
        const toggleFavorite = isFavorite ? unfavoriteChannel : favoriteChannel;
        this.setState({isFavorite: !isFavorite});
        toggleFavorite(currentChannel.id);
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
        const {actions, navigator} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const options = {
                screen: 'Permalink',
                animationType: 'none',
                backButtonTitle: '',
                overrideBackPress: true,
                navigatorStyle: {
                    navBarHidden: true,
                    screenBackgroundColor: changeOpacity('#000', 0.2),
                    modalPresentationStyle: 'overCurrentContext',
                },
                passProps: {
                    isPermalink: true,
                    onClose: this.handleClosePermalink,
                    onPermalinkPress: this.handlePermalinkPress,
                },
            };

            this.showingPermalink = true;
            navigator.showModal(options);
        }
    };

    renderViewOrManageMembersRow = () => {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return !isDirectMessage && !isGroupMessage;
    };

    renderLeaveOrDeleteChannelRow = () => {
        const channel = this.props.currentChannel;
        const isDefaultChannel = channel.name === General.DEFAULT_CHANNEL;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return !isDefaultChannel && !isDirectMessage && !isGroupMessage;
    };

    renderCloseDirect = () => {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return isDirectMessage || isGroupMessage;
    };

    render() {
        const {
            canDeleteChannel,
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            canManageUsers,
            canEditChannel,
            navigator,
            status,
            theme,
        } = this.props;

        const style = getStyleSheet(theme);

        let i18nId;
        let defaultMessage;
        switch (currentChannel.type) {
        case General.DM_CHANNEL:
            i18nId = 'mobile.channel_list.closeDM';
            defaultMessage = 'Close Direct Message';
            break;
        case General.GM_CHANNEL:
            i18nId = 'mobile.channel_list.closeGM';
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
                        navigator={navigator}
                        onPermalinkPress={this.handlePermalinkPress}
                        purpose={currentChannel.purpose}
                        status={status}
                        theme={theme}
                        type={currentChannel.type}
                    />
                    }
                    <View style={style.rowsContainer}>
                        <ChannelInfoRow
                            action={this.handleFavorite}
                            defaultMessage='Favorite'
                            detail={this.state.isFavorite}
                            icon='star-o'
                            textId='mobile.routes.channelInfo.favorite'
                            togglable={true}
                            theme={theme}
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
                            <View>
                                <View style={style.separator}/>
                                <ChannelInfoRow
                                    action={this.goToChannelMembers}
                                    defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                                    detail={currentChannelMemberCount}
                                    icon='users'
                                    textId={canManageUsers ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                                    theme={theme}
                                />
                            </View>
                        }
                        {canManageUsers &&
                            <View>
                                <View style={style.separator}/>
                                <ChannelInfoRow
                                    action={this.goToChannelAddMembers}
                                    defaultMessage='Add Members'
                                    icon='user-plus'
                                    textId='channel_header.addMembers'
                                    theme={theme}
                                />
                            </View>
                        }
                        {canEditChannel && (
                            <View>
                                <View style={style.separator}/>
                                <ChannelInfoRow
                                    action={this.handleChannelEdit}
                                    defaultMessage='Edit Channel'
                                    icon='edit'
                                    textId='mobile.channel_info.edit'
                                    theme={theme}
                                />
                            </View>
                        )}
                        {this.renderLeaveOrDeleteChannelRow() &&
                            <View>
                                <View style={style.separator}/>
                                <ChannelInfoRow
                                    action={this.handleLeave}
                                    defaultMessage='Leave Channel'
                                    icon='sign-out'
                                    textId='navbar.leave'
                                    theme={theme}
                                />
                            </View>
                        }
                    </View>
                    {this.renderLeaveOrDeleteChannelRow() && canDeleteChannel &&
                        <View style={style.footer}>
                            <ChannelInfoRow
                                action={this.handleDelete}
                                defaultMessage='Delete Channel'
                                icon='trash'
                                iconColor='#CA3B27'
                                textId='mobile.routes.channelInfo.delete_channel'
                                textColor='#CA3B27'
                                theme={theme}
                            />
                        </View>
                    }
                    {this.renderCloseDirect() &&
                    <View style={style.footer}>
                        <ChannelInfoRow
                            action={this.handleClose}
                            defaultMessage={defaultMessage}
                            icon='times'
                            iconColor='#CA3B27'
                            textId={i18nId}
                            textColor='#CA3B27'
                            theme={theme}
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
