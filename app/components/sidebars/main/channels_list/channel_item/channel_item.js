// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    TouchableHighlight,
    Text,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import {Navigation} from 'react-native-navigation';
import memoize from 'memoize-one';

import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import Badge from 'app/components/badge';
import ChannelIcon from 'app/components/channel_icon';
import {General} from 'app/constants';

import {getChannelDisplayName, isChannelMuted, isOwnDirectMessage} from 'app/realm/utils/channel';
import {displayUserName, isSystemAdmin} from 'app/realm/utils/user';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const {View: AnimatedView} = Animated;

export default class ChannelItem extends PureComponent {
    static propTypes = {
        channel: PropTypes.object,
        channelId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        experimentalHideTownSquare: PropTypes.string,
        fake: PropTypes.bool,
        isChannelMuted: PropTypes.bool,
        isFavorite: PropTypes.bool,
        isLandscape: PropTypes.bool.isRequired,
        isSearchResult: PropTypes.bool,
        isUnread: PropTypes.bool,
        hasDraft: PropTypes.bool,
        locale: PropTypes.string,
        onSelectChannel: PropTypes.func.isRequired,
        previewChannel: PropTypes.func,
        teammateDisplayNameSettings: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        mentions: 0,
    };

    static contextTypes = {
        intl: intlShape,
    };

    getDisplayName = memoize(
        (channel, currentUserId, locale, teammateDisplayNameSettings) => {
            let displayName = '';
            if (this.props.fake) {
                displayName = displayUserName(channel, locale, teammateDisplayNameSettings);
            } else if (channel.type === General.DM_CHANNEL && isOwnDirectMessage(channel, currentUserId)) {
                displayName = getChannelDisplayName(channel, '', locale, teammateDisplayNameSettings);
            } else {
                displayName = getChannelDisplayName(channel, currentUserId, locale, teammateDisplayNameSettings);
            }

            return displayName;
        }
    );

    getMemberCount = () => {
        const {channel} = this.props;

        switch (channel.type) {
        case General.DM_CHANNEL:
            return 1;
        case General.GM_CHANNEL:
            return channel?.members?.length - 1;
        default:
            return channel?.members?.length;
        }
    };

    getMentions = () => {
        const {channel, currentUserId} = this.props;
        const member = this.getMyChannelMember(channel, currentUserId);

        return member?.mentionCount || 0;
    };

    getMyChannelMember = memoize(
        (channel, currentUserId) => channel?.members?.filtered('user.id = $0', currentUserId)[0],
    );

    getTeammate = memoize(
        (channel, currentUserId) => channel?.members?.filtered('user.id != $0', currentUserId)[0],
    );

    getTeammateStatus = () => {
        const {channel, currentUserId} = this.props;
        if (channel.type !== General.DM_CHANNEL) {
            return null;
        }

        const teammate = this.getTeammate(channel, currentUserId);

        return teammate?.status || 'offline';
    };

    isBot = () => {
        // TODO: Determine if is bot from a search Result
        const {channel, currentUserId} = this.props;
        const teammate = this.getTeammate(channel, currentUserId);

        return teammate?.isBot || false;
    };

    onPress = preventDoubleTap(() => {
        const {channelId, currentChannelId, currentUserId, fake, onSelectChannel, channel, locale, teammateDisplayNameSettings} = this.props;
        const type = channel.type || General.DM_CHANNEL;
        const displayName = this.getDisplayName(channel, currentUserId, locale, teammateDisplayNameSettings);

        requestAnimationFrame(() => {
            onSelectChannel({id: channelId, displayName, fake, type}, currentChannelId);
        });
    });

    onPreview = ({reactTag}) => {
        const {channelId, previewChannel} = this.props;
        if (previewChannel) {
            const {intl} = this.context;
            const passProps = {
                channelId,
            };
            const options = {
                preview: {
                    reactTag,
                    actions: [{
                        id: 'action-mark-as-read',
                        title: intl.formatMessage({id: 'mobile.channel.markAsRead', defaultMessage: 'Mark As Read'}),
                    }],
                },
            };

            previewChannel(passProps, options);
        }
    };

