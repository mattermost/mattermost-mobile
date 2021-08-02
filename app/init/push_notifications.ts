// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import {AppState, DeviceEventEmitter, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
    Notification,
    NotificationAction,
    NotificationBackgroundFetchResult,
    NotificationCategory,
    NotificationCompletion,
    Notifications,
    NotificationTextInput,
    Registered,
} from 'react-native-notifications';

import {Device, General, Navigation} from '@constants';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getLaunchPropsFromNotification, relaunchApp} from '@init/launch';
import NativeNotifications from '@notifications';
import {queryMentionCount} from '@queries/app/global';
import {queryCurrentChannelId} from '@queries/servers/system';
import {showOverlay} from '@screens/navigation';

const CATEGORY = 'CAN_REPLY';
const REPLY_ACTION = 'REPLY_ACTION';
const NOTIFICATION_TYPE = {
    CLEAR: 'clear',
    MESSAGE: 'message',
    SESSION: 'session',
};

class PushNotifications {
  configured = false;

  init() {
      Notifications.registerRemoteNotifications();
      Notifications.events().registerNotificationOpened(this.onNotificationOpened);
      Notifications.events().registerRemoteNotificationsRegistered(this.onRemoteNotificationsRegistered);
      Notifications.events().registerNotificationReceivedBackground(this.onNotificationReceivedBackground);
      Notifications.events().registerNotificationReceivedForeground(this.onNotificationReceivedForeground);
  }

  cancelAllLocalNotifications = () => {
      Notifications.cancelAllLocalNotifications();
  };

  clearNotifications = (serverUrl: string) => {
      // TODO Notifications: Only cancel the local notifications that belong to this server

      // eslint-disable-next-line no-console
      console.log('Clear notifications for server', serverUrl);
      this.cancelAllLocalNotifications();

      if (Platform.OS === 'ios') {
          // TODO Notifications: Set the badge number to the total amount of mentions on other servers
          Notifications.ios.setBadgeCount(0);
      }
  };

  clearChannelNotifications = async (channelId: string) => {
      const notifications = await NativeNotifications.getDeliveredNotifications();
      if (Platform.OS === 'android') {
          const notificationForChannel = notifications.find(
              (n: NotificationWithChannel) => n.channel_id === channelId,
          );
          if (notificationForChannel) {
              NativeNotifications.removeDeliveredNotifications(
                  notificationForChannel.identifier,
                  channelId,
              );
          }
      } else {
          const ids: string[] = [];
          let badgeCount = notifications.length;

          for (const notification of notifications) {
              if (notification.channel_id === channelId) {
                  ids.push(notification.identifier);
                  badgeCount--;
              }
          }

          // Set the badgeCount with default database mention count aggregate
          const appDatabase = DatabaseManager.appDatabase?.database;
          if (appDatabase) {
              const mentions = await queryMentionCount(appDatabase);
              if (mentions) {
                  badgeCount = parseInt(mentions, 10);
              }
          }

          if (ids.length) {
              NativeNotifications.removeDeliveredNotifications(ids);
          }

          if (Platform.OS === 'ios') {
              badgeCount = badgeCount <= 0 ? 0 : badgeCount;
              Notifications.ios.setBadgeCount(badgeCount);
          }
      }
  };

  createReplyCategory = () => {
      const replyTitle = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.title'));
      const replyButton = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.button'));
      const replyPlaceholder = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.placeholder'));
      const replyTextInput: NotificationTextInput = {buttonTitle: replyButton, placeholder: replyPlaceholder};
      const replyAction = new NotificationAction(REPLY_ACTION, 'background', replyTitle, true, replyTextInput);
      return new NotificationCategory(CATEGORY, [replyAction]);
  };

  handleNotification = async (notification: NotificationWithData) => {
      const {payload, foreground, userInteraction} = notification;

      if (payload) {
          switch (payload.type) {
              case NOTIFICATION_TYPE.CLEAR:
                  // TODO Notifications: Mark the channel as read
                  break;
              case NOTIFICATION_TYPE.MESSAGE:
                  // TODO Notifications: fetch the posts for the channel

                  if (foreground) {
                      this.handleInAppNotification(notification);
                  } else if (userInteraction && !payload.userInfo?.local) {
                      const props = getLaunchPropsFromNotification(notification);
                      relaunchApp(props, true);
                  }
                  break;
              case NOTIFICATION_TYPE.SESSION:
                  // eslint-disable-next-line no-console
                  console.log('Session expired notification');

                  if (payload.server_url) {
                      DeviceEventEmitter.emit(General.SERVER_LOGOUT, payload.server_url);
                  }
                  break;
          }
      }
  };

  handleInAppNotification = async (notification: NotificationWithData) => {
      const {payload} = notification;

      if (payload?.server_url) {
          const database = DatabaseManager.serverDatabases[payload.server_url]?.database;
          const channelId = await queryCurrentChannelId(database);

          if (channelId && payload.channel_id !== channelId) {
              const screen = 'Notification';
              const passProps = {
                  notification,
              };

              DeviceEventEmitter.emit(Navigation.NAVIGATION_SHOW_OVERLAY);
              showOverlay(screen, passProps);
          }
      }
  };

  localNotification = (notification: Notification) => {
      Notifications.postLocalNotification(notification);
  };

  onNotificationOpened = (notification: NotificationWithData, completion: () => void) => {
      notification.userInteraction = true;
      this.handleNotification(notification);
      completion();
  };

  onNotificationReceivedBackground = (notification: NotificationWithData, completion: (response: NotificationBackgroundFetchResult) => void) => {
      this.handleNotification(notification);
      completion(NotificationBackgroundFetchResult.NO_DATA);
  };

  onNotificationReceivedForeground = (notification: NotificationWithData, completion: (response: NotificationCompletion) => void) => {
      notification.foreground = AppState.currentState === 'active';
      completion({alert: false, sound: true, badge: true});
      this.handleNotification(notification);
  };

  onRemoteNotificationsRegistered = async (event: Registered) => {
      if (!this.configured) {
          this.configured = true;
          const {deviceToken} = event;
          let prefix;

          if (Platform.OS === 'ios') {
              prefix = Device.PUSH_NOTIFY_APPLE_REACT_NATIVE;
              if (DeviceInfo.getBundleId().includes('rnbeta')) {
                  prefix = `${prefix}beta`;
              }
          } else {
              prefix = Device.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
          }

          const operator = DatabaseManager.appDatabase?.operator;

          if (!operator) {
              return {error: 'No App database found'};
          }

          operator.handleGlobal({
              global: [{id: GLOBAL_IDENTIFIERS.DEVICE_TOKEN, value: `${prefix}:${deviceToken}`}],
              prepareRecordsOnly: false,
          });

          // Store the device token in the default database
          this.requestNotificationReplyPermissions();
      }
      return null;
  };

  requestNotificationReplyPermissions = () => {
      if (Platform.OS === 'ios') {
          const replyCategory = this.createReplyCategory();
          Notifications.setCategories([replyCategory]);
      }
  };

  scheduleNotification = (notification: Notification) => {
      if (notification.fireDate) {
          if (Platform.OS === 'ios') {
              notification.fireDate = new Date(notification.fireDate).toISOString();
          }

          Notifications.postLocalNotification(notification);
      }
  };
}

export default new PushNotifications();
