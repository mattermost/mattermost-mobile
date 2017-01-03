// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {StyleSheet, Text, View, ListView} from 'react-native';
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
        this.state = {
            showAbove: false,
            showBelow: false,
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            }).cloneWithRows(props)
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            dataSource: this.state.dataSource.cloneWithRows(this.buildData(nextProps))
        });
        const container = this.refs.scrollContainer;
        if (container && container._visibleRows && container._visibleRows.s1) { //eslint-disable-line no-underscore-dangle
            this.updateUnreadIndicators(container._visibleRows);  //eslint-disable-line no-underscore-dangle
        }
    }

    updateUnreadIndicators = (v) => {
        const data = this.state.dataSource._dataBlob.s1; //eslint-disable-line no-underscore-dangle

        if (this.firstUnreadChannel) {
            const index = data.findIndex((obj) => obj.id === this.firstUnreadChannel);
            if (v.s1[index]) {
                this.setState({
                    showAbove: false
                });
            } else if (!v.s1[index - 1]) {
                this.setState({
                    showAbove: true
                });
            }
        }

        if (this.lastUnreadChannel) {
            const index = data.findIndex((obj) => obj.id === this.lastUnreadChannel);
            if (v.s1[index]) {
                this.setState({
                    showBelow: false
                });
            } else if (!v.s1[index + 1]) {
                this.setState({
                    showBelow: true
                });
            }
        }
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

    getUnreadMessages = (channel) => {
        const member = this.props.channelMembers[channel.id];
        const mentions = member.mention_count;
        let unreadCount = channel.total_msg_count - member.msg_count;

        if (member.notify_props && member.notify_props.mark_unread === 'mention') {
            unreadCount = 0;
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

                if (unread && c.id !== this.props.currentChannelId) {
                    if (this.firstUnreadChannel) {
                        this.lastUnreadChannel = c.id;
                    } else {
                        this.firstUnreadChannel = c.id;
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
                key={channel.id}
                channel={channel}
                hasUnread={unread}
                mentions={mentions}
                onSelectChannel={this.onSelectChannel}
                isActive={channel.id === this.props.currentChannelId}
                theme={this.props.theme}
            />
        );
    };

    buildData = (props) => {
        const data = [];

        if (!props.currentChannelId) {
            return data;
        }

        const {
            theme
        } = props;

        const {
            favoriteChannels,
            publicChannels,
            privateChannels,
            directChannels,
            directNonTeamChannels
        } = props.channels;

        if (favoriteChannels.length) {
            data.push(
                <FormattedText
                    style={[Styles.title, {color: theme.sidebarText}]}
                    id='sidebar.favorite'
                    defaultMessage='FAVORITES'
                />,
                ...favoriteChannels
            );
        }

        data.push(
            <FormattedText
                style={[Styles.title, {color: theme.sidebarText}]}
                id='sidebar.channels'
                defaultMessage='CHANNELS'
            />,
            ...publicChannels
        );
        data.push(
            <FormattedText
                style={[Styles.title, {color: theme.sidebarText}]}
                id='sidebar.pg'
                defaultMessage='PRIVATE GROUPS'
            />,
            ...privateChannels
        );
        data.push(
            <FormattedText
                style={[Styles.title, {color: theme.sidebarText}]}
                id='sidebar.direct'
                defaultMessage='DIRECT MESSAGES'
            />,
            ...directChannels
        );

        if (directNonTeamChannels.length) {
            data.push(
                <LineDivider
                    color={theme.sidebarTextActiveBorder}
                    translationId='sidebar.otherMembers'
                    translationText='Outside this team'
                />,
                ...directNonTeamChannels
            );
        }

        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;
        this.findUnreadChannels(data);

        return data;
    };

    renderRow = (rowData, sectionId, rowId) => {
        if (rowData && rowData.id) {
            return this.createChannelElement(rowData, sectionId, rowId);
        }
        return rowData;
    };

    render() {
        if (!this.props.currentChannelId) {
            return <Text>{'Loading'}</Text>;
        }

        const {
            theme
        } = this.props;

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
                <ListView
                    ref='scrollContainer'
                    style={Styles.scrollContainer}
                    dataSource={this.state.dataSource}
                    renderRow={this.renderRow}
                    onChangeVisibleRows={this.updateUnreadIndicators}
                />
                {above}
                {below}
            </View>
        );
    }
}