    showChannelAsUnread = () => {
        const {channel, currentUserId} = this.props;
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

    shouldHideChannel = () => {
        const {
            channel,
            currentChannelId,
            currentUserId,
            experimentalHideTownSquare,
            isFavorite,
            isSearchResult,
        } = this.props;
        const myMember = this.getMyChannelMember(channel, currentUserId);
        const isAdmin = isSystemAdmin(myMember?.user);

        return (
            channel?.name === General.DEFAULT_CHANNEL &&
            channel.id !== currentChannelId &&
            isAdmin && !isFavorite && !isSearchResult &&
            experimentalHideTownSquare === 'true'
        );
    };

    render() {
        const {
            channel,
            channelId,
            currentChannelId,
            currentUserId,
            fake,
            isUnread,
            hasDraft,
            locale,
            theme,
            isSearchResult,
            isLandscape,
            teammateDisplayNameSettings,
        } = this.props;

        if (!channel) {
            return null;
        }

        const isArchived = channel.deleteAt > 0;

        // Only ever show an archived channel if it's the currently viewed channel.
        // It should disappear as soon as one navigates to another channel.
        if (isArchived && (currentChannelId !== channelId) && !isSearchResult) {
            return null;
        }

        if (!this.showChannelAsUnread() && this.shouldHideChannel()) {
            return null;
        }

        const {intl} = this.context;

        let channelDisplayName = this.getDisplayName(channel, currentUserId, locale, teammateDisplayNameSettings);
        let isCurrentUser = false;

        if (channel.type === General.DM_CHANNEL) {
            if (isSearchResult) {
                isCurrentUser = channel.id === currentUserId;
            } else {
                isCurrentUser = isOwnDirectMessage(channel, currentUserId);
            }
        }

        if (isCurrentUser) {
            channelDisplayName = intl.formatMessage({
                id: 'channel_header.directchannel.you',
                defaultMessage: '{displayname} (you)',
            }, {displayname: channelDisplayName});
        }

        const style = getStyleSheet(theme);
        const isActive = channelId === currentChannelId;
        const mentions = this.getMentions();

        let extraItemStyle;
        let extraTextStyle;
        let extraBorder;
        let mutedStyle;

        if (isActive) {
            extraItemStyle = style.itemActive;
            extraTextStyle = style.textActive;

            extraBorder = (
                <View style={style.borderActive}/>
            );
        } else if (isUnread) {
            extraTextStyle = style.textUnread;
        }

        let badge;
        if (mentions) {
            badge = (
                <Badge
                    containerStyle={style.badgeContainer}
                    style={style.badge}
                    countStyle={style.mention}
                    count={mentions}
                    onPress={this.onPress}
                    minWidth={21}
                />
            );
        }

        if (isChannelMuted(this.getMyChannelMember(channel, currentUserId))) {
            mutedStyle = style.muted;
        }

        const icon = (
            <ChannelIcon
                isActive={isActive}
                channelId={channelId}
                isUnread={isUnread}
                hasDraft={hasDraft && !isActive}
                membersCount={this.getMemberCount()}
                size={16}
                status={this.getTeammateStatus()}
                theme={theme}
                type={channel.type || General.DM_CHANNEL}
                isArchived={isArchived}
                isBot={this.isBot()}
            />
        );

        return (
            <AnimatedView>
                <Navigation.TouchablePreview
                    touchableComponent={TouchableHighlight}
                    underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                    onPress={this.onPress}
                    onPressIn={fake ? null : this.onPreview}
                >
                    <View style={[style.container, mutedStyle, padding(isLandscape)]}>
                        {extraBorder}
                        <View style={[style.item, extraItemStyle]}>
                            {icon}
                            <Text
                                style={[style.text, extraTextStyle]}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {channelDisplayName}
                            </Text>
                            {badge}
                        </View>
                    </View>
                </Navigation.TouchablePreview>
            </AnimatedView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 44,
        },
        borderActive: {
            backgroundColor: theme.sidebarTextActiveBorder,
            width: 5,
        },
        item: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            paddingLeft: 16,
        },
        itemActive: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveColor, 0.1),
            paddingLeft: 11,
        },
        text: {
            color: changeOpacity(theme.sidebarText, 0.6),
            fontSize: 16,
            lineHeight: 24,
            paddingRight: 10,
            flex: 1,
            alignSelf: 'center',
            fontFamily: 'Open Sans',
        },
        textActive: {
            color: theme.sidebarTextActiveColor,
        },
        textUnread: {
            color: theme.sidebarUnreadText,
            fontWeight: '500',
        },
        badge: {
            backgroundColor: theme.mentionBg,
            padding: 3,
            position: 'relative',
            height: 21,
        },
        badgeContainer: {
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 14,
            borderWidth: 0,
            right: 0,
            top: 11,
            marginRight: 16,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 12,
        },
        muted: {
            opacity: 0.5,
        },
    };
});
