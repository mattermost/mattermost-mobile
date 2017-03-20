// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    View,
    Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import RightMenuDrawerItem from './right_menu_drawer_item';

export default class RightMenuDrawer extends React.Component {
    static propTypes = {
        errors: React.PropTypes.array.isRequired,
        currentUserId: React.PropTypes.string.isRequired,
        currentTeamId: React.PropTypes.string.isRequired,
        actions: React.PropTypes.shape({
            goToModalSelectTeam: React.PropTypes.func.isRequired,
            clearErrors: React.PropTypes.func.isRequired,
            logout: React.PropTypes.func.isRequired
        }).isRequired,
        theme: React.PropTypes.object
    };

    openErrorEmail = () => {
        const recipient = 'feedback@mattermost.com';
        const subject = 'Problem with Mattermost React Native app';
        Linking.openURL(
            `mailto:${recipient}?subject=${subject}&body=${this.errorEmailBody()}`
        );
        this.props.actions.clearErrors();
    };

    errorEmailBody = () => {
        const {currentUserId, currentTeamId, errors} = this.props;
        let contents = [
            `Current User Id: ${currentUserId}`,
            `Current Team Id: ${currentTeamId}`
        ];
        if (errors.length) {
            contents = contents.concat([
                '',
                'Errors:',
                JSON.stringify(errors.map((e) => e.error))
            ]);
        }
        return contents.join('\n');
    };

    render() {
        const Styles = getStyleSheet(this.props.theme);

        return (
            <ScrollView style={Styles.container}>
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
                <RightMenuDrawerItem onPress={this.openErrorEmail}>
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
            color: theme.sidebarText
        },
        icon: {
            color: theme.sidebarText,
            width: 25
        },
        mentionIcon: {
            fontSize: 17,
            fontWeight: 'bold'
        },
        divider: {
            borderColor: changeOpacity(theme.sidebarText, 0.2),
            borderTopWidth: StyleSheet.hairlineWidth
        }
    });
});
