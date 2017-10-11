// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import deepEqual from 'deep-equal';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity} from 'app/utils/theme';

import {General} from 'mattermost-redux/constants';

import ChannelItem from 'app/components/channel_drawer/channels_list/channel_item';
import UnreadIndicator from 'app/components/channel_drawer/channels_list/unread_indicator';

class List extends Component {
    static propTypes = {
        canCreatePrivateChannels: PropTypes.bool.isRequired,
        channels: PropTypes.object.isRequired,
        channelMembers: PropTypes.object,
        currentChannel: PropTypes.object,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        onSelectChannel: PropTypes.func.isRequired,
        styles: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentChannel: {}
    };

    constructor(props) {
        super(props);
        this.firstUnreadChannel = null;
        this.state = {
            dataSource: this.buildData(props),
            showAbove: false
        };

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !deepEqual(this.props, nextProps, {strict: true}) || !deepEqual(this.state, nextState, {strict: true});
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            dataSource: this.buildData(nextProps)
        }, () => {
            if (this.refs.list) {
                this.refs.list.recordInteraction();
                this.updateUnreadIndicators({
                    viewableItems: Array.from(this.refs.list._listRef._viewabilityHelper._viewableItems.values()) //eslint-disable-line
                });
            }
        });
    }

    updateUnreadIndicators = ({viewableItems}) => {
        let showAbove = false;
        const visibleIndexes = viewableItems.map((v) => v.index);

        if (visibleIndexes.length) {
            const {dataSource} = this.state;
            const firstVisible = parseInt(visibleIndexes[0], 10);

            if (this.firstUnreadChannel) {
                const index = dataSource.findIndex((item) => {
                    return item.display_name === this.firstUnreadChannel;
                });
                showAbove = index < firstVisible;
            }

            this.setState({
                showAbove
            });
        }
    };

    onSelectChannel = (channel) => {
        this.props.onSelectChannel(channel);
    };

    onLayout = (event) => {
        const {width} = event.nativeEvent.layout;
        this.width = width;
    };

    getUnreadMessages = (channel) => {
        const member = this.props.channelMembers[channel.id];
        let mentions = 0;
        let unreadCount = 0;
        if (member && channel) {
            mentions = member.mention_count;
            unreadCount = channel.total_msg_count - member.msg_count;

            if (member.notify_props && member.notify_props.mark_unread === General.MENTION) {
                unreadCount = 0;
            }
        }

        return {
            mentions,
            unreadCount
        };
    };

    findUnreadChannels = (data) => {
        data.forEach((c) => {
            if (c.id) {
                const {mentions, unreadCount} = this.getUnreadMessages(c);
                const unread = (mentions + unreadCount) > 0;

                if (unread && c.id !== this.props.currentChannel.id) {
                    if (!this.firstUnreadChannel) {
                        this.firstUnreadChannel = c.display_name;
                    }
                }
            }
        });
    };

    createChannelElement = (channel) => {
        const {mentions, unreadCount} = this.getUnreadMessages(channel);
        const msgCount = mentions + unreadCount;
        const unread = msgCount > 0;

        return (
            <ChannelItem
                ref={channel.id}
                channel={channel}
                hasUnread={unread}
                mentions={mentions}
                onSelectChannel={this.onSelectChannel}
                isActive={channel.isCurrent}
                theme={this.props.theme}
            />
        );
    };

    createPrivateChannel = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'CreateChannel',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'mobile.create_channel.private', defaultMessage: 'New Private Channel'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                channelType: General.PRIVATE_CHANNEL,
                closeButton: this.closeButton
            }
        });
    });

    buildChannels = (props) => {
        const {canCreatePrivateChannels, styles} = props;
        const {
            unreadChannels,
            favoriteChannels,
            publicChannels,
            privateChannels,
            directAndGroupChannels
        } = props.channels;

        const data = [];

        if (unreadChannels.length) {
            data.push(
                this.renderTitle(styles, 'mobile.channel_list.unreads', 'UNREADS', null, false, true),
                ...unreadChannels
            );
        }

        if (favoriteChannels.length) {
            data.push(
                this.renderTitle(styles, 'sidebar.favorite', 'FAVORITES', null, unreadChannels.length > 0, true),
                ...favoriteChannels
            );
        }

        data.push(
            this.renderTitle(styles, 'sidebar.channels', 'CHANNELS', this.showMoreChannelsModal, favoriteChannels.length > 0, publicChannels.length > 0),
            ...publicChannels
        );

        let createPrivateChannel;
        if (canCreatePrivateChannels) {
            createPrivateChannel = this.createPrivateChannel;
        }
        data.push(
            this.renderTitle(styles, 'sidebar.pg', 'PRIVATE CHANNELS', createPrivateChannel, true, privateChannels.length > 0),
            ...privateChannels
        );

        data.push(
            this.renderTitle(styles, 'sidebar.direct', 'DIRECT MESSAGES', this.showDirectMessagesModal, true, directAndGroupChannels.length > 0),
            ...directAndGroupChannels
        );

        return data;
    };

    buildData = (props) => {
        if (!props.currentChannel) {
            return null;
        }

        const data = this.buildChannels(props);
        this.firstUnreadChannel = null;
        this.findUnreadChannels(data);

        return data;
    };

    scrollToTop = () => {
        this.refs.list.scrollToOffset({
            x: 0,
            y: 0,
            animated: true
        });
    }

    showDirectMessagesModal = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'MoreDirectMessages',
            title: intl.formatMessage({id: 'mobile.more_dms.title', defaultMessage: 'New Conversation'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-dms',
                    icon: this.closeButton
                }]
            }
        });
    });

    showMoreChannelsModal = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'MoreChannels',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'more_channels.title', defaultMessage: 'More Channels'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                closeButton: this.closeButton
            }
        });
    });

    renderSectionAction = (styles, action) => {
        const {theme} = this.props;
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={action}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            >
                <MaterialIcon
                    name='add'
                    style={styles.action}
                />
            </TouchableHighlight>
        );
    };

    renderDivider = (styles, marginLeft) => {
        return (
            <View
                style={[styles.divider, {marginLeft}]}
            />
        );
    };

    renderItem = ({item}) => {
        if (!item.isTitle) {
            return this.createChannelElement(item);
        }
        return item.title;
    };

    renderTitle = (styles, id, defaultMessage, action, topDivider, bottomDivider) => {
        const {formatMessage} = this.props.intl;

        return {
            id,
            isTitle: true,
            title: (
                <View>
                    {topDivider && this.renderDivider(styles, 0)}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>
                            {formatMessage({id, defaultMessage}).toUpperCase()}
                        </Text>
                        {action && this.renderSectionAction(styles, action)}
                    </View>
                    {bottomDivider && this.renderDivider(styles, 0)}
                </View>
            )
        };
    };

    render() {
        const {styles} = this.props;

        const {dataSource, showAbove} = this.state;

        let above;
        if (showAbove) {
            above = (
                <UnreadIndicator
                    style={[styles.above, {width: (this.width - 40)}]}
                    onPress={this.scrollToTop}
                    text={(
                        <FormattedText
                            style={styles.indicatorText}
                            id='sidebar.unreadAbove'
                            defaultMessage='Unread post(s) above'
                        />
                    )}
                />
            );
        }

        return (
            <View
                style={styles.container}
                onLayout={this.onLayout}
            >
                <FlatList
                    ref='list'
                    data={dataSource}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={this.updateUnreadIndicators}
                    keyboardDismissMode='on-drag'
                    maxToRenderPerBatch={10}
                    viewabilityConfig={{
                        viewAreaCoveragePercentThreshold: 3,
                        waitForInteraction: false
                    }}
                />
                {above}
            </View>
        );
    }
}

export default injectIntl(List);
