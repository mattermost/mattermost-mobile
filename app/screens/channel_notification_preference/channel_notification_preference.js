// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Platform,
    ScrollView,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {ViewTypes} from '@constants';
import SectionItem from 'app/screens/settings/section_item';
import {alertErrorWithFallback} from 'app/utils/general';
import {t} from '@utils/i18n';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelNotificationPreference extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            updateChannelNotifyProps: PropTypes.func.isRequired,
        }),
        channelId: PropTypes.string.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        notifyProps: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        userId: PropTypes.string.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            notificationLevel: props.notifyProps?.push || ViewTypes.NotificationLevels.DEFAULT,
        };
    }

    handlePress = preventDoubleTap(async (newNotificationLevel) => {
        const {actions, channelId, userId} = this.props;
        const {notificationLevel} = this.state;

        if (newNotificationLevel === notificationLevel) {
            // tapped on current selection.
            return;
        }

        this.setState({
            notificationLevel: newNotificationLevel,
        });

        const props = {push: newNotificationLevel};

        const {error} = await actions.updateChannelNotifyProps(userId, channelId, props);
        if (error) {
            const {intl} = this.context;
            alertErrorWithFallback(
                intl,
                error,
                {
                    id: t('channel_notifications.preference.save_error'),
                    defaultMessage: "We couldn't save notification preference. Please check your connection and try again.",
                },
            );

            // restore old value.
            this.setState({
                notificationLevel,
            });
        }
    });

    render() {
        const {theme, isLandscape} = this.props;
        const {notificationLevel} = this.state;
        const style = getStyleSheet(theme);

        const items = [{
            textId: t('channel_notifications.preference.global_default'),
            defaultMsg: 'Global default (Mentions)',
            notificationType: ViewTypes.NotificationLevels.DEFAULT,
        }, {
            textId: t('channel_notifications.preference.all_activity'),
            defaultMsg: 'For all activity',
            notificationType: ViewTypes.NotificationLevels.ALL,
        }, {
            textId: t('channel_notifications.preference.only_mentions'),
            defaultMsg: 'Only mentions and direct messages',
            notificationType: ViewTypes.NotificationLevels.MENTION,
        }, {
            textId: t('channel_notifications.preference.never'),
            defaultMsg: 'Never',
            notificationType: ViewTypes.NotificationLevels.NONE,
        }];

        return (
            <View style={style.container}>
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
                    {items.map((item) => (
                        <View key={item.notificationType}>
                            <View style={style.divider}/>
                            <SectionItem
                                label={(
                                    <FormattedText
                                        id={item.textId}
                                        defaultMessage={item.defaultMsg}
                                    />
                                )}
                                action={this.handlePress}
                                actionType='select'
                                actionValue={item.notificationType}
                                selected={item.notificationType === notificationLevel}
                                theme={theme}
                                isLandscape={isLandscape}
                            />
                        </View>),
                    )}
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
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        wrapper: {
            ...Platform.select({
                ios: {
                    paddingTop: 35,
                },
            }),
            backgroundColor: theme.centerChannelBg,
        },
        header: {
            fontSize: 16,
            textTransform: 'uppercase',
            marginTop: 4,
            padding: 16,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
    };
});
