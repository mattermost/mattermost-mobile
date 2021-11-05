// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    ScrollView,
    Switch,
    View,
} from 'react-native';

import FormattedText from '@components/formatted_text';
import RadioButtonGroup from '@components/radio_button';
import StatusBar from '@components/status_bar';
import {ViewTypes} from '@constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelNotificationPreferenceBase from './channel_notification_preference_base';

export default class ChannelNotificationPreferenceAndroid extends ChannelNotificationPreferenceBase {
    getRadioItems = () => {
        const {intl} = this.context;
        const items = this.getItems();
        const radioItems = [];
        items.forEach((element) => {
            const e = {
                label: intl.formatMessage({
                    id: element.id,
                    defaultMessage: element.defaultMessage,
                }, element.labelValues),
                value: element.value,
                checked: element.checked,
            };
            radioItems.push(e);
        });
        return radioItems;
    }

    render() {
        const {theme, isCollapsedThreadsEnabled} = this.props;
        const {notificationLevel, notificationThreadsLevel} = this.state;
        const style = getStyleSheet(theme);

        const options = this.getRadioItems();

        return (
            <View
                testID='channel_notification_preference.screen'
                style={style.container}
            >
                <StatusBar/>
                <FormattedText
                    id='channel_notifications.preference.header'
                    defaultMessage='Send Notifications'
                    style={style.header}
                />
                <ScrollView
                    contentContainerStyle={style.wrapper}
                    alwaysBounceVertical={false}
                >
                    <RadioButtonGroup
                        name='pushSettings'
                        onSelect={this.handlePress}
                        options={options}
                    />

                    {isCollapsedThreadsEnabled && notificationLevel === ViewTypes.NotificationLevels.MENTION && (
                        <>
                            <FormattedText
                                id='mobile.notification_settings.push_threads.title_android'
                                defaultMessage='Thread reply notifications'
                                style={style.switchHeader}
                            />
                            <View style={style.switchContainer}>
                                <FormattedText
                                    id='mobile.notification_settings.push_threads.description'
                                    defaultMessage={'Notify me about all replies to threads I\'m following'}
                                    style={style.switchLabel}
                                />
                                <Switch
                                    onValueChange={this.handleThreadsPress}
                                    value={notificationThreadsLevel === ViewTypes.NotificationLevels.ALL}
                                />
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.03),
        },
        wrapper: {
            marginLeft: 16,
        },
        header: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 13,
            marginTop: 10,
            padding: 16,
        },
        switchContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 16,
        },
        switchHeader: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 13,
            marginTop: 10,
            marginBottom: 16,
        },
        switchLabel: {
            color: theme.centerChannelColor,
            flex: 1,
            fontSize: 17,
            paddingRight: 10,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
    };
});
