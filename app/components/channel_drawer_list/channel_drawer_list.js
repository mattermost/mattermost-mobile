// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, Component} from 'react';

import {
    Alert,
    ListView,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {Constants} from 'service/constants';
import LineDivider from 'app/components/line_divider';
import ChannelDrawerItem from './channel_drawer_item';
import FormattedText from 'app/components/formatted_text';
import UnreadIndicator from './unread_indicator';
import deepEqual from 'deep-equal';
import Icon from 'react-native-vector-icons/FontAwesome';

class ChannelDrawerList extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
        currentTeam: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        channels: PropTypes.object.isRequired,
        channelMembers: PropTypes.object,
        theme: PropTypes.object.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        actions: PropTypes.shape({
            closeDMChannel: PropTypes.func.isRequired,
            goToCreateChannel: PropTypes.func.isRequired,
            leaveChannel: PropTypes.func.isRequired,
            markFavorite: PropTypes.func.isRequired,
            unmarkFavorite: PropTypes.func.isRequired,
            showOptionsModal: PropTypes.func.isRequired,
            showDirectMessagesModal: PropTypes.func.isRequired,
            showMoreChannelsModal: PropTypes.func.isRequired,
            closeOptionsModal: PropTypes.func.isRequired
        }).isRequired
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

    handleClose = (channel) => {
        this.setState({showOptions: false});
        this.props.actions.closeDMChannel(channel);
    };

    handleLeave = (channel, term) => {
        const {formatMessage} = this.props.intl;
        Alert.alert(
            formatMessage({id: 'mobile.channel_list.alertTitleLeaveChannel', defaultMessage: 'Leave {term}'}, {term}),
            formatMessage({
                id: 'mobile.channel_list.alertMessageLeaveChannel',
                defaultMessage: 'Are you sure you want to leave the {term} with {name}?'
            }, {
                term: term.toLowerCase(),
                name: channel.display_name
            }),
            [{
                text: formatMessage({id: 'mobile.channel_list.alertNo', defaultMessage: 'No'})
            }, {
                text: formatMessage({id: 'mobile.channel_list.alertYes', defaultMessage: 'Yes'}),
                onPress: () => {
                    this.props.actions.closeOptionsModal();
                    this.props.actions.leaveChannel(channel);
                }
            }]
        );
    };

    onShowModal = (channel) => {
        const {formatMessage} = this.props.intl;
        let open;
        let close;
        let favorite;
        let title;

        if (channel.type === Constants.DM_CHANNEL) {
            title = formatMessage({
                id: 'mobile.channel_list.modalTitle',
                defaultMessage: 'Select an action for the {term} {name}'},
                {
                    name: channel.display_name,
                    term: formatMessage({id: 'mobile.channel_list.dm', defaultMessage: 'Direct Message'}).toLowerCase()
                });

            open = {
                action: () => {
                    this.props.actions.closeOptionsModal();
                    this.onSelectChannel(channel);
                },
                text: formatMessage({id: 'mobile.channel_list.openDM', defaultMessage: 'Open Direct Message'})
            };

            close = {
                action: () => {
                    this.handleClose(channel);
                },
                text: formatMessage({id: 'sidebar.removeList', defaultMessage: 'Remove from list'}),
                textStyle: {
                    color: '#CC3239'
                }
            };
        } else {
            const term = channel.type === Constants.OPEN_CHANNEL ?
                formatMessage({id: 'mobile.channel_list.publicChannel', defaultMessage: 'Public Channel'}) :
                formatMessage({id: 'mobile.channel_list.privateChannel', defaultMessage: 'Private Channel'});

            title = formatMessage({
                id: 'mobile.channel_list.modalTitle',
                defaultMessage: 'Select an action for the {term} {name}'},
                {
                    name: channel.display_name,
                    term: term.toLowerCase()
                });

            open = {
                action: () => {
                    this.props.actions.closeOptionsModal();
                    this.onSelectChannel(channel);
                },
                text: formatMessage({id: 'mobile.channel_list.openChannel', defaultMessage: 'Open {term}'}, {
                    term
                })
            };

            if (channel.name !== Constants.DEFAULT_CHANNEL) {
                close = {
                    action: () => {
                        this.handleLeave(channel, term);
                    },
                    text: formatMessage({id: 'channel_header.leave', defaultMessage: 'Leave {term}'}, {
                        term
                    }),
                    textStyle: {
                        color: '#CC3239'
                    }
                };
            }
        }

        if (channel.isFavorite) {
            favorite = {
                action: () => {
                    this.props.actions.closeOptionsModal();
                    this.props.actions.unmarkFavorite(channel.id);
                },
                text: formatMessage({id: 'channelHeader.removeFromFavorites', defaultMessage: 'Remove from Favorites'})
            };
        } else {
            favorite = {
                action: () => {
                    this.props.actions.closeOptionsModal();
                    this.props.actions.markFavorite(channel.id);
                },
                text: formatMessage({id: 'channelHeader.addToFavorites', defaultMessage: 'Add to Favorites'})
            };
        }

        const options = [open, favorite];
        if (close) {
            options.push(close);
        }
        this.props.actions.showOptionsModal(title, options);
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
                onLongPress={this.onShowModal}
                handleClose={this.handleClose}
                isActive={channel.isCurrent}
                theme={this.props.theme}
            />
        );
    };

    renderSectionAction = (action) => {
        const {theme} = this.props;

        return (
            <TouchableHighlight
                style={Styles.more}
                onPress={action}
            >
                <Icon
                    name='plus-circle'
                    size={18}
                    color={theme.sidebarText}
                />
            </TouchableHighlight>
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
            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                <FormattedText
                    style={[Styles.title, {color: theme.sidebarText}]}
                    id='sidebar.channels'
                    defaultMessage='CHANNELS'
                />
                {this.renderSectionAction(this.props.actions.showMoreChannelsModal)}
            </View>,
            ...publicChannels
        );

        data.push(
            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                <FormattedText
                    style={[Styles.title, {color: theme.sidebarText}]}
                    id='sidebar.pg'
                    defaultMessage='PRIVATE GROUPS'
                />
                {this.renderSectionAction(this.createPrivateChannel)}
            </View>,
            ...privateChannels
        );

        data.push(
            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                <FormattedText
                    style={[Styles.title, {color: theme.sidebarText}]}
                    id='sidebar.direct'
                    defaultMessage='DIRECT MESSAGES'
                />
                {this.renderSectionAction(this.props.actions.showDirectMessagesModal)}
            </View>,
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

    setScrollContainer = (ref) => {
        this.scrollContainer = ref;
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
                    style={{top: 55, backgroundColor: theme.mentionBj, width: (this.width - 40)}}
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
                    style={{bottom: 15, backgroundColor: theme.mentionBj, width: (this.width - 40)}}
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
            <View
                style={[Styles.container, {backgroundColor: theme.sidebarBg}]}
                onLayout={this.onLayout}
            >
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
                    ref={this.setScrollContainer}
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

const Styles = StyleSheet.create({
    container: {
        flex: 1
    },
    scrollContainer: {
        flex: 1
    },
    headerContainer: {
        flexDirection: 'column',
        ...Platform.select({
            ios: {
                height: 64,
                justifyContent: 'flex-end'
            },
            android: {
                height: 56,
                justifyContent: 'center',
                paddingTop: 10
            }
        }),
        width: 300,
        paddingLeft: 10,
        paddingBottom: 12
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
    },
    more: {
        position: 'absolute',
        opacity: 0.6,
        right: 0,
        width: 50,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center'
    }
});

export default injectIntl(ChannelDrawerList);
