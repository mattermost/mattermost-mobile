// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Modal,
    Platform,
    TouchableOpacity,
    View,
} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';
import {getEmailInterval} from 'mattermost-redux/utils/notify_props';

import FormattedText from 'app/components/formatted_text';
import RadioButtonGroup from 'app/components/radio_button';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class NotificationSettingsEmailAndroid extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            savePreferences: PropTypes.func.isRequired,
        }),
        currentUserId: PropTypes.string.isRequired,
        emailInterval: PropTypes.string.isRequired,
        enableEmailBatching: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        sendEmailNotifications: PropTypes.bool.isRequired,
        siteName: PropTypes.string,
        theme: PropTypes.object.isRequired,
        visible: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        const {
            emailInterval,
            enableEmailBatching,
            sendEmailNotifications,
        } = props;

        this.state = {
            interval: getEmailInterval(
                sendEmailNotifications,
                enableEmailBatching,
                parseInt(emailInterval, 10),
            ).toString(),
        };
    }

    componentWillReceiveProps(nextProps) {
        if (
            this.props.sendEmailNotifications !== nextProps.sendEmailNotifications ||
            this.props.enableEmailBatching !== nextProps.enableEmailBatching ||
            this.props.emailInterval !== nextProps.emailInterval
        ) {
            this.setState({
                interval: getEmailInterval(
                    nextProps.sendEmailNotifications,
                    nextProps.enableEmailBatching,
                    parseInt(nextProps.emailInterval, 10),
                ).toString(),
            });
        }
    }

    setEmailNotifications = (interval) => {
        const {sendEmailNotifications} = this.props;

        let email = 'false';
        if (sendEmailNotifications && interval !== Preferences.INTERVAL_NEVER.toString()) {
            email = 'true';
        }

        this.setState({
            email,
            interval,
        });
    };

    handleClose = () => {
        this.props.onClose();
    }

    handleSaveEmailNotification = () => {
        const {currentUserId} = this.props;
        const {email, interval} = this.state;

        const emailNotify = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUserId, name: 'email', value: email};
        const emailInterval = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUserId, name: Preferences.EMAIL_INTERVAL, value: interval};
        this.props.actions.savePreferences(currentUserId, [emailNotify, emailInterval]);
        this.props.onClose();
    };

    render() {
        if (Platform.OS === 'ios') {
            return null;
        }

        const {intl} = this.context;
        const {
            enableEmailBatching,
            sendEmailNotifications,
            siteName,
            theme,
            visible,
        } = this.props;
        const {interval} = this.state;
        const style = getStyleSheet(theme);

        let helpText;
        if (sendEmailNotifications) {
            helpText = (
                <FormattedText
                    id='user.settings.notifications.emailInfo'
                    defaultMessage='Email notifications are sent for mentions and direct messages when you are offline or away from {siteName} for more than 5 minutes.'
                    values={{siteName}}
                    style={style.modalHelpText}
                />
            );
        }

        const emailOptions = [{
            label: intl.formatMessage({
                id: 'user.settings.notifications.email.immediately',
                defaultMessage: 'Immediately',
            }),
            value: Preferences.INTERVAL_IMMEDIATE.toString(),
            checked: interval === Preferences.INTERVAL_IMMEDIATE.toString(),
        }];

        if (enableEmailBatching) {
            emailOptions.push({
                label: intl.formatMessage({
                    id: 'user.settings.notifications.email.everyXMinutes',
                    defaultMessage: 'Every {count, plural, one {minute} other {{count, number} minutes}}',
                }, {count: Preferences.INTERVAL_FIFTEEN_MINUTES / 60}),
                value: Preferences.INTERVAL_FIFTEEN_MINUTES.toString(),
                checked: interval === Preferences.INTERVAL_FIFTEEN_MINUTES.toString(),
            }, {
                label: intl.formatMessage({
                    id: 'user.settings.notifications.email.everyHour',
                    defaultMessage: 'Every hour',
                }),
                value: Preferences.INTERVAL_HOUR.toString(),
                checked: interval === Preferences.INTERVAL_HOUR.toString(),
            });
        }

        emailOptions.push({
            label: intl.formatMessage({
                id: 'user.settings.notifications.email.never',
                defaultMessage: 'Never',
            }),
            value: Preferences.INTERVAL_NEVER.toString(),
            checked: interval === Preferences.INTERVAL_NEVER.toString(),
        });

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={visible}
                onRequestClose={this.handleClose}
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
                                    onPress={this.handleClose}
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
                                        onPress={this.handleSaveEmailNotification}
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
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
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
