// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {Alert, StyleSheet, Text, View, ListView} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {buildDisplayNameAndTypeComparable} from 'service/utils/channel_utils';
import {Constants} from 'service/constants';
import LineDivider from 'app/components/line_divider';
import ChannelItem from './channel_item';
import FormattedText from 'app/components/formatted_text';
import UnreadIndicator from './unread_indicator';
import deepEqual from 'deep-equal';

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

class ChannelList extends React.Component {
    static propTypes = {
        intl: intlShape.isRequired,
        currentTeam: React.PropTypes.object.isRequired,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.object.isRequired,
        channelMembers: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired,
        onSelectChannel: React.PropTypes.func.isRequired,
        onViewChannel: React.PropTypes.func.isRequired,
        handleCloseDM: React.PropTypes.func.isRequired
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
            }).cloneWithRows(this.buildData(props))
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !deepEqual(this.props, nextProps, {strict: true}) || !deepEqual(this.state, nextState, {strict: true});
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

    getRowIndex = (displayName) => {
        const data = this.state.dataSource._dataBlob.s1; //eslint-disable-line no-underscore-dangle
        return data.findIndex((obj) => obj.display_name === displayName);
    };

    getAboveAndBelow = (index) => {
        const channel = this.state.dataSource.getRowData(0, index);
        const result = buildDisplayNameAndTypeComparable(channel).localeCompare(buildDisplayNameAndTypeComparable(this.props.currentChannel));
        if (result < 0) {
            return {above: true, below: false};
        } else if (result > 0) {
            return {above: false, below: true};
        }
        return {above: false, below: false};
    };

    updateUnreadIndicators = (v) => {
        let showAbove = false;
        let showBelow = false;

        if (this.firstUnreadChannel) {
            const index = this.getRowIndex(this.firstUnreadChannel);
            if (index >= 0 && !v.s1[index]) {
                showAbove = this.getAboveAndBelow(index).above;
            }
        }

        if (this.lastUnreadChannel) {
            const index = this.getRowIndex(this.lastUnreadChannel);
            if (index >= 0 && !v.s1[index]) {
                showBelow = this.getAboveAndBelow(index).below;
            }
        }

        this.setState({
            showAbove,
            showBelow
        });
    };

    onSelectChannel = (channel) => {
        console.log('clicked channel ' + channel.name); // eslint-disable-line no-console

        const {
            currentChannel,
            currentTeam
        } = this.props;

        this.props.onSelectChannel(channel.id);
        this.props.onViewChannel(currentTeam.id, channel.id, currentChannel.id);
    };

    handleClose = (channel) => {
        const {formatMessage} = this.props.intl;
        Alert.alert(
            formatMessage({id: 'mobile.channel_list.alertTitleCloseDM', defaultMessage: 'Close Direct Message'}),
            formatMessage({
                id: 'mobile.channel_list.alertMessageCloseDM',
                defaultMessage: 'Are you sure you want to close the DM with {username}'
            }, {
                username: channel.display_name
            }),
            [
                {text: formatMessage({id: 'mobile.channel_list.alertNo', defaultMessage: 'No'})},
                {
                    text: formatMessage({id: 'mobile.channel_list.alertYes', defaultMessage: 'Yes'}),
                    onPress: () => this.props.handleCloseDM(channel)
                }]
        );
    };

    getUnreadMessages = (channel) => {
        const member = this.props.channelMembers[channel.id];
        let mentions = 0;
        let unreadCount = 0;
        if (member) {
            mentions = member.mention_count;
            unreadCount = channel.total_msg_count - member.msg_count;

            if (member.notify_props && member.notify_props.mark_unread === 'mention') {
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
                    this.lastUnreadChannel = c.display_name;
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
                handleClose={channel.type === Constants.DM_CHANNEL ? this.handleClose : null}
                isActive={channel.isCurrent}
                theme={this.props.theme}
            />
        );
    };

    buildData = (props) => {
        const data = [];

        if (!props.currentChannel) {
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

    renderRow = (rowData) => {
        if (rowData && rowData.id) {
            return this.createChannelElement(rowData);
        }
        return rowData;
    };

    render() {
        if (!this.props.currentChannel) {
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

export default injectIntl(ChannelList);
