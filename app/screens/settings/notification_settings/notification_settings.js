// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import deepEqual from 'deep-equal';

import {Preferences, RequestStatus} from 'mattermost-redux/constants';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

import FormattedText from 'app/components/formatted_text';
import RadioButtonGroup from 'app/components/radio_button';
import StatusBar from 'app/components/status_bar';
import NotificationPreferences from 'app/notification_preferences';
import SettingsItem from 'app/screens/settings/settings_item';
import {getNotificationProps} from 'app/utils/notify_props';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

class NotificationSettings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleUpdateUserNotifyProps: PropTypes.func.isRequired,
        }),
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        myPreferences: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        updateMeRequest: PropTypes.object.isRequired,
    };

    state = {
        showEmailNotificationsModal: false,
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const {updateMeRequest, intl} = nextProps;
        if (this.props.updateMeRequest !== updateMeRequest && updateMeRequest.status === RequestStatus.FAILURE) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.notification_settings.save_failed_title',
                    defaultMessage: 'Connection issue',
                }),
                intl.formatMessage({
                    id: 'mobile.notification_settings.save_failed_description',
                    defaultMessage: 'The notification settings failed to save due to a connection issue, please try again.',
                })
            );
        }
    }

    handlePress = preventDoubleTap((action) => {
        action();
    });

    goToNotificationSettingsEmail = () => {
        if (Platform.OS === 'ios') {
            const {currentUser, intl, navigator, theme} = this.props;
            navigator.push({
                backButtonTitle: '',
                screen: 'NotificationSettingsEmail',
                title: intl.formatMessage({
                    id: 'mobile.notification_settings.email_title',
                    defaultMessage: 'Email Notifications',
                }),
                animated: true,
                navigatorStyle: {
                    navBarTextColor: theme.sidebarHeaderTextColor,
                    navBarBackgroundColor: theme.sidebarHeaderBg,
                    navBarButtonColor: theme.sidebarHeaderTextColor,
                    screenBackgroundColor: theme.centerChannelBg,
                },
                passProps: {
                    currentUser,
                    onBack: this.saveNotificationProps,
                },
            });
        } else {
            this.setState({showEmailNotificationsModal: true});
        }
    };

    goToNotificationSettingsMentions = () => {
        const {currentUser, intl, navigator, theme} = this.props;
        navigator.push({
            backButtonTitle: '',
            screen: 'NotificationSettingsMentions',
            title: intl.formatMessage({id: 'mobile.notification_settings.mentions_replies', defaultMessage: 'Mentions and Replies'}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                currentUser,
                onBack: this.saveNotificationProps,
            },
        });
    };

    goToNotificationSettingsMobile = () => {
        const {currentUser, intl, navigator, theme} = this.props;

        NotificationPreferences.getPreferences().then((notificationPreferences) => {
            requestAnimationFrame(() => {
                navigator.push({
                    backButtonTitle: '',
                    screen: 'NotificationSettingsMobile',
                    title: intl.formatMessage({id: 'mobile.notification_settings.mobile_title', defaultMessage: 'Mobile Notifications'}),
                    animated: true,
                    navigatorStyle: {
                        navBarTextColor: theme.sidebarHeaderTextColor,
                        navBarBackgroundColor: theme.sidebarHeaderBg,
                        navBarButtonColor: theme.sidebarHeaderTextColor,
                        screenBackgroundColor: theme.centerChannelBg,
                    },
                    passProps: {
                        currentUser,
                        onBack: this.saveNotificationProps,
                        notificationPreferences,
                    },
                });
            });
        }).catch((e) => {
            Alert.alert('There was a problem getting the device preferences', e.message);
        });
    };

    setEmailNotifications = (emailSetting) => {
        this.setState({emailSetting});
    };

    saveEmailNotifications = () => {
        const {config, currentUser} = this.props;
        const {emailSetting} = this.state;

        this.setState({showEmailNotificationsModal: false});

        if (emailSetting) {
            let email = emailSetting;
            let interval;

            const emailBatchingEnabled = config.EnableEmailBatching === 'true';
            if (emailBatchingEnabled && emailSetting !== 'false') {
                interval = emailSetting;
                email = 'true';
            }

            this.saveNotificationProps({
                ...getNotificationProps(currentUser),
                email,
                interval,
            });
        }
    };

    saveNotificationProps = (notifyProps) => {
        const {currentUser} = this.props;
        const {user_id: userId} = notifyProps;
        const previousProps = {
            ...getNotificationProps(currentUser),
            user_id: userId,
        };

        if (notifyProps.interval) {
            previousProps.interval = notifyProps.interval;
        }

        if (!deepEqual(previousProps, notifyProps)) {
            this.props.actions.handleUpdateUserNotifyProps(notifyProps);
        }
    };

    renderEmailNotificationSettings = (style) => {
        if (Platform.OS === 'ios') {
            return null;
        }

        const {config, currentUser, intl, myPreferences} = this.props;
        const notifyProps = getNotificationProps(currentUser);
        const sendEmailNotifications = config.SendEmailNotifications === 'true';
        const emailBatchingEnabled = sendEmailNotifications && config.EnableEmailBatching === 'true';

        const never = notifyProps.email === 'false';
        let sendImmediatley = notifyProps.email === 'true';
        let sendImmediatleyValue = 'true';
        let fifteenMinutes;
        let hourly;
        let interval;

        if (emailBatchingEnabled) {
            const emailPreferences = getPreferencesByCategory(myPreferences, Preferences.CATEGORY_NOTIFICATIONS);
            if (emailPreferences.size) {
                interval = emailPreferences.get(Preferences.EMAIL_INTERVAL).value;
            }
        }

        if (emailBatchingEnabled && notifyProps.email !== 'false') {
            sendImmediatley = interval === Preferences.INTERVAL_IMMEDIATE.toString();
            fifteenMinutes = interval === Preferences.INTERVAL_FIFTEEN_MINUTES.toString();
            hourly = interval === Preferences.INTERVAL_HOUR.toString();
            sendImmediatleyValue = Preferences.INTERVAL_IMMEDIATE.toString();
        }

        let helpText;
        if (sendEmailNotifications) {
            helpText = (
                <FormattedText
                    id='user.settings.notifications.emailInfo'
                    defaultMessage='Email notifications are sent for mentions and direct messages when you are offline or away from {siteName} for more than 5 minutes.'
                    values={{siteName: config.SiteName}}
                    style={style.modalHelpText}
                />
            );
        }

        const emailOptions = [{
            label: intl.formatMessage({
                id: 'user.settings.notifications.email.immediately',
                defaultMessage: 'Immediately',
            }),
            value: sendImmediatleyValue,
            checked: sendImmediatley,
        }];

        if (emailBatchingEnabled) {
            emailOptions.push({
                label: intl.formatMessage({
                    id: 'user.settings.notifications.email.everyXMinutes',
                    defaultMessage: 'Every {count, plural, one {minute} other {{count, number} minutes}}',
                }, {count: Preferences.INTERVAL_FIFTEEN_MINUTES / 60}),
                value: Preferences.INTERVAL_FIFTEEN_MINUTES.toString(),
                checked: fifteenMinutes,
            }, {
                label: intl.formatMessage({
                    id: 'user.settings.notifications.email.everyHour',
                    defaultMessage: 'Every hour',
                }),
                value: Preferences.INTERVAL_HOUR.toString(),
                checked: hourly,
            });
        }

        emailOptions.push({
            label: intl.formatMessage({
                id: 'user.settings.notifications.email.never',
                defaultMessage: 'Never',
            }),
            value: 'false',
            checked: never,
        });

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={this.state.showEmailNotificationsModal}
                onRequestClose={() => this.setState({showEmailNotificationsModal: false})}
            >
                <View style={style.modalOverlay}>
                    <View style={style.modal}>
                        <View style={style.modalBody}>
                            <View style={style.modalTitleContainer}>
                                <FormattedText
                                    id='user.settings.notifications.email.send'
                                    defaultMessage='Send email notifications'
                                    style={style.modalTitle}
                                />
                            </View>
                            {!sendEmailNotifications &&
                            <FormattedText
                                id='user.settings.general.emailHelp2'
                                defaultMessage='Email has been disabled by your System Administrator. No notification emails will be sent until it is enabled.'
                                style={style.modalOptionDisabled}
                            />
                            }
                            {sendEmailNotifications &&
                            <RadioButtonGroup
                                name='emailSettings'
                                onSelect={this.setEmailNotifications}
                                options={emailOptions}
                            />
                            }
                            {helpText}
                        </View>
                        <View style={style.modalFooter}>
                            <View style={style.divider}/>
                            <View style={style.modalFooterContainer}>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.saveEmailNotifications}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_cancel'
                                        defaultMessage='CANCEL'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                                {sendEmailNotifications &&
                                <View>
                                    <View style={{marginRight: 10}}/>
                                    <TouchableOpacity
                                        style={style.modalFooterOptionContainer}
                                        onPress={this.saveEmailNotifications}
                                    >
                                        <FormattedText
                                            id='mobile.notification_settings.modal_save'
                                            defaultMessage='SAVE'
                                            style={style.modalFooterOption}
                                        />
                                    </TouchableOpacity>
                                </View>
                                }
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);
        const showArrow = Platform.OS === 'ios';

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    contentContainerStyle={style.wrapper}
                    alwaysBounceVertical={false}
                >
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Mentions and Replies'
                        i18nId='mobile.notification_settings.mentions_replies'
                        iconName='md-at'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToNotificationSettingsMentions)}
                        separator={true}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Mobile'
                        i18nId='mobile.notification_settings.mobile'
                        iconName='md-phone-portrait'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToNotificationSettingsMobile)}
                        separator={true}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Email'
                        i18nId='mobile.notification_settings.email'
                        iconName='ios-mail'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToNotificationSettingsEmail)}
                        separator={false}
                        showArrow={showArrow}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                </ScrollView>
                {this.renderEmailNotificationSettings(style)}
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
            ...Platform.select({
                ios: {
                    paddingTop: 35,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
        modalOverlay: {
            backgroundColor: changeOpacity('#000000', 0.6),
            alignItems: 'center',
            flex: 1,
        },
        modal: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
            marginTop: 20,
            width: '95%',
        },
        modalBody: {
            paddingHorizontal: 24,
        },
        modalTitleContainer: {
            marginBottom: 30,
            marginTop: 20,
        },
        modalTitle: {
            color: theme.centerChannelColor,
            fontSize: 19,
        },
        modalOptionDisabled: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 17,
        },
        modalHelpText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
            marginTop: 20,
        },
        modalFooter: {
            alignItems: 'flex-end',
            height: 58,
            marginTop: 40,
            width: '100%',
        },
        modalFooterContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            paddingRight: 24,
        },
        modalFooterOptionContainer: {
            alignItems: 'center',
            height: 40,
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingVertical: 5,
        },
        modalFooterOption: {
            color: theme.linkColor,
            fontSize: 14,
        },
    };
});

export default injectIntl(NotificationSettings);
