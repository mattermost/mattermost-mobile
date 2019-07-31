// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {injectIntl} from 'react-intl';
import {
    ScrollView,
    View,
} from 'react-native';
import SafeAreaView from 'app/components/safe_area_view';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';

import NotificationSettingsMobileBase from './notification_settings_mobile_base';

class NotificationSettingsMobileIos extends NotificationSettingsMobileBase {
    renderMobilePushSection(style) {
        const {config, theme, isLandscape} = this.props;

        const pushNotificationsEnabled = config.SendPushNotifications === 'true';
        return (
            <Section
                headerId={t('mobile.notification_settings_mobile.push_activity')}
                headerDefaultMessage='SEND NOTIFICATIONS'
                theme={theme}
                isLandscape={isLandscape}
            >
                {pushNotificationsEnabled &&
                <View>
                    <SectionItem
                        label={(
                            <FormattedText
                                id='user.settings.notifications.allActivity'
                                defaultMessage='For all activity'
                            />
                        )}
                        action={this.setMobilePush}
                        actionType='select'
                        actionValue='all'
                        selected={this.state.push === 'all'}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                    <View style={style.separator}/>
                    <SectionItem
                        label={(
                            <FormattedText
                                id='user.settings.notifications.onlyMentions'
                                defaultMessage='Only for mentions and direct messages'
                            />
                        )}
                        action={this.setMobilePush}
                        actionType='select'
                        actionValue='mention'
                        selected={this.state.push === 'mention'}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                    <View style={style.separator}/>
                    <SectionItem
                        label={(
                            <FormattedText
                                id='user.settings.notifications.never'
                                defaultMessage='Never'
                            />
                        )}
                        action={this.setMobilePush}
                        actionType='select'
                        actionValue='none'
                        selected={this.state.push === 'none'}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                </View>
                }
                {!pushNotificationsEnabled &&
                <FormattedText
                    id='user.settings.push_notification.disabled_long'
                    defaultMessage='Push notifications for mobile devices have been disabled by your System Administrator.'
                    style={[style.disabled, padding(isLandscape)]}
                />
                }
            </Section>
        );
    }

    renderMobilePushStatusSection(style) {
        const {config, theme, isLandscape} = this.props;

        const showSection = config.SendPushNotifications === 'true' && this.state.push !== 'none';
        if (!showSection) {
            return null;
        }

        return (
            <Section
                headerId={t('mobile.notification_settings_mobile.push_status')}
                headerDefaultMessage='TRIGGER PUSH NOTIFICATIONS WHEN'
                theme={theme}
                isLandscape={isLandscape}
            >
                <SectionItem
                    label={(
                        <FormattedText
                            id='user.settings.push_notification.online'
                            defaultMessage='Online, away or offline'
                        />
                    )}
                    action={this.setMobilePushStatus}
                    actionType='select'
                    actionValue='online'
                    selected={this.state.push_status === 'online'}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                <View style={style.separator}/>
                <SectionItem
                    label={(
                        <FormattedText
                            id='user.settings.push_notification.away'
                            defaultMessage='Away or offline'
                        />
                    )}
                    action={this.setMobilePushStatus}
                    actionType='select'
                    actionValue='away'
                    selected={this.state.push_status === 'away'}
                    theme={theme}
                    isLandscape={isLandscape}
                />
                <View style={style.separator}/>
                <SectionItem
                    label={(
                        <FormattedText
                            id='user.settings.push_notification.offline'
                            defaultMessage='Offline'
                        />
                    )}
                    action={this.setMobilePushStatus}
                    actionType='select'
                    actionValue='offline'
                    selected={this.state.push_status === 'offline'}
                    theme={theme}
                    isLandscape={isLandscape}
                />
            </Section>
        );
    }

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <SafeAreaView>
                <View style={style.container}>
                    <StatusBar/>
                    <ScrollView
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                        alwaysBounceVertical={false}
                    >
                        {this.renderMobilePushSection(style)}
                        {this.renderMobilePushStatusSection(style)}
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 35,
        },
        disabled: {
            color: theme.centerChannelColor,
            fontSize: 15,
            paddingHorizontal: 15,
            paddingVertical: 10,
        },
    };
});

export default injectIntl(NotificationSettingsMobileIos);
