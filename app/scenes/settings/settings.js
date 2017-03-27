// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    InteractionManager,
    Linking,
    Platform,
    StyleSheet,
    TouchableHighlight,
    View
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import SettingsItem from './settings_item';

export default class Settings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            goToAccountSettings: PropTypes.func.isRequired,
            goToSelectTeam: PropTypes.func.isRequired,
            clearErrors: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        errors: PropTypes.array.isRequired,
        showTeamSelection: PropTypes.bool.isRequired,
        theme: PropTypes.object
    };

    static navigationProps = {
        renderLeftComponent: (props, emitter, theme) => {
            const style = getStyleSheet(theme);
            return (
                <TouchableHighlight
                    style={style.leftComponent}
                    onPress={props.onNavigateBack}
                    underlayColor={changeOpacity(theme.centerChannelColor, 0.9)}
                >
                    <MaterialIcon
                        size={20}
                        name='close'
                        color={theme.sidebarHeaderTextColor}
                    />
                </TouchableHighlight>
            );
        }
    };

    logout = () => {
        const {closeDrawers, logout} = this.props.actions;
        closeDrawers();
        InteractionManager.runAfterInteractions(logout);
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
        const {showTeamSelection, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <View style={style.wrapper}>
                    <SettingsItem
                        defaultMessage='Account Settings'
                        i18nId='sidebar_right_menu.accountSettings'
                        iconName='cog'
                        iconType='fontawesome'
                        onPress={this.props.actions.goToAccountSettings}
                        separator={true}
                        theme={theme}
                    />
                    {showTeamSelection &&
                        <SettingsItem
                            defaultMessage='Team Selection'
                            i18nId='sidebar_right_menu.switch_team'
                            iconName='ios-people'
                            iconType='ion'
                            onPress={this.props.actions.goToSelectTeam}
                            separator={true}
                            theme={theme}
                        />
                    }
                    <SettingsItem
                        defaultMessage='Report a Problem'
                        i18nId='sidebar_right_menu.report'
                        iconName='warning'
                        iconType='material'
                        onPress={this.openErrorEmail}
                        separator={false}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                </View>
                <View style={style.footer}>
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Logout'
                        i18nId='sidebar_right_menu.logout'
                        iconName='exit-to-app'
                        iconType='material'
                        isDestructor={true}
                        onPress={this.logout}
                        separator={false}
                        theme={theme}
                    />
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        leftComponent: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            width: 44
        },
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            flex: 1
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1
        },
        footer: {
            height: 51,
            justifyContent: 'flex-end',
            ...Platform.select({
                android: {
                    marginBottom: 20
                }
            })
        }
    });
});
