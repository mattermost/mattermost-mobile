// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';

import RightSideMenuItem from './right_side_menu_item';

const Styles = StyleSheet.create({
    container: {
        backgroundColor: '#2071a7',
        flex: 1,
        paddingTop: 20
    },
    itemText: {
        color: 'white'
    },
    icon: {
        color: 'white',
        width: 25
    },
    mentionIcon: {
        fontSize: 17,
        fontWeight: 'bold'
    },
    divider: {
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderTopWidth: StyleSheet.hairlineWidth
    }
});

export default class RightSideMenu extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            goBack: React.PropTypes.func.isRequired,
            goToFlaggedPosts: React.PropTypes.func.isRequired,
            goToRecentMentions: React.PropTypes.func.isRequired,
            logout: React.PropTypes.func.isRequired
        }).isRequired,
        onClose: React.PropTypes.func.isRequired
    }

    goToRecentMentions = () => {
        this.props.onClose();
        this.props.actions.goToRecentMentions();
    }

    goToFlaggedPosts = () => {
        this.props.onClose();
        this.props.actions.goToFlaggedPosts();
    }

    goToTeamSelection = () => {
        this.props.actions.goBack();
    }

    render() {
        return (
            <ScrollView style={Styles.container}>
                <RightSideMenuItem onPress={this.goToRecentMentions}>
                    <Text style={[Styles.icon, Styles.mentionIcon]}>{'@'}</Text>
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.recentMentions'
                        defaultMessage='Recent Mentions'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem onPress={this.goToFlaggedPosts}>
                    <Icon
                        style={Styles.icon}
                        name='flag'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.flagged'
                        defaultMessage='Flagged Posts'
                    />
                </RightSideMenuItem>
                <Divider/>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='cog'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.accountSettings'
                        defaultMessage='Account Settings'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='user-plus'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.inviteNew'
                        defaultMessage='Invite New Member'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='link'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.teamLink'
                        defaultMessage='Get Team Invite Link'
                    />
                </RightSideMenuItem>
                <Divider/>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='globe'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.teamSettings'
                        defaultMessage='Team Settings'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='users'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.manageMembers'
                        defaultMessage='Manage Members'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem onPress={this.goToTeamSelection}>
                    <Icon
                        style={Styles.icon}
                        name='exchange'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.switch_team'
                        defaultMessage='Team Selection'
                    />
                </RightSideMenuItem>
                <Divider/>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='question'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.help'
                        defaultMessage='Help'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='phone'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.report'
                        defaultMessage='Report a Problem'
                    />
                </RightSideMenuItem>
                <RightSideMenuItem>
                    <Icon
                        style={Styles.icon}
                        name='info'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='navbar_dropdown.about'
                        defaultMessage='About Mattermost'
                    />
                </RightSideMenuItem>
                <Divider/>
                <RightSideMenuItem onPress={this.props.actions.logout}>
                    <Icon
                        style={Styles.icon}
                        name='sign-out'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.logout'
                        defaultMessage='Logout'
                    />
                </RightSideMenuItem>
            </ScrollView>
        );
    }
}

function Divider() {
    return <View style={Styles.divider}/>;
}
