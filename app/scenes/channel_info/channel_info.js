// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    ScrollView,
    StyleSheet,
    View
} from 'react-native';

import ChannelInfoHeader from './channel_info_header';
import ChannelInfoRow from './channel_info_row';

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

export default class ChannelInfo extends PureComponent {
    static propTypes = {
        currentChannel: PropTypes.object.isRequired,
        currentChannelCreatorName: PropTypes.string,
        currentChannelMemberCount: PropTypes.number,
        isFavorite: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getChannelStats: PropTypes.func.isRequired
        })
    }

    componentDidMount() {
        this.props.actions.getChannelStats(this.props.currentChannel.team_id, this.props.currentChannel.id);
    }

    render() {
        const {
            currentChannel,
            currentChannelCreatorName,
            currentChannelMemberCount,
            isFavorite,
            theme
        } = this.props;

        return (
            <View style={style.container}>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={{backgroundColor: theme.centerChannelBg}}
                >
                    <ChannelInfoHeader
                        createAt={currentChannel.create_at}
                        creator={currentChannelCreatorName}
                        displayName={currentChannel.display_name}
                        header={currentChannel.header}
                        purpose={currentChannel.purpose}
                    />
                    <ChannelInfoRow
                        action={() => true}
                        defaultMessage='Favorite'
                        detail={isFavorite}
                        icon='star-o'
                        textId='mobile.routes.channelInfo.favorite'
                        togglable={true}
                    />
                    <View style={style.separatorContainer}>
                        <View style={[style.separator, {backgroundColor: this.props.theme.centerChannelBg}]}/>
                    </View>
                    <ChannelInfoRow
                        action={() => true}
                        defaultMessage='Notification Preferences'
                        icon='bell-o'
                        textId='channel_header.notificationPreferences'
                    />
                    <View style={style.separatorContainer}>
                        <View style={[style.separator, {backgroundColor: this.props.theme.centerChannelBg}]}/>
                    </View>
                    <ChannelInfoRow
                        action={() => true}
                        defaultMessage='Manage Members'
                        detail={currentChannelMemberCount}
                        icon='users'
                        textId='channel_header.manageMembers'
                    />
                    <View style={style.separatorContainer}>
                        <View style={[style.separator, {backgroundColor: this.props.theme.centerChannelBg}]}/>
                    </View>
                    <ChannelInfoRow
                        action={() => true}
                        defaultMessage='Add Members'
                        icon='user-plus'
                        textId='channel_header.addMembers'
                    />
                    <View style={style.separatorContainer}>
                        <View style={[style.separator, {backgroundColor: this.props.theme.centerChannelBg}]}/>
                    </View>
                    <ChannelInfoRow
                        action={() => true}
                        defaultMessage='Leave Channel'
                        icon='sign-out'
                        textId='navbar.leave'
                    />
                    <View style={style.footer}>
                        <ChannelInfoRow
                            action={() => true}
                            defaultMessage='Delete Channel'
                            icon='trash'
                            iconColor='#DA4A4A'
                            textId='mobile.routes.channelInfo.delete_channel'
                            textColor='#DA4A4A'
                        />
                    </View>
                </ScrollView>
            </View>
        );
    }
}
