// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import {
    InteractionManager,
    Linking,
    Platform,
    View
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {isValidUrl} from 'app/utils/url';

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

    goToNotifications = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'NotificationSettings',
            backButtonTitle: '',
            title: intl.formatMessage({id: 'user.settings.modal.notifications', defaultMessage: 'Notifications'}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    goToAdvancedSettings = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'AdvancedSettings',
            title: intl.formatMessage({id: 'mobile.advanced_settings.title', defaultMessage: 'Advanced Settings'}),
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

    render() {
        const {config, joinableTeams, theme} = this.props;
        const style = getStyleSheet(theme);
        const showTeams = Object.keys(joinableTeams).length > 0;
        const showHelp = isValidUrl(config.HelpLink);
        const showArrow = Platform.OS === 'ios';

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Notifications'
                        i18nId='user.settings.modal.notifications'
                        iconName='ios-notifications'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToNotifications)}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    {showTeams &&
                    <SettingsItem
                        defaultMessage='Open teams you can join'
                        i18nId='mobile.select_team.join_open'
                        iconName='list'
                        iconType='foundation'
                        onPress={() => this.handlePress(this.goToSelectTeam)}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    }
                    {showHelp &&
                    <SettingsItem
                        defaultMessage='Help'
                        i18nId='mobile.help.title'
                        iconName='md-help'
                        iconType='ion'
                        onPress={() => this.handlePress(this.openHelp)}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    }
                    <SettingsItem
                        defaultMessage='Report a Problem'
                        i18nId='sidebar_right_menu.report'
                        iconName='exclamation'
                        iconType='fontawesome'
                        onPress={() => this.handlePress(this.openErrorEmail)}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Advanced Settings'
                        i18nId='mobile.advanced_settings.title'
                        iconName='ios-hammer'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToAdvancedSettings)}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='About Mattermost'
                        i18nId='about.title'
                        iconName='ios-information-circle'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToAbout)}
                        separator={false}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                    <View style={style.footer}>
                        <View style={style.divider}/>
                        <SettingsItem
                            centered={true}
                            defaultMessage='Logout'
                            i18nId='sidebar_right_menu.logout'
                            isDestructor={true}
                            onPress={() => this.handlePress(this.logout)}
                            separator={false}
                            showArrow={false}
                            theme={theme}
                        />
                        <View style={style.divider}/>
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            ...Platform.select({
                ios: {
                    paddingTop: 35
                }
            })
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1
        },
        footer: {
            marginTop: 35
        }
    };
});

export default injectIntl(Settings);
