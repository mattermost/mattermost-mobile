// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import {
    Linking,
    Platform,
    ScrollView,
    View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import {isValidUrl} from 'app/utils/url';

import LocalConfig from 'assets/config';

class Settings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearErrors: PropTypes.func.isRequired,
            purgeOfflineStore: PropTypes.func.isRequired,
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        errors: PropTypes.array.isRequired,
        intl: intlShape.isRequired,
        joinableTeams: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object,
    };

    constructor(props) {
        super(props);
        this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    errorEmailBody = () => {
        const {config, currentUserId, currentTeamId, errors} = this.props;
        let contents = [
            'Please share a description of the problem:\n\n',
            `Current User Id: ${currentUserId}`,
            `Current Team Id: ${currentTeamId}`,
            `Server Version: ${config.Version} (Build ${config.BuildNumber})`,
            `App Version: ${DeviceInfo.getVersion()} (Build ${DeviceInfo.getBuildNumber()})`,
            `App Platform: ${Platform.OS}`,
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
                errorArray,
            ]);
        }
        return contents.join('\n');
    };

    goToAbout = preventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'About',
            title: intl.formatMessage({id: 'about.title', defaultMessage: 'About Mattermost'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
            },
        });
    });

    goToNotifications = preventDoubleTap(() => {
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
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    goToDisplaySettings = preventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'DisplaySettings',
            title: intl.formatMessage({id: 'user.settings.modal.display', defaultMessage: 'Display'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    goToAdvancedSettings = preventDoubleTap(() => {
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
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    goToSelectTeam = preventDoubleTap(() => {
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
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                currentUrl,
                theme,
            },
        });
    });

    goToClientUpgrade = preventDoubleTap(() => {
        const {intl, theme} = this.props;

        this.props.navigator.push({
            screen: 'ClientUpgrade',
            title: intl.formatMessage({id: 'mobile.client_upgrade', defaultMessage: 'Upgrade App'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarHidden: false,
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
            },
            passProps: {
                userCheckedForUpgrade: true,
            },
        });
    });

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-settings') {
                this.props.navigator.dismissModal({
                    animationType: 'slide-down',
                });
            }
        }
    };

    openErrorEmail = preventDoubleTap(() => {
        const {config} = this.props;
        const recipient = config.SupportEmail;
        const subject = `Problem with ${config.SiteName} React Native app`;
        const mailTo = `mailto:${recipient}?subject=${subject}&body=${this.errorEmailBody()}`;

        Linking.canOpenURL(mailTo).then((supported) => {
            if (supported) {
                Linking.openURL(mailTo);
                this.props.actions.clearErrors();
            }
        });
    });

    openHelp = preventDoubleTap(() => {
        const {config} = this.props;
        const link = config.HelpLink ? config.HelpLink.toLowerCase() : '';

        Linking.canOpenURL(link).then((supported) => {
            if (supported) {
                Linking.openURL(link);
            }
        });
    });

    render() {
        const {config, joinableTeams, theme} = this.props;
        const style = getStyleSheet(theme);
        const showTeams = Object.keys(joinableTeams).length > 0;
        const showHelp = isValidUrl(config.HelpLink);
        const showArrow = Platform.OS === 'ios';

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    alwaysBounceVertical={false}
                    contentContainerStyle={style.wrapper}
                >
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Notifications'
                        i18nId='user.settings.modal.notifications'
                        iconName='ios-notifications'
                        iconType='ion'
                        onPress={this.goToNotifications}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Display'
                        i18nId='user.settings.modal.display'
                        iconName='ios-apps'
                        iconType='ion'
                        onPress={this.goToDisplaySettings}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    {showTeams &&
                    <SettingsItem
                        defaultMessage='Open teams you can join'
                        i18nId='mobile.select_team.join_open'
                        iconName='list'
                        iconType='foundation'
                        onPress={this.goToSelectTeam}
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
                        onPress={this.openHelp}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    }
                    <SettingsItem
                        defaultMessage='Report a Problem'
                        i18nId='sidebar_right_menu.report'
                        iconName='exclamation'
                        iconType='fontawesome'
                        onPress={this.openErrorEmail}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Advanced Settings'
                        i18nId='mobile.advanced_settings.title'
                        iconName='ios-hammer'
                        iconType='ion'
                        onPress={this.goToAdvancedSettings}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    {LocalConfig.EnableMobileClientUpgrade && LocalConfig.EnableMobileClientUpgradeUserSetting &&
                    <SettingsItem
                        defaultMessage='Check for Upgrade'
                        i18nId='mobile.settings.modal.check_for_upgrade'
                        iconName='update'
                        iconType='material'
                        onPress={this.goToClientUpgrade}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    }
                    <SettingsItem
                        defaultMessage='About Mattermost'
                        i18nId='about.title'
                        iconName='ios-information-circle'
                        iconType='ion'
                        onPress={this.goToAbout}
                        separator={false}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            ...Platform.select({
                ios: {
                    paddingTop: 35,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
    };
});

export default injectIntl(Settings);
