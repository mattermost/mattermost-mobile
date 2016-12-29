// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {ScrollView, StyleSheet, Text, View, findNodeHandle, UIManager} from 'react-native';
import LineDivider from 'app/components/line_divider';
import ChannelItem from './channel_item';
import FormattedText from 'app/components/formatted_text';
import UnreadIndicator from './unread_indicator';

const Styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 20
    },
    scrollContainer: {
        flex: 1
    },
    headerContainer: {
        justifyContent: 'center',
        flexDirection: 'column',
        height: 50,
        width: 300,
        paddingLeft: 10
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    title: {
        paddingTop: 10,
        paddingRight: 10,
        paddingLeft: 10,
        paddingBottom: 5,
        fontSize: 15,
        opacity: 0.6
    },
    indicatorText: {
        paddingVertical: 2,
        paddingHorizontal: 4,
        backgroundColor: 'transparent',
        fontSize: 14,
        textAlign: 'center',
        textAlignVertical: 'center'
    }
});

export default class ChannelList extends React.Component {
    static propTypes = {
        currentTeam: React.PropTypes.object.isRequired,
        currentChannelId: React.PropTypes.string,
        channels: React.PropTypes.object.isRequired,
        channelMembers: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired,
        onSelectChannel: React.PropTypes.func.isRequired,
        onViewChannel: React.PropTypes.func.isRequired,
        closeChannelDrawer: React.PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);

        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;
        this.scrollY = 0;
        this.scrollHeight = 0;
        this.state = {
            showAbove: false,
            showBelow: false
        };
    }

    componentDidUpdate() {
        this.updateUnreadIndicators();
    }

    updateUnreadIndicators = () => {
        if (this.firstUnreadChannel) {
            const handle = findNodeHandle(this.refs[this.firstUnreadChannel]);
            UIManager.measure(handle, (frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
                if ((this.scrollY - (frameHeight / 2)) >= pageY) {
                    this.setState({
                        showAbove: true
                    });
                } else if (this.state.showAbove) {
                    this.setState({
                        showAbove: false
                    });
                }
            });
        }

        if (this.lastUnreadChannel) {
            const handle = findNodeHandle(this.refs[this.lastUnreadChannel]);
            UIManager.measure(handle, (frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
                if (((this.scrollY + this.scrollHeight) - (frameHeight / 2)) <= pageY) {
                    this.setState({
                        showBelow: true
                    });
                } else if (this.state.showBelow) {
                    this.setState({
                        showBelow: false
                    });
                }
            });
        }
    };

    setScrollBounds = () => {
        const scroll = findNodeHandle(this.refs.scrollContainer);
        UIManager.measure(scroll, (frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
            this.scrollHeight = frameHeight;
            this.scrollY = pageY;
        });
    };

    onSelectChannel = (channel) => {
        console.log('clicked channel ' + channel.name); // eslint-disable-line no-console

        const {
            currentChannelId,
            currentTeam
        } = this.props;

        this.props.onSelectChannel(channel.id);
        this.props.onViewChannel(currentTeam.id, channel.id, currentChannelId);
        this.props.closeChannelDrawer();
    };

    createChannelElement = (channel) => {
        const member = this.props.channelMembers[channel.id];
        const mentionsCount = member.mention_count;
        let unreadCount = channel.total_msg_count - member.msg_count;

        if (member.notify_props && member.notify_props.mark_unread === 'mention') {
            unreadCount = 0;
        }

        const msgCount = mentionsCount + unreadCount;
        const unread = msgCount > 0;

        if (unread && channel.id !== this.props.currentChannelId) {
            if (!this.firstUnreadChannel) {
                this.firstUnreadChannel = channel.id;
            }
            this.lastUnreadChannel = channel.id;
        }

        return (
            <ChannelItem
                ref={channel.id}
                key={channel.id}
                channel={channel}
                hasUnread={unread}
                mentions={mentionsCount}
                onSelectChannel={this.onSelectChannel}
                isActive={channel.id === this.props.currentChannelId}
                theme={this.props.theme}
            />
        );
    };

    handleScroll = () => {
        this.updateUnreadIndicators();
    };

    render() {
        if (!this.props.currentChannelId) {
            return <Text>{'Loading'}</Text>;
        }

        const {
            favoriteChannels,
            publicChannels,
            privateChannels,
            directChannels,
            directNonTeamChannels
        } = this.props.channels;

        const {
            theme
        } = this.props;

        // keep track of the first and last unread channels so we can use them to set the unread indicators
        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;

        let favoritesTitle;
        if (favoriteChannels.length) {
            favoritesTitle = (
                <FormattedText
                    style={[Styles.title, {color: theme.sidebarText}]}
                    id='sidebar.favorite'
                    defaultMessage='FAVORITES'
                />
            );
        }

        const favoriteChannelsItems = favoriteChannels.map(this.createChannelElement);

        const publicChannelsItems = publicChannels.map(this.createChannelElement);

        const privateChannelsItems = privateChannels.map(this.createChannelElement);

        const directChannelsItems = directChannels.map(this.createChannelElement);

        const directNonTeamChannelsItems = directNonTeamChannels.map(this.createChannelElement);

        let outsideTeamDivider;
        if (directNonTeamChannels.length) {
            outsideTeamDivider = (
                <LineDivider
                    color={theme.sidebarTextActiveBorder}
                    translationId='sidebar.otherMembers'
                    translationText='Outside this team'
                />
            );
        }

        let above;
        let below;
        if (this.state.showAbove) {
            above = (
                <UnreadIndicator
                    style={{top: 55, backgroundColor: theme.mentionBj}}
                    text={(
                        <FormattedText
                            style={[Styles.indicatorText, {color: theme.mentionColor}]}
                            id='sidebar.unreadAbove'
                            defaultMessage='Unread post(s) above'
                        />
                    )}
                />
            );
        }
        if (this.state.showBelow) {
            below = (
                <UnreadIndicator
                    style={{bottom: 15, backgroundColor: theme.mentionBj}}
                    text={(
                        <FormattedText
                            style={[Styles.indicatorText, {color: theme.mentionColor}]}
                            id='sidebar.unreadBelow'
                            defaultMessage='Unread post(s) below'
                        />
                    )}
                />
            );
        }

        return (
            <View style={[Styles.container, {backgroundColor: theme.sidebarBg}]}>
                <View style={[Styles.headerContainer, {backgroundColor: theme.sidebarHeaderBg}]}>
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={[Styles.header, {color: theme.sidebarHeaderTextColor}]}
                    >
                        {this.props.currentTeam.display_name}
                    </Text>
                </View>
                <ScrollView
                    ref='scrollContainer'
                    onScroll={this.handleScroll}
                    scrollEventThrottle={16}
                    onLayout={this.setScrollBounds}
                    style={Styles.scrollContainer}
                >
                    {favoritesTitle}
                    {favoriteChannelsItems}
                    <FormattedText
                        style={[Styles.title, {color: theme.sidebarText}]}
                        id='sidebar.channels'
                        defaultMessage='CHANNELS'
                    />
                    {publicChannelsItems}
                    <FormattedText
                        style={[Styles.title, {color: theme.sidebarText}]}
                        id='sidebar.pg'
                        defaultMessage='PRIVATE GROUPS'
                    />
                    {privateChannelsItems}
                    <FormattedText
                        style={[Styles.title, {color: theme.sidebarText}]}
                        id='sidebar.direct'
                        defaultMessage='DIRECT MESSAGES'
                    />
                    {directChannelsItems}
                    {outsideTeamDivider}
                    {directNonTeamChannelsItems}
                </ScrollView>
                {above}
                {below}
            </View>
        );
    }
}
