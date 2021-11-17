// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {ViewTypes} from '@constants';
import {alertErrorWithFallback} from '@utils/general';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

export default class ChannelNotificationPreferenceBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            updateChannelNotifyProps: PropTypes.func.isRequired,
        }),
        channelId: PropTypes.string.isRequired,
        globalNotifyProps: PropTypes.object.isRequired,
        notifyProps: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        userId: PropTypes.string.isRequired,
        isCollapsedThreadsEnabled: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            notificationLevel: props.notifyProps?.push || ViewTypes.NotificationLevels.DEFAULT,
            notificationThreadsLevel: props.notifyProps?.push_threads || ViewTypes.NotificationLevels.ALL,
        };
    }

    getItems = () => {
        const {formatMessage} = this.context.intl;
        const {globalNotifyProps} = this.props;
        const {notificationLevel} = this.state;
        const defaultNotificationLevel = formatMessage({id: `channel_header.notificationPreference.${globalNotifyProps?.push.toLowerCase()}`});

        return [{
            id: t('channel_notifications.preference.global_default'),
            defaultMessage: 'Global default ({notifyLevel})',
            labelValues: {notifyLevel: defaultNotificationLevel},
            value: ViewTypes.NotificationLevels.DEFAULT,
            checked: notificationLevel === ViewTypes.NotificationLevels.DEFAULT,
        }, {
            id: t('channel_notifications.preference.all_activity'),
            defaultMessage: 'For all activity',
            labelValues: undefined,
            value: ViewTypes.NotificationLevels.ALL,
            checked: notificationLevel === ViewTypes.NotificationLevels.ALL,
        }, {
            id: t('channel_notifications.preference.only_mentions'),
            defaultMessage: 'Only mentions and direct messages',
            labelValues: undefined,
            value: ViewTypes.NotificationLevels.MENTION,
            checked: notificationLevel === ViewTypes.NotificationLevels.MENTION,
        }, {
            id: t('channel_notifications.preference.never'),
            defaultMessage: 'Never',
            labelValues: undefined,
            value: ViewTypes.NotificationLevels.NONE,
            checked: notificationLevel === ViewTypes.NotificationLevels.NONE,
        }];
    }

    handleSubmit = (push, push_threads) => {
        const {actions, channelId, userId, isCollapsedThreadsEnabled} = this.props;

        const props = {
            push,
        };

        if (isCollapsedThreadsEnabled) {
            props.push_threads = push_threads;
        }

        return actions.updateChannelNotifyProps(userId, channelId, props);
    };

    handleThreadsPress = preventDoubleTap(async (value) => {
        const newNotificationLevel = value ? ViewTypes.NotificationLevels.ALL : ViewTypes.NotificationLevels.MENTION;
        const {notificationThreadsLevel, notificationLevel} = this.state;

        if (newNotificationLevel === notificationThreadsLevel) {
            // tapped on current selection.
            return;
        }

        this.setState({
            notificationThreadsLevel: newNotificationLevel,
        });

        const {error} = await this.handleSubmit(notificationLevel, newNotificationLevel);
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
                notificationThreadsLevel,
            });
        }
    });

    handlePress = preventDoubleTap(async (newNotificationLevel) => {
        const {notificationLevel, notificationThreadsLevel} = this.state;

        if (newNotificationLevel === notificationLevel) {
            // tapped on current selection.
            return;
        }

        this.setState({
            notificationLevel: newNotificationLevel,
        });

        const {error} = await this.handleSubmit(newNotificationLevel, notificationThreadsLevel);
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
}
