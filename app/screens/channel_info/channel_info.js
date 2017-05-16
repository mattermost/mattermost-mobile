// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    View
} from 'react-native';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {General} from 'mattermost-redux/constants';

import ChannelInfoHeader from './channel_info_header';
import ChannelInfoRow from './channel_info_row';

class ChannelInfo extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
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
        actions: PropTypes.shape({
            closeDMChannel: PropTypes.func.isRequired,
            closeGMChannel: PropTypes.func.isRequired,
            deleteChannel: PropTypes.func.isRequired,
            getChannelStats: PropTypes.func.isRequired,
            leaveChannel: PropTypes.func.isRequired,
            markFavorite: PropTypes.func.isRequired,
            unmarkFavorite: PropTypes.func.isRequired
        })
    };

    constructor(props) {
        super(props);

        this.state = {
            isFavorite: this.props.isFavorite
        };
    }

    componentDidMount() {
        this.props.actions.getChannelStats(this.props.currentChannel.id);
    }

    componentWillReceiveProps(nextProps) {
        const isFavorite = nextProps.isFavorite;
        if (isFavorite !== this.state.isFavorite) {
            this.setState({isFavorite});
        }
    }

    goToChannelAddMembers = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            backButtonTitle: '',
            screen: 'ChannelAddMembers',
            title: intl.formatMessage({id: 'channel_header.addMembers', defaultMessage: 'Add Members'}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    goToChannelMembers = () => {
        const {canManageUsers, intl, navigator, theme} = this.props;
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
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    handleDeleteOrLeave(eventType) {
        const {formatMessage} = this.props.intl;
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
                defaultMessage: 'Are you sure you want to leave the {term} {name}?'
            };
            onPressAction = () => {
                this.props.actions.leaveChannel(channel, true).then(() => {
                    this.props.navigator.pop({animated: true});
                });
            };
        } else if (eventType === 'delete') {
            title = {id: 'mobile.channel_info.alertTitleDeleteChannel', defaultMessage: 'Delete {term}'};
            message = {
                id: 'mobile.channel_info.alertMessageDeleteChannel',
                defaultMessage: 'Are you sure you want to delete the {term} {name}?'
            };
            onPressAction = () => {
                this.props.actions.deleteChannel(channel.id).then(() => {
                    this.props.navigator.pop({animated: true});
                });
            };
        }

        Alert.alert(
            formatMessage(title, {term}),
            formatMessage(
                message,
                {
                    term: term.toLowerCase(),
                    name: channel.display_name
                }
            ),
            [{
                text: formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'})
            }, {
                text: formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
                onPress: onPressAction
            }],
        );
    }

    handleClose = () => {
        const {currentChannel, isCurrent, isFavorite} = this.props;
        const channel = Object.assign({}, currentChannel, {isCurrent}, {isFavorite});
        const {closeDMChannel, closeGMChannel} = this.props.actions;

        switch (channel.type) {
        case General.DM_CHANNEL:
            closeDMChannel(channel).then(() => {
                this.props.navigator.pop({animated: true});
            });
            break;
        case General.GM_CHANNEL:
            closeGMChannel(channel).then(() => {
                this.props.navigator.pop({animated: true});
            });
            break;
        }
    };

    handleFavorite = () => {
        const {isFavorite, actions, currentChannel} = this.props;
        const {markFavorite, unmarkFavorite} = actions;
        const toggleFavorite = isFavorite ? unmarkFavorite : markFavorite;
        this.setState({isFavorite: !isFavorite});
        toggleFavorite(currentChannel.id);
    };

    renderLeaveOrDeleteChannelRow() {
        const channel = this.props.currentChannel;
        const isDefaultChannel = channel.name === General.DEFAULT_CHANNEL;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return !isDefaultChannel && !isDirectMessage && !isGroupMessage;
    }

    renderCloseDirect() {
        const channel = this.props.currentChannel;
        const isDirectMessage = channel.type === General.DM_CHANNEL;
        const isGroupMessage = channel.type === General.GM_CHANNEL;

        return isDirectMessage || isGroupMessage;
    }

    render() {
        const {
            canDeleteChannel,
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            canManageUsers,
            status,
            theme
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
                <StatusBar barStyle='light-content'/>
                <ScrollView
                    style={style.scrollView}
                >
                    <ChannelInfoHeader
                        createAt={currentChannel.create_at}
                        creator={currentChannelCreatorName}
                        memberCount={currentChannelMemberCount}
                        displayName={currentChannel.display_name}
                        header={currentChannel.header}
                        purpose={currentChannel.purpose}
                        status={status}
                        theme={theme}
                        type={currentChannel.type}
                    />
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
                        <View style={style.separator}/>
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
                        <ChannelInfoRow
                            action={() => preventDoubleTap(this.goToChannelMembers)}
                            defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                            detail={currentChannelMemberCount}
                            icon='users'
                            textId={canManageUsers ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                            theme={theme}
                        />
                        {canManageUsers && this.renderLeaveOrDeleteChannelRow() &&
                            <View>
                                <View style={style.separator}/>
                                <ChannelInfoRow
                                    action={() => preventDoubleTap(this.goToChannelAddMembers)}
                                    defaultMessage='Add Members'
                                    icon='user-plus'
                                    textId='channel_header.addMembers'
                                    theme={theme}
                                />
                                <View style={style.separator}/>
                            </View>
                        }
                        <ChannelInfoRow
                            action={() => preventDoubleTap(this.handleDeleteOrLeave, this, 'leave')}
                            defaultMessage='Leave Channel'
                            icon='sign-out'
                            textId='navbar.leave'
                            shouldRender={this.renderLeaveOrDeleteChannelRow()}
                            theme={theme}
                        />
                    </View>
                    {this.renderLeaveOrDeleteChannelRow() && canDeleteChannel &&
                        <View style={style.footer}>
                            <ChannelInfoRow
                                action={() => preventDoubleTap(this.handleDeleteOrLeave, this, 'delete')}
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
                            action={() => preventDoubleTap(this.handleClose, this)}
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
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
        },
        footer: {
            marginTop: 40,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1)
        },
        rowsContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg
        },
        separator: {
            marginHorizontal: 15,
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1)
        }
    });
});

export default injectIntl(ChannelInfo);
