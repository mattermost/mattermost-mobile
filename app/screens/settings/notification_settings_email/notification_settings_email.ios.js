// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {
    ScrollView,
    View,
} from 'react-native';
import {Preferences} from 'mattermost-redux/constants';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';

import NotificationSettingsEmailBase from './notification_settings_email_base';

class NotificationSettingsEmailIos extends NotificationSettingsEmailBase {
    renderEmailSection() {
        const {
            enableEmailBatching,
            sendEmailNotifications,
            siteName,
            theme,
            isLandscape,
        } = this.props;
        const {newInterval} = this.state;
        const style = getStyleSheet(theme);

        return (
            <Section
                headerId={t('mobile.notification_settings.email.send')}
                headerDefaultMessage='SEND EMAIL NOTIFICATIONS'
                footerId={t('user.settings.notifications.emailInfo')}
                footerDefaultMessage='Email notifications are sent for mentions and direct messages when you are offline or away from {siteName} for more than 5 minutes.'
                footerValues={{siteName}}
                disableFooter={!sendEmailNotifications}
                theme={theme}
                isLandscape={isLandscape}
            >
                {sendEmailNotifications &&
                <View>
                    <SectionItem
                        label={(
                            <FormattedText
                                id='user.settings.notifications.email.immediately'
                                defaultMessage='Immediately'
                            />
                        )}
                        action={this.setEmailInterval}
                        actionType='select'
                        actionValue={Preferences.INTERVAL_IMMEDIATE.toString()}
                        selected={newInterval === Preferences.INTERVAL_IMMEDIATE.toString()}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                    <View style={style.separator}/>
                    {enableEmailBatching &&
                    <View>
                        <SectionItem
                            label={(
                                <FormattedText
                                    id='mobile.user.settings.notifications.email.fifteenMinutes'
                                    defaultMessage='Every 15 minutes'
                                />
                            )}
                            action={this.setEmailInterval}
                            actionType='select'
                            actionValue={Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                            selected={newInterval === Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                        <View style={style.separator}/>
                        <SectionItem
                            label={(
                                <FormattedText
                                    id='user.settings.notifications.email.everyHour'
                                    defaultMessage='Every hour'
                                />
                            )}
                            action={this.setEmailInterval}
                            actionType='select'
                            actionValue={Preferences.INTERVAL_HOUR.toString()}
                            selected={newInterval === Preferences.INTERVAL_HOUR.toString()}
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                        <View style={style.separator}/>
                    </View>
                    }
                    <SectionItem
                        label={(
                            <FormattedText
                                id='user.settings.notifications.email.never'
                                defaultMessage='Never'
                            />
                        )}
                        action={this.setEmailInterval}
                        actionType='select'
                        actionValue={Preferences.INTERVAL_NEVER.toString()}
                        selected={newInterval === Preferences.INTERVAL_NEVER.toString()}
                        theme={theme}
                        isLandscape={isLandscape}
                    />
                </View>
                }
                {!sendEmailNotifications &&
                <FormattedText
                    id='user.settings.general.emailHelp2'
                    defaultMessage='Email has been disabled by your System Administrator. No notification emails will be sent until it is enabled.'
                    style={[style.disabled, padding(isLandscape)]}
                />
                }
            </Section>
        );
    }

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                    alwaysBounceVertical={false}
                >
                    {this.renderEmailSection()}
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

export default NotificationSettingsEmailIos;
