// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {injectIntl} from 'react-intl';
import {
    ScrollView,
    View,
} from 'react-native';

import FormattedText from '@components/formatted_text';
import SafeAreaView from '@components/safe_area_view';
import StatusBar from '@components/status_bar';
import Section from '@screens/settings/section';
import SectionItem from '@screens/settings/section_item';
import {t} from '@utils/i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import NotificationSettingsMobileBase from './notification_settings_mobile_base';

class NotificationSettingsMobileIos extends NotificationSettingsMobileBase {
    onMobilePushThreadChanged = (value) => {
        let pushThreads = 'mention';
        if (value) {
            pushThreads = 'all';
        }

        this.setMobilePushThreads(pushThreads, this.saveNotificationProps);
    };

    renderMobilePushSection(style) {
        const {config, theme} = this.props;

        const pushNotificationsEnabled = config.SendPushNotifications === 'true';
        return (
            <Section
                headerId={t('mobile.notification_settings_mobile.push_activity')}
                headerDefaultMessage='SEND NOTIFICATIONS'
                theme={theme}
            >
                {pushNotificationsEnabled &&
                <View>
                    <SectionItem
                        testID='notification_settings_mobile.all.action'
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
                    />
                    <View style={style.separator}/>
                    <SectionItem
                        testID='notification_settings_mobile.mentions.action'
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
                    />
                    <View style={style.separator}/>
                    <SectionItem
                        testID='notification_settings_mobile.never.action'
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
                    />
                </View>
                }
                {!pushNotificationsEnabled &&
                <FormattedText
                    id='user.settings.push_notification.disabled_long'
                    defaultMessage='Push notifications for mobile devices have been disabled by your System Administrator.'
                    style={style.disabled}
                />
                }
            </Section>
        );
    }

    renderMobilePushThreadsSection(style) {
        const {theme} = this.props;

        return (
            <Section
                headerId={t('mobile.notification_settings.push_threads.title')}
                headerDefaultMessage='THREAD REPLY NOTIFICATIONS'
                footerId={t('mobile.notification_settings.push_threads.info')}
                footerDefaultMessage={'When enabled, any reply to a thread you\'re following will send a mobile push notification'}
                theme={theme}
            >
                <SectionItem
                    label={(
                        <FormattedText
                            id='mobile.notification_settings.push_threads.description'
                            defaultMessage={'Notify me about all replies to threads I\'m following'}
                        />
                    )}
                    description={<View/>}
                    action={this.onMobilePushThreadChanged}
                    actionType='toggle'
                    selected={this.state.push_threads === 'all'}
                    theme={theme}
                />
                <View style={style.separator}/>
            </Section>
        );
    }

    renderMobilePushStatusSection(style) {
        const {config, theme} = this.props;

        const showSection = config.SendPushNotifications === 'true' && this.state.push !== 'none';
        if (!showSection) {
            return null;
        }

        return (
            <Section
                headerId={t('mobile.notification_settings_mobile.push_status')}
                headerDefaultMessage='TRIGGER PUSH NOTIFICATIONS WHEN'
                theme={theme}
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
                />
            </Section>
        );
    }

    render() {
        const {theme, isCollapsedThreadsEnabled} = this.props;
        const style = getStyleSheet(theme);

        return (
            <SafeAreaView
                excludeHeader={true}
                excludeFooter={true}
            >
                <View
                    testID='notification_settings_mobile.screen'
                    style={style.container}
                >
                    <StatusBar/>
                    <ScrollView
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                        alwaysBounceVertical={false}
                    >
                        {this.renderMobilePushSection(style)}
                        {isCollapsedThreadsEnabled && this.state.push === 'mention' && (
                            this.renderMobilePushThreadsSection(style)
                        )}
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
            paddingVertical: 30,
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
