// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import RightMenuDrawerItem from './right_menu_drawer_item';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.sidebarBg,
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
});

export default class RightMenuDrawer extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            goToModalAccountSettings: React.PropTypes.func.isRequired,
            goToModalSelectTeam: React.PropTypes.func.isRequired,
            logout: React.PropTypes.func.isRequired
        }).isRequired,
        theme: React.PropTypes.object
    }

    render() {
        const Styles = getStyleSheet(this.props.theme);

        return (
            <ScrollView style={Styles.container}>
                <Divider style={Styles.divider}/>
                <RightMenuDrawerItem onPress={this.props.actions.goToModalAccountSettings}>
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
                <Divider style={Styles.divider}/>
                <RightMenuDrawerItem onPress={this.props.actions.goToModalSelectTeam}>
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
                <Divider style={Styles.divider}/>
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
                <Divider style={Styles.divider}/>
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

function Divider(props) {
    return <View {...props}/>;
}
