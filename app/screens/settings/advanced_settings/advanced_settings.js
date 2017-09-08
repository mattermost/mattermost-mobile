// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    Platform,
    View
} from 'react-native';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

class AdvancedSettings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            purgeOfflineStore: PropTypes.func.isRequired
        }).isRequired,
        intl: intlShape.isRequired,
        theme: PropTypes.object
    };

    clearOfflineCache = () => {
        const {actions, intl} = this.props;

        Alert.alert(
            intl.formatMessage({id: 'mobile.advanced_settings.reset_title', defaultMessage: 'Reset Cache'}),
            intl.formatMessage({id: 'mobile.advanced_settings.reset_message', defaultMessage: '\nThis will reset all offline data and restart the app. You will be automatically logged back in once the app restarts.\n'}),
            [{
                text: intl.formatMessage({id: 'mobile.advanced_settings.reset_button', defaultMessage: 'Reset'}),
                onPress: () => actions.purgeOfflineStore()
            }, {
                text: intl.formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'}),
                onPress: () => true
            }]
        );
    };

    handlePress = (action) => {
        preventDoubleTap(action, this);
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Reset Cache'
                        i18nId='mobile.advanced_settings.reset_title'
                        iconName='ios-refresh'
                        iconType='ion'
                        onPress={() => this.handlePress(this.clearOfflineCache)}
                        separator={false}
                        showArrow={false}
                        theme={theme}
                    />
                    <View style={style.divider}/>
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
        }
    };
});

export default injectIntl(AdvancedSettings);
