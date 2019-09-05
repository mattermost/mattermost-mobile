// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Platform,
    View,
} from 'react-native';

import {DeviceTypes} from 'app/constants';
import StatusBar from 'app/components/status_bar';
import ClockDisplay from 'app/screens/settings/clock_display';
import SettingsItem from 'app/screens/settings/settings_item';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class DisplaySettings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            goToScreen: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        enableTheme: PropTypes.bool.isRequired,
        enableTimezone: PropTypes.bool.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {
        showClockDisplaySettings: false,
    };

    closeClockDisplaySettings = () => {
        this.setState({showClockDisplaySettings: false});
    };

    goToClockDisplaySettings = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;

        if (Platform.OS === 'ios') {
            const screen = 'ClockDisplaySettings';
            const title = intl.formatMessage({id: 'user.settings.display.clockDisplay', defaultMessage: 'Clock Display'});
            actions.goToScreen(screen, title);
            return;
        }

        this.setState({showClockDisplaySettings: true});
    });

    goToSidebarSettings = preventDoubleTap(() => {
        const {actions, theme} = this.props;
        const {intl} = this.context;
        const screen = 'SidebarSettings';
        const title = intl.formatMessage({id: 'mobile.display_settings.sidebar', defaultMessage: 'Sidebar'});

        actions.goToScreen(screen, title, {theme});
    });

    goToTimezoneSettings = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;
        const screen = 'TimezoneSettings';
        const title = intl.formatMessage({id: 'mobile.advanced_settings.timezone', defaultMessage: 'Timezone'});

        actions.goToScreen(screen, title);
    });

    goToThemeSettings = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;
        const screen = 'ThemeSettings';
        const title = intl.formatMessage({id: 'mobile.display_settings.theme', defaultMessage: 'Theme'});

        actions.goToScreen(screen, title);
    });

    render() {
        const {theme, enableTimezone, enableTheme, isLandscape} = this.props;
        const {showClockDisplaySettings} = this.state;
        const style = getStyleSheet(theme);

        let clockDisplayModal;
        if (Platform.OS === 'android') {
            clockDisplayModal = (
                <ClockDisplay
                    showModal={showClockDisplaySettings}
                    onClose={this.closeClockDisplaySettings}
                />
            );
        }

        let timezoneOption;

        const disableClockDisplaySeparator = enableTimezone;
        if (enableTimezone) {
            timezoneOption = (
                <SettingsItem
                    defaultMessage='Timezone'
                    i18nId='mobile.advanced_settings.timezone'
                    iconName='ios-globe'
                    iconType='ion'
                    onPress={this.goToTimezoneSettings}
                    separator={false}
                    showArrow={false}
                    theme={theme}
                    isLandscape={isLandscape}
                />
            );
        }

        let sidebar;
        if (DeviceTypes.IS_TABLET) {
            sidebar = (
                <SettingsItem
                    defaultMessage='Sidebar'
                    i18nId='mobile.display_settings.sidebar'
                    iconName='columns'
                    iconType='fontawesome'
                    onPress={this.goToSidebarSettings}
                    separator={true}
                    showArrow={false}
                    theme={theme}
                    isLandscape={isLandscape}
                />
            );
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <View style={style.divider}/>
                    {sidebar}
                    {enableTheme && (
                        <SettingsItem
                            defaultMessage='Theme'
                            i18nId='mobile.display_settings.theme'
                            iconName='ios-color-palette'
                            iconType='ion'
                            onPress={this.goToThemeSettings}
                            separator={true}
                            showArrow={false}
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                    )}
                    <SettingsItem
                        defaultMessage='Clock Display'
                        i18nId='mobile.advanced_settings.clockDisplay'
                        iconName='ios-time'
                        iconType='ion'
                        onPress={this.goToClockDisplaySettings}
                        separator={disableClockDisplaySeparator}
                        showArrow={false}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                    {timezoneOption}
                    <View style={style.divider}/>
                </View>
                {clockDisplayModal}
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
            flex: 1,
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
