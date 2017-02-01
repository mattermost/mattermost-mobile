// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    Platform,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';

import RightMenuDrawerItem from './right_menu_drawer_item';

const Styles = StyleSheet.create({
    container: {
        backgroundColor: '#2071a7',
        flex: 1,
        ...Platform.select({
            ios: {
                paddingTop: 20
            },
            android: {
                paddingTop: 5
            }
        })
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

export default class RightMenuDrawer extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            goToFlaggedPosts: React.PropTypes.func.isRequired,
            goToRecentMentions: React.PropTypes.func.isRequired,
            goToSelectTeam: React.PropTypes.func.isRequired,
            logout: React.PropTypes.func.isRequired
        }).isRequired
    }

    render() {
        return (
            <ScrollView style={Styles.container}>
                <RightMenuDrawerItem onPress={this.props.actions.goToRecentMentions}>
                    <Text style={[Styles.icon, Styles.mentionIcon]}>{'@'}</Text>
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.recentMentions'
                        defaultMessage='Recent Mentions'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem onPress={this.props.actions.goToFlaggedPosts}>
                    <Icon
                        style={Styles.icon}
                        name='flag'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.flagged'
                        defaultMessage='Flagged Posts'
                    />
                </RightMenuDrawerItem>
                <Divider/>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='cog'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.accountSettings'
                        defaultMessage='Account Settings'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='user-plus'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.inviteNew'
                        defaultMessage='Invite New Member'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='link'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.teamLink'
                        defaultMessage='Get Team Invite Link'
                    />
                </RightMenuDrawerItem>
                <Divider/>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='globe'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.teamSettings'
                        defaultMessage='Team Settings'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='users'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.manageMembers'
                        defaultMessage='Manage Members'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem onPress={this.props.actions.goToSelectTeam}>
                    <Icon
                        style={Styles.icon}
                        name='exchange'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.switch_team'
                        defaultMessage='Team Selection'
                    />
                </RightMenuDrawerItem>
                <Divider/>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='question'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.help'
                        defaultMessage='Help'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='phone'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.report'
                        defaultMessage='Report a Problem'
                    />
                </RightMenuDrawerItem>
                <RightMenuDrawerItem>
                    <Icon
                        style={Styles.icon}
                        name='info'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='navbar_dropdown.about'
                        defaultMessage='About Mattermost'
                    />
                </RightMenuDrawerItem>
                <Divider/>
                <RightMenuDrawerItem onPress={this.props.actions.logout}>
                    <Icon
                        style={Styles.icon}
                        name='sign-out'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.logout'
                        defaultMessage='Logout'
                    />
                </RightMenuDrawerItem>
            </ScrollView>
        );
    }
}

function Divider() {
    return <View style={Styles.divider}/>;
}
