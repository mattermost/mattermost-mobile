// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';

import ChannelInfoHeader from './channel_info_header';
import ChannelInfoRow from './channel_info_row';
import {Constants} from 'service/constants';

const style = StyleSheet.create({
    container: {
        flex: 1
    },
    footer: {
        marginTop: 40
    },
    separator: {
        flex: 1,
        marginHorizontal: 15
    },
    separatorContainer: {
        flex: 1,
        backgroundColor: '#fff',
        height: 1
    },
    scrollView: {
        flex: 1
    }
});

class ChannelInfo extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        currentChannel: PropTypes.object.isRequired,
        currentChannelCreatorName: PropTypes.string,
        currentChannelMemberCount: PropTypes.number,
        isFavorite: PropTypes.bool.isRequired,
        leaveChannelRequest: PropTypes.object.isRequired,
        isAdmin: PropTypes.bool.isRequired,
        deleteChannelRequest: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getChannelStats: PropTypes.func.isRequired,
            goToChannelMembers: PropTypes.func.isRequired,
            goToChannelAddMembers: PropTypes.func.isRequired,
            markFavorite: PropTypes.func.isRequired,
            unmarkFavorite: PropTypes.func.isRequired,
            leaveChannel: PropTypes.func.isRequired,
            deleteChannel: PropTypes.func.isRequired
        })
    };

    constructor(props) {
        super(props);

        this.state = {
            isFavorite: this.props.isFavorite
        };
    }

    componentDidMount() {
        this.props.actions.getChannelStats(this.props.currentChannel.team_id, this.props.currentChannel.id);
    }

    componentWillReceiveProps(nextProps) {
        const isFavorite = nextProps.isFavorite;
        if (isFavorite !== this.state.isFavorite) {
            this.setState({isFavorite});
        }
    }

    handleFavorite = () => {
        const {isFavorite, actions, currentChannel} = this.props;
        const {markFavorite, unmarkFavorite} = actions;
        const toggleFavorite = isFavorite ? unmarkFavorite : markFavorite;
        this.setState({isFavorite: !isFavorite});
        toggleFavorite(currentChannel.id);
    };

    handleDeleteOrLeave(eventType) {
        const {formatMessage} = this.props.intl;
        const channel = this.props.currentChannel;
        const term = channel.type === Constants.OPEN_CHANNEL ?
            formatMessage({id: 'mobile.channel_info.publicChannel', defaultMessage: 'Public Channel'}) :
            formatMessage({id: 'mobile.channel_info.privateChannel', defaultMessage: 'Private Channel'});
        const titleCaseEventType = `${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}`;

        Alert.alert(
            formatMessage({id: `mobile.channel_info.alertTitle${titleCaseEventType}Channel`, defaultMessage: `${titleCaseEventType} {term}`}, {term}),
            formatMessage({
                id: `mobile.channel_info.alertMessage${titleCaseEventType}Channel`,
                defaultMessage: `Are you sure you want to ${eventType} the {term} {name}?`
            }, {
                term: term.toLowerCase(),
                name: channel.display_name
            }),
            [{
                text: formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'})
            }, {
                text: formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
                onPress: () => {
                    if (eventType === 'leave') {
                        this.props.actions.leaveChannel(channel, true);
                    } else if (eventType === 'delete') {
                        this.props.actions.deleteChannel(channel.team_id, channel.id, true);
                    }
                }
            }]
        );
    }

    renderLeaveOrDeleteChannelRow() {
        const channel = this.props.currentChannel;
        const isDefaultChannel = channel.name === Constants.DEFAULT_CHANNEL;
        const isDirectMessage = channel.type === Constants.DM_CHANNEL;
        return !isDefaultChannel && !isDirectMessage;
    }

    render() {
        const {
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            isAdmin
        } = this.props;

        return (
            <View style={style.container}>
                <ScrollView
                    style={style.scrollView}
                >
                    <ChannelInfoHeader
                        createAt={currentChannel.create_at}
                        creator={currentChannelCreatorName}
                        displayName={currentChannel.display_name}
                        header={currentChannel.header}
                        purpose={currentChannel.purpose}
                    />
                    <ChannelInfoRow
                        action={this.handleFavorite}
                        defaultMessage='Favorite'
                        detail={this.state.isFavorite}
                        icon='star-o'
                        textId='mobile.routes.channelInfo.favorite'
                        togglable={true}
                    />
                    <View style={style.separatorContainer}>
                        <View style={style.separator}/>
                    </View>
                    <ChannelInfoRow
                        action={() => true}
                        defaultMessage='Notification Preferences'
                        icon='bell-o'
                        textId='channel_header.notificationPreferences'
                    />
                    <View style={style.separatorContainer}>
                        <View style={style.separator}/>
                    </View>
                    <ChannelInfoRow
                        action={this.props.actions.goToChannelMembers}
                        defaultMessage={isAdmin ? 'Manage Members' : 'View Members'}
                        detail={currentChannelMemberCount}
                        icon='users'
                        textId={isAdmin ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                    />
                    <View style={style.separatorContainer}>
                        <View style={style.separator}/>
                    </View>
                    {isAdmin &&
                        <View>
                            <ChannelInfoRow
                                action={this.props.actions.goToChannelAddMembers}
                                defaultMessage='Add Members'
                                icon='user-plus'
                                textId='channel_header.addMembers'
                            />
                            <View style={style.separatorContainer}>
                                <View style={style.separator}/>
                            </View>
                        </View>
                    }
                    <ChannelInfoRow
                        action={() => this.handleDeleteOrLeave('leave')}
                        defaultMessage='Leave Channel'
                        icon='sign-out'
                        textId='navbar.leave'
                        shouldRender={this.renderLeaveOrDeleteChannelRow()}
                    />
                    <View style={style.footer}>
                        <ChannelInfoRow
                            action={() => this.handleDeleteOrLeave('delete')}
                            defaultMessage='Delete Channel'
                            icon='trash'
                            iconColor='#DA4A4A'
                            textId='mobile.routes.channelInfo.delete_channel'
                            textColor='#DA4A4A'
                            shouldRender={this.renderLeaveOrDeleteChannelRow()}
                        />
                    </View>
                </ScrollView>
            </View>
        );
    }
}

export default injectIntl(ChannelInfo);
