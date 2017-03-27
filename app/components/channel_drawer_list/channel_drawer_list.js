// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import deepEqual from 'deep-equal';
import React, {PropTypes, Component} from 'react';
import {
    ListView,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Constants} from 'mattermost-redux/constants';

import ChannelDrawerItem from './channel_drawer_item';
import UnreadIndicator from './unread_indicator';

class ChannelDrawerList extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            closeDirectChannel: PropTypes.func.isRequired,
            closeOptionsModal: PropTypes.func.isRequired,
            goToCreateChannel: PropTypes.func.isRequired,
            leaveChannel: PropTypes.func.isRequired,
            markFavorite: PropTypes.func.isRequired,
            openSettingsModal: React.PropTypes.func.isRequired,
            unmarkFavorite: PropTypes.func.isRequired,
            showOptionsModal: PropTypes.func.isRequired,
            showDirectMessagesModal: PropTypes.func.isRequired,
            showMoreChannelsModal: PropTypes.func.isRequired
        }).isRequired,
        channels: PropTypes.object.isRequired,
        channelMembers: PropTypes.object,
        currentTeam: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        intl: intlShape.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
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
        const container = this.scrollContainer;
        if (container && container._visibleRows && container._visibleRows.s1) { //eslint-disable-line no-underscore-dangle
            this.updateUnreadIndicators(container._visibleRows);  //eslint-disable-line no-underscore-dangle
        }
    }

    getRowIndex = (displayName) => {
        const data = this.state.dataSource._dataBlob.s1; //eslint-disable-line no-underscore-dangle
        return data.findIndex((obj) => obj.display_name === displayName);
    };

    updateUnreadIndicators = (v) => {
        let showAbove = false;
        let showBelow = false;

        if (v.s1) {
            const visibleIndexes = Object.keys(v.s1);
            const firstVisible = parseInt(visibleIndexes[0], 10);
            const lastVisible = parseInt(visibleIndexes[visibleIndexes.length - 1], 10);

            if (this.firstUnreadChannel) {
                const index = this.getRowIndex(this.firstUnreadChannel);
                if (index < firstVisible) {
                    showAbove = true;
                }
            }

            if (this.lastUnreadChannel) {
                const index = this.getRowIndex(this.lastUnreadChannel);
                if (index > lastVisible) {
                    showBelow = true;
                }
            }

            this.setState({
                showAbove,
                showBelow
            });
        }
    };

    onSelectChannel = (channel) => {
        this.props.onSelectChannel(channel.id);
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

            if (member.notify_props && member.notify_props.mark_unread === Constants.MENTION) {
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
            <ChannelDrawerItem
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

    createPrivateChannel = () => {
        this.props.actions.goToCreateChannel(Constants.PRIVATE_CHANNEL);
    };

    buildData = (props) => {
        const data = [];

        if (!props.currentChannel) {
            return data;
        }

        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        const {
            favoriteChannels,
            publicChannels,
            privateChannels,
            directAndGroupChannels
        } = props.channels;

        if (favoriteChannels.length) {
            data.push(
                this.renderTitle(styles, 'sidebar.favorite', 'FAVORITES', null, favoriteChannels.length > 0),
                ...favoriteChannels
            );
        }

        data.push(
            this.renderTitle(styles, 'sidebar.channels', 'CHANNELS', this.props.actions.showMoreChannelsModal, publicChannels.length > 0),
            ...publicChannels
        );

        data.push(
            this.renderTitle(styles, 'sidebar.pg', 'PRIVATE GROUPS', this.createPrivateChannel, privateChannels.length > 0),
            ...privateChannels
        );

        data.push(
            this.renderTitle(styles, 'sidebar.direct', 'DIRECT MESSAGES', this.props.actions.showDirectMessagesModal, directAndGroupChannels.length > 0),
            ...directAndGroupChannels
        );

        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;
        this.findUnreadChannels(data);

        return data;
    };

    renderSectionAction = (styles, action) => {
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={action}
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

    renderRow = (rowData) => {
        if (rowData && rowData.id) {
            return this.createChannelElement(rowData);
        }
        return rowData;
    };

    renderTitle = (styles, id, defaultMessage, action, bottomDivider) => {
        return (
            <View>
                {this.renderDivider(styles, 0)}
                <View style={styles.titleContainer}>
                    <FormattedText
                        style={styles.title}
                        id={id}
                        defaultMessage={defaultMessage}
                    />
                    {action && this.renderSectionAction(styles, action)}
                </View>
                {bottomDivider && this.renderDivider(styles, 16)}
            </View>
        );
    };

    setScrollContainer = (ref) => {
        this.scrollContainer = ref;
    };

    render() {
        if (!this.props.currentChannel) {
            return <Text>{'Loading'}</Text>;
        }

        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        const settings = (
            <TouchableHighlight
                style={styles.settingsContainer}
                onPress={() => this.props.actions.openSettingsModal()}
            >
                <AwesomeIcon
                    name='cog'
                    style={styles.settings}
                />
            </TouchableHighlight>
        );

        let above;
        let below;
        if (this.state.showAbove) {
            above = (
                <UnreadIndicator
                    style={[styles.above, {width: (this.width - 40)}]}
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

        if (this.state.showBelow) {
            below = (
                <UnreadIndicator
                    style={[styles.below, {width: (this.width - 40)}]}
                    text={(
                        <FormattedText
                            style={styles.indicatorText}
                            id='sidebar.unreadBelow'
                            defaultMessage='Unread post(s) below'
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
                <View style={styles.statusBar}>
                    <View style={styles.headerContainer}>
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={styles.header}
                        >
                            {this.props.currentTeam.display_name}
                        </Text>
                        {settings}
                    </View>
                </View>
                <ListView
                    ref={this.setScrollContainer}
                    style={styles.scrollContainer}
                    dataSource={this.state.dataSource}
                    renderRow={this.renderRow}
                    onChangeVisibleRows={this.updateUnreadIndicators}
                    pageSize={10}
                />
                {above}
                {below}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.sidebarBg,
            flex: 1
        },
        statusBar: {
            backgroundColor: theme.sidebarHeaderBg,
            ...Platform.select({
                ios: {
                    paddingTop: 20
                }
            })
        },
        scrollContainer: {
            flex: 1,
            marginBottom: 10
        },
        headerContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            height: 44,
            paddingLeft: 16
        },
        header: {
            color: theme.sidebarHeaderTextColor,
            flex: 1,
            fontSize: 14,
            fontWeight: 'normal',
            lineHeight: 16
        },
        settingsContainer: {
            alignItems: 'center',
            height: 44,
            justifyContent: 'center',
            width: 50
        },
        settings: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontWeight: '300'
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 48,
            marginLeft: 16
        },
        title: {
            flex: 1,
            color: theme.sidebarText,
            opacity: 1,
            fontSize: 15,
            fontWeight: '500',
            letterSpacing: 0.8,
            lineHeight: 18
        },
        divider: {
            backgroundColor: changeOpacity(theme.sidebarText, 0.1),
            height: 1
        },
        actionContainer: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            width: 50
        },
        action: {
            color: theme.sidebarText,
            fontSize: 16,
            fontWeight: '500',
            lineHeight: 18
        },
        above: {
            backgroundColor: theme.mentionBj,
            top: 79
        },
        below: {
            backgroundColor: theme.mentionBj,
            bottom: 15
        },
        indicatorText: {
            backgroundColor: 'transparent',
            color: theme.mentionColor,
            fontSize: 14,
            paddingVertical: 2,
            paddingHorizontal: 4,
            textAlign: 'center',
            textAlignVertical: 'center'
        }
    });
});

export default injectIntl(ChannelDrawerList);
