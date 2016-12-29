// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {ScrollView, StyleSheet, Text, View} from 'react-native';
import LineDivider from 'app/components/line_divider';
import ChannelItem from './channel_item';
import FormattedText from 'app/components/formatted_text';

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
    }
});

export default class ChannelList extends React.Component {
    static propTypes = {
        currentTeam: React.PropTypes.object.isRequired,
        currentChannelId: React.PropTypes.string,
        channels: React.PropTypes.object.isRequired,
        channelMembers: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired,
        onSelectChannel: React.PropTypes.func,
        closeChannelDrawer: React.PropTypes.func
    };

    onSelectChannel = (channel) => {
        console.log('clicked channel ' + channel.name); // eslint-disable-line no-console

        this.props.onSelectChannel(channel.id);
        this.props.closeChannelDrawer();
    };

    createChannelElement = (channel) => {
        const member = this.props.channelMembers[channel.id];
        return (
            <ChannelItem
                key={channel.id}
                channel={channel}
                member={member}
                onSelectChannel={this.onSelectChannel}
                isActive={channel.id === this.props.currentChannelId}
                theme={this.props.theme}
            />
        );
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
            </View>
        );
    }
}
