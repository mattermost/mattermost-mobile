// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import FormattedText from './formatted_text.js';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';

const Styles = StyleSheet.create({
    container: {
        backgroundColor: '#2071a7',
        flex: 1,
        paddingTop: 20
    },
    item: {
        alignItems: 'center',
        height: 40,
        paddingLeft: 10,
        paddingRight: 10,
        flex: 1,
        flexDirection: 'row'
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

export default class RightSidebarMenu extends React.Component {
    render() {
        return (
            <ScrollView style={Styles.container}>
                <Item>
                    <Text style={[Styles.icon, Styles.mentionIcon]}>{'@'}</Text>
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.recentMentions'
                        defaultMessage='Recent Mentions'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='flag'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.flagged'
                        defaultMessage='Flagged Posts'
                    />
                </Item>
                <Divider/>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='cog'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.accountSettings'
                        defaultMessage='Account Settings'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='user-plus'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.inviteNew'
                        defaultMessage='Invite New Member'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='link'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.teamLink'
                        defaultMessage='Get Team Invite Link'
                    />
                </Item>
                <Divider/>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='globe'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.teamSettings'
                        defaultMessage='Team Settings'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='users'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.manageMembers'
                        defaultMessage='Manage Members'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='exchange'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.switch_team'
                        defaultMessage='Team Selection'
                    />
                </Item>
                <Divider/>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='question'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.help'
                        defaultMessage='Help'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='phone'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.report'
                        defaultMessage='Report a Problem'
                    />
                </Item>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='info'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='navbar_dropdown.about'
                        defaultMessage='About Mattermost'
                    />
                </Item>
                <Divider/>
                <Item>
                    <Icon
                        style={Styles.icon}
                        name='sign-out'
                    />
                    <FormattedText
                        style={Styles.itemText}
                        id='sidebar_right_menu.logout'
                        defaultMessage='Logout'
                    />
                </Item>
            </ScrollView>
        );
    }
}

function Item({onPress, children}) {
    return (
        <TouchableHighlight
            underlayColor='rgba(255, 255, 255, 0.3)'
            onPress={onPress}
        >
            <View style={Styles.item}>
                {children}
            </View>
        </TouchableHighlight>
    );
}
Item.propTypes = {
    onPress: React.PropTypes.func.isRequired,
    children: React.PropTypes.node
};

function Divider() {
    return <View style={Styles.divider}/>;
}
