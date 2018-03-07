// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Platform,
    View,
} from 'react-native';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ClockDisplay from 'app/screens/clock_display';

export default class DisplaySettings extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {
        showClockDisplaySettings: false,
    };

    goToClockDisplaySettings = preventDoubleTap(() => {
        const {navigator, theme} = this.props;
        const {intl} = this.context;

        if (Platform.OS === 'ios') {
            navigator.push({
                screen: 'ClockDisplay',
                title: intl.formatMessage({id: 'user.settings.display.clockDisplay', defaultMessage: 'Clock Display'}),
                animated: true,
                backButtonTitle: '',
                navigatorStyle: {
                    navBarTextColor: theme.sidebarHeaderTextColor,
                    navBarBackgroundColor: theme.sidebarHeaderBg,
                    navBarButtonColor: theme.sidebarHeaderTextColor,
                    screenBackgroundColor: theme.centerChannelBg,
                },
            });
            return;
        }

        this.setState({showClockDisplaySettings: true});
    });

    closeClockDisplaySettings = () => {
        this.setState({showClockDisplaySettings: false});
    };

    render() {
        const {theme} = this.props;
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

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Clock Display'
                        i18nId='mobile.advanced_settings.clockDisplay'
                        iconName='ios-time'
                        iconType='ion'
                        onPress={this.goToClockDisplaySettings}
                        separator={false}
                        showArrow={false}
                        theme={theme}
                    />
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
