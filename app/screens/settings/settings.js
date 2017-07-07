// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    InteractionManager,
    Linking,
    Platform,
    StyleSheet,
    View
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {isValidUrl} from 'app/utils/url';

import SettingsItem from './settings_item';

class Settings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearErrors: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            purgeOfflineStore: PropTypes.func.isRequired
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        errors: PropTypes.array.isRequired,
        intl: intlShape.isRequired,
        joinableTeams: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object
    };

    constructor(props) {
        super(props);
        this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    errorEmailBody = () => {
        const {config, currentUserId, currentTeamId, errors} = this.props;
        let contents = [
            `Current User Id: ${currentUserId}`,
            `Current Team Id: ${currentTeamId}`,
            `Server Version: ${config.Version} (Build ${config.BuildNumber})`,
            `App Version: ${DeviceInfo.getVersion()} (Build ${DeviceInfo.getBuildNumber()})`,
            `App Platform: ${Platform.OS}`
        ];
        if (errors.length) {
            const errorArray = errors.map((e) => {
                const {error} = e;
                const stack = error.stack || '';
                return `Date: ${e.date}\nMessage: ${error.message}\nStack trace:\n${stack}\n\n`;
            }).join('');

            contents = contents.concat([
                '',
                'Errors:',
                errorArray
            ]);
        }
        return contents.join('\n');
    };

    goToAbout = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'About',
            title: intl.formatMessage({id: 'about.titles', defaultMessage: 'About Mattermost'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor
            }
        });
    };

    goToAccountSettings = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'AccountSettings',
            title: intl.formatMessage({id: 'user.settings.modal.title', defaultMessage: 'Account Settings'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    goToSelectTeam = () => {
        const {currentUrl, intl, navigator, theme} = this.props;

        navigator.push({
            screen: 'SelectTeam',
            title: intl.formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                currentUrl,
                theme
            }
        });
    };

    handlePress = (action) => {
        preventDoubleTap(action, this);
    };

    logout = () => {
        const {logout} = this.props.actions;
        InteractionManager.runAfterInteractions(logout);
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-settings') {
                this.props.navigator.dismissModal({
                    animationType: 'slide-down'
                });
            }
        }
    };

    openErrorEmail = () => {
        const recipient = 'feedback@mattermost.com';
        const subject = 'Problem with Mattermost React Native app';
        const body = this.errorEmailBody();
        Linking.openURL(
            `mailto:${recipient}?subject=${subject}&body=${body}`
        );
        this.props.actions.clearErrors();
    };

    openHelp = () => {
        const {config} = this.props;
        Linking.openURL(config.HelpLink.toLowerCase());
    };

    clearOfflineCache = () => {
        const {actions, intl} = this.props;

        Alert.alert(
            intl.formatMessage({id: 'mobile.settings.clear', defaultMessage: 'Clear Offline Store'}),
            intl.formatMessage({id: 'mobile.settings.clear_message', defaultMessage: '\nThis will clear all offline data and restart the app. You will be automatically logged back in once the app restarts.\n'}),
            [{
                text: intl.formatMessage({id: 'mobile.settings.clear_button', defaultMessage: 'Clear'}),
                onPress: () => actions.purgeOfflineStore()
            }, {
                text: intl.formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'}),
                onPress: () => true
            }]
        );
    }

    render() {
        const {config, joinableTeams, theme} = this.props;
        const style = getStyleSheet(theme);
        const showTeams = Object.keys(joinableTeams).length > 0;
        const showHelp = isValidUrl(config.HelpLink);

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <SettingsItem
                        defaultMessage='Account Settings'
                        i18nId='sidebar_right_menu.accountSettings'
                        iconName='cog'
                        iconType='fontawesome'
                        onPress={() => this.handlePress(this.goToAccountSettings)}
                        separator={true}
                        theme={theme}
                    />
                    {showTeams &&
                    <SettingsItem
                        defaultMessage='Open teams you can join'
                        i18nId='mobile.select_team.join_open'
                        iconName='group'
                        iconType='material'
                        onPress={() => preventDoubleTap(this.goToSelectTeam, this)}
                        separator={true}
                        theme={theme}
                    />
                    }
                    {showHelp &&
                    <SettingsItem
                        defaultMessage='Help'
                        i18nId='mobile.help.title'
                        iconName='help'
                        iconType='material'
                        onPress={() => preventDoubleTap(this.openHelp, this)}
                        separator={true}
                        theme={theme}
                    />
                    }
                    <SettingsItem
                        defaultMessage='Report a Problem'
                        i18nId='sidebar_right_menu.report'
                        iconName='warning'
                        iconType='material'
                        onPress={() => this.handlePress(this.openErrorEmail)}
                        separator={true}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Clear Offline Store'
                        i18nId='mobile.settings.clear'
                        iconName='storage'
                        iconType='material'
                        onPress={() => this.handlePress(this.clearOfflineCache)}
                        separator={true}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='About Mattermost'
                        i18nId='about.title'
                        iconName='info-outline'
                        iconType='material'
                        onPress={() => this.handlePress(this.goToAbout)}
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
                        onPress={() => this.handlePress(this.logout)}
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

export default injectIntl(Settings);
