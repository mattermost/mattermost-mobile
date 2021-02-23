// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableHighlight,
    Text,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import {General} from '@mm-redux/constants';
import Badge from 'app/components/badge';
import ChannelIcon from 'app/components/channel_icon';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelItem extends PureComponent {
    static propTypes = {
        testID: PropTypes.string,
        channelId: PropTypes.string.isRequired,
        channel: PropTypes.object,
        currentChannelId: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        isArchived: PropTypes.bool,
        isChannelMuted: PropTypes.bool,
        isManualUnread: PropTypes.bool,
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
    };

    static defaultProps = {
        isArchived: false,
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

    showChannelAsUnread = () => {
        return this.props.mentions > 0 || (this.props.unreadMsgs > 0 && this.props.showUnreadForMsgs);
    };

    render() {
        const {
            testID,
            channelId,
            currentChannelId,
            displayName,
            isArchived,
            isChannelMuted,
            isManualUnread,
            currentUserId,
            isUnread,
            hasDraft,
            mentions,
            shouldHideChannel,
            theme,
            isSearchResult,
            channel,
            isBot,
        } = this.props;

        // Only ever show an archived channel if it's the currently viewed channel.
        // It should disappear as soon as one navigates to another channel.
        if (isArchived && (currentChannelId !== channelId) && !isSearchResult) {
            return null;
        }

        if (!this.showChannelAsUnread() && shouldHideChannel) {
            return null;
        }

        if (!displayName) {
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
                defaultMessage: '{displayname} (you)',
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
            extraTextStyle = isManualUnread ? style.textUnread : style.textActive;

            extraBorder = (
                <View style={style.borderActive}/>
            );
        } else if (isUnread) {
            extraTextStyle = style.textUnread;
        }

        let badge;
        if (mentions) {
            const badgeTestID = `${testID}.badge`;

            badge = (
                <Badge
                    testID={badgeTestID}
                    containerStyle={style.badgeContainer}
                    style={style.badge}
                    countStyle={style.mention}
                    count={mentions}
                    onPress={this.onPress}
                    minWidth={21}
                    isChannelItem={true}
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
                testID={`${testID}.channel_icon`}
            />
        );

        const itemTestID = `${testID}.${channelId}`;
        const displayNameTestID = `${testID}.display_name`;

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
            >
                <View
                    testID={testID}
                    style={[style.container, mutedStyle]}
                >
                    {extraBorder}
                    <View
                        testID={itemTestID}
                        style={[style.item, extraItemStyle]}
                    >
                        {icon}
                        <Text
                            testID={displayNameTestID}
                            style={[style.text, extraTextStyle]}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {channelDisplayName}
                        </Text>
                        {badge}
                    </View>
                </View>
            </TouchableHighlight>
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
            maxWidth: '80%',
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
            fontWeight: 'bold',
        },
        muted: {
            opacity: 0.5,
        },
    };
});
