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

import {General} from 'mattermost-redux/constants';
import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import Badge from 'app/components/badge';
import ChannelIcon from 'app/components/channel_icon';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const {View: AnimatedView} = Animated;

export default class ChannelItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        channel: PropTypes.object,
        currentChannelId: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        isChannelMuted: PropTypes.bool,
        currentUserId: PropTypes.string.isRequired,
        isUnread: PropTypes.bool,
        hasDraft: PropTypes.bool,
        mentions: PropTypes.number.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        shouldHideChannel: PropTypes.bool,
        showUnreadForMsgs: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
        unreadMsgs: PropTypes.number.isRequired,
        isSearchResult: PropTypes.bool,
        isBot: PropTypes.bool.isRequired,
        previewChannel: PropTypes.func,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        mentions: 0,
    };

    static contextTypes = {
        intl: intlShape,
    };

    onPress = preventDoubleTap(() => {
        const {channelId, currentChannelId, displayName, onSelectChannel, channel} = this.props;
        const {type, fake} = channel;
        requestAnimationFrame(() => {
            onSelectChannel({id: channelId, display_name: displayName, fake, type}, currentChannelId);
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
        return this.props.mentions > 0 || (this.props.unreadMsgs > 0 && this.props.showUnreadForMsgs);
    };

    render() {
        const {
            channelId,
            currentChannelId,
            displayName,
            isChannelMuted,
            currentUserId,
            isUnread,
            hasDraft,
            mentions,
            shouldHideChannel,
            theme,
            isSearchResult,
            channel,
            isBot,
            isLandscape,
        } = this.props;

        const isArchived = channel.delete_at > 0;

        // Only ever show an archived channel if it's the currently viewed channel.
        // It should disappear as soon as one navigates to another channel.
        if (isArchived && (currentChannelId !== channelId) && !isSearchResult) {
            return null;
        }

        if (!this.showChannelAsUnread() && shouldHideChannel) {
            return null;
        }

        if (!this.props.displayName) {
            return null;
        }

        const {intl} = this.context;

        let channelDisplayName = displayName;
        let isCurrenUser = false;

        if (channel.type === General.DM_CHANNEL) {
            if (isSearchResult) {
                isCurrenUser = channel.id === currentUserId;
            } else {
                isCurrenUser = channel.teammate_id === currentUserId;
            }
        }
        if (isCurrenUser) {
            channelDisplayName = intl.formatMessage({
                id: 'channel_header.directchannel.you',
                defaultMessage: '{displayName} (you)',
            }, {displayname: displayName});
        }

        const style = getStyleSheet(theme);
        const isActive = channelId === currentChannelId;

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
                    style={style.badge}
                    countStyle={style.mention}
                    count={mentions}
                    onPress={this.onPress}
                />
            );
        }

        if (isChannelMuted) {
            mutedStyle = style.muted;
        }

        const icon = (
            <ChannelIcon
                isActive={isActive}
                channelId={channelId}
                isUnread={isUnread}
                hasDraft={hasDraft && channelId !== currentChannelId}
                membersCount={displayName.split(',').length}
                size={16}
                status={channel.status}
                theme={theme}
                type={channel.type}
                isArchived={isArchived}
                isBot={isBot}
            />
        );

        return (
            <AnimatedView>
                <Navigation.TouchablePreview
                    touchableComponent={TouchableHighlight}
                    underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                    onPress={this.onPress}
                    onPressIn={this.onPreview}
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
            color: changeOpacity(theme.sidebarText, 0.4),
            fontSize: 14,
            fontWeight: '600',
            paddingRight: 10,
            flex: 1,
            alignSelf: 'center',
        },
        textActive: {
            color: theme.sidebarTextActiveColor,
        },
        textUnread: {
            color: theme.sidebarUnreadText,
        },
        badge: {
            backgroundColor: theme.mentionBg,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            padding: 3,
            position: 'relative',
            right: 16,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
        muted: {
            opacity: 0.5,
        },
    };
});
