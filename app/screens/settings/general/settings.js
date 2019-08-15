// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
import {Navigation} from 'react-native-navigation';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {isValidUrl} from 'app/utils/url';
import {t} from 'app/utils/i18n';

import LocalConfig from 'assets/config';

class Settings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearErrors: PropTypes.func.isRequired,
            purgeOfflineStore: PropTypes.func.isRequired,
            goToScreen: PropTypes.func.isRequired,
            dismissModal: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        config: PropTypes.object.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        errors: PropTypes.array.isRequired,
        intl: intlShape.isRequired,
        joinableTeams: PropTypes.array.isRequired,
        theme: PropTypes.object,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        errors: [],
        joinableTeams: [],
    };

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'close-settings') {
            this.props.actions.dismissModal();
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
        const {actions, intl, config} = this.props;
        const screen = 'About';
        const title = intl.formatMessage({id: 'about.title', defaultMessage: 'About {appTitle}'}, {appTitle: config.SiteName || 'Mattermost'});

        actions.goToScreen(screen, title);
    });

    goToNotifications = preventDoubleTap(() => {
        const {actions, intl} = this.props;
        const screen = 'NotificationSettings';
        const title = intl.formatMessage({id: 'user.settings.modal.notifications', defaultMessage: 'Notifications'});

        actions.goToScreen(screen, title);
    });

    goToDisplaySettings = preventDoubleTap(() => {
        const {actions, intl} = this.props;
        const screen = 'DisplaySettings';
        const title = intl.formatMessage({id: 'user.settings.modal.display', defaultMessage: 'Display'});

        actions.goToScreen(screen, title);
    });

    goToAdvancedSettings = preventDoubleTap(() => {
        const {actions, intl} = this.props;
        const screen = 'AdvancedSettings';
        const title = intl.formatMessage({id: 'mobile.advanced_settings.title', defaultMessage: 'Advanced Settings'});

        actions.goToScreen(screen, title);
    });

    goToSelectTeam = preventDoubleTap(() => {
        const {actions, currentUrl, intl, theme} = this.props;
        const screen = 'SelectTeam';
        const title = intl.formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'});
        const passProps = {
            currentUrl,
            theme,
        };

        actions.goToScreen(screen, title, passProps);
    });

    goToClientUpgrade = preventDoubleTap(() => {
        const {actions, intl} = this.props;
        const screen = 'ClientUpgrade';
        const title = intl.formatMessage({id: 'mobile.client_upgrade', defaultMessage: 'Upgrade App'});
        const passProps = {
            userCheckedForUpgrade: true,
        };

        actions.goToScreen(screen, title, passProps);
    });

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
        const {config, joinableTeams, theme, isLandscape} = this.props;
        const style = getStyleSheet(theme);
        const showTeams = joinableTeams.length > 0;
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
                        i18nId={t('user.settings.modal.notifications')}
                        iconName='ios-notifications'
                        iconType='ion'
                        onPress={this.goToNotifications}
                        showArrow={showArrow}
                        theme={theme}
                        separator={true}
                        isLandscape={isLandscape}
                    />
                    <SettingsItem
                        defaultMessage='Display'
                        i18nId={t('user.settings.modal.display')}
                        iconName='ios-apps'
                        iconType='ion'
                        onPress={this.goToDisplaySettings}
                        showArrow={showArrow}
                        theme={theme}
                        separator={true}
                        isLandscape={isLandscape}
                    />
                    {showTeams &&
                    <React.Fragment>
                        <SettingsItem
                            defaultMessage='Open teams you can join'
                            i18nId={t('mobile.select_team.join_open')}
                            iconName='list'
                            iconType='foundation'
                            onPress={this.goToSelectTeam}
                            showArrow={showArrow}
                            theme={theme}
                            separator={true}
                            isLandscape={isLandscape}
                        />
                    </React.Fragment>
                    }
                    {showHelp &&
                    <React.Fragment>
                        <SettingsItem
                            defaultMessage='Help'
                            i18nId={t('mobile.help.title')}
                            iconName='md-help'
                            iconType='ion'
                            onPress={this.openHelp}
                            showArrow={showArrow}
                            theme={theme}
                            separator={true}
                            isLandscape={isLandscape}
                        />
                    </React.Fragment>
                    }
                    <SettingsItem
                        defaultMessage='Report a Problem'
                        i18nId={t('sidebar_right_menu.report')}
                        iconName='exclamation'
                        iconType='fontawesome'
                        onPress={this.openErrorEmail}
                        showArrow={showArrow}
                        theme={theme}
                        separator={true}
                        isLandscape={isLandscape}
                    />
                    <SettingsItem
                        defaultMessage='Advanced Settings'
                        i18nId={t('mobile.advanced_settings.title')}
                        iconName='ios-hammer'
                        iconType='ion'
                        onPress={this.goToAdvancedSettings}
                        showArrow={showArrow}
                        theme={theme}
                        separator={true}
                        isLandscape={isLandscape}
                    />
                    {LocalConfig.EnableMobileClientUpgrade && LocalConfig.EnableMobileClientUpgradeUserSetting &&
                    <React.Fragment>
                        <SettingsItem
                            defaultMessage='Check for Upgrade'
                            i18nId={t('mobile.settings.modal.check_for_upgrade')}
                            iconName='update'
                            iconType='material'
                            onPress={this.goToClientUpgrade}
                            showArrow={showArrow}
                            theme={theme}
                            separator={true}
                            isLandscape={isLandscape}
                        />
                    </React.Fragment>
                    }
                    <SettingsItem
                        defaultMessage='About {appTitle}'
                        messageValues={{appTitle: config.SiteName || 'Mattermost'}}
                        i18nId={t('about.title')}
                        iconName='ios-information-circle'
                        iconType='ion'
                        onPress={this.goToAbout}
                        separator={false}
                        showArrow={showArrow}
                        theme={theme}
                        isLandscape={isLandscape}
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
