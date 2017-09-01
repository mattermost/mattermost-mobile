// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {injectIntl} from 'react-intl';
import {
    Modal,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {RadioButton, RadioButtonGroup} from 'app/components/radio_button';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import SectionItem from 'app/screens/settings/section_item';

import NotificationSettingsMobileBase from './notification_settings_mobile_base';

class NotificationSettingsMobileAndroid extends NotificationSettingsMobileBase {
    cancelMobilePushModal = () => {
        this.setState({showMobilePushModal: false});
        this.push = this.state.push;
    };

    cancelMobilePushStatusModal = () => {
        this.setState({showMobilePushStatusModal: false});
        this.pushStatus = this.state.push_status;
    };

    onMobilePushChanged = (value) => {
        this.push = value;
    };

    onMobilePushStatusChanged = (value) => {
        this.pushStatus = value;
    };

    renderMobilePushModal(style) {
        const {config, intl} = this.props;
        const pushNotificationsEnabled = config.SendPushNotifications === 'true';

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={this.state.showMobilePushModal}
                onRequestClose={this.cancelMobilePushModal}
            >
                <View style={style.modalOverlay}>
                    <View style={style.modal}>
                        <View style={style.modalBody}>
                            <View style={style.modalTitleContainer}>
                                <FormattedText
                                    id='mobile.notification_settings_mobile.push_activity_android'
                                    defaultMessage='Send notifications for'
                                    style={style.modalTitle}
                                />
                            </View>
                            {pushNotificationsEnabled &&
                            <RadioButtonGroup
                                name='pushSettings'
                                onSelect={this.onMobilePushChanged}
                            >
                                <RadioButton
                                    label={intl.formatMessage({
                                        id: 'user.settings.notifications.allActivity',
                                        defaultMessage: 'For all activity'
                                    })}
                                    value='all'
                                    checked={this.state.push === 'all'}
                                />
                                <RadioButton
                                    label={intl.formatMessage({
                                        id: 'user.settings.notifications.onlyMentions',
                                        defaultMessage: 'Only for mentions and direct messages'
                                    })}
                                    value='mention'
                                    checked={this.state.push === 'mention'}
                                />
                                <RadioButton
                                    label={intl.formatMessage({
                                        id: 'user.settings.notifications.never',
                                        defaultMessage: 'Never'
                                    })}
                                    value='none'
                                    checked={this.state.push === 'none'}
                                />
                            </RadioButtonGroup>
                            }
                            {!pushNotificationsEnabled &&
                            <FormattedText
                                id='user.settings.push_notification.disabled_long'
                                defaultMessage='Push notifications for mobile devices have been disabled by your System Administrator.'
                                style={style.modalOptionDisabled}
                            />
                            }
                        </View>
                        <View style={style.modalFooter}>
                            <View style={style.divider}/>
                            <View style={style.modalFooterContainer}>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.cancelMobilePushModal}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_cancel'
                                        defaultMessage='CANCEL'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                                {pushNotificationsEnabled &&
                                <View>
                                    <View style={{marginRight: 10}}/>
                                    <TouchableOpacity
                                        style={style.modalFooterOptionContainer}
                                        onPress={this.saveMobilePushModal}
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

    renderMobilePushStatusModal(style) {
        const {intl} = this.props;

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={this.state.showMobilePushStatusModal}
                onRequestClose={this.cancelMobilePushStatusModal}
            >
                <View style={style.modalOverlay}>
                    <View style={style.modal}>
                        <View style={style.modalBody}>
                            <View style={style.modalTitleContainer}>
                                <FormattedText
                                    id='mobile.notification_settings_model.push_status_android'
                                    defaultMessage='Trigger push notifications when'
                                    style={style.modalTitle}
                                />
                            </View>
                            <RadioButtonGroup
                                name='pushStatusSettings'
                                onSelect={this.onMobilePushStatusChanged}
                            >
                                <RadioButton
                                    label={intl.formatMessage({
                                        id: 'user.settings.push_notification.online',
                                        defaultMessage: 'Online, away or offline'
                                    })}
                                    value='online'
                                    checked={this.state.push_status === 'online'}
                                />
                                <RadioButton
                                    label={intl.formatMessage({
                                        id: 'user.settings.push_notification.away',
                                        defaultMessage: 'Away or offline'
                                    })}
                                    value='away'
                                    checked={this.state.push_status === 'away'}
                                />
                                <RadioButton
                                    label={intl.formatMessage({
                                        id: 'user.settings.push_notification.offline',
                                        defaultMessage: 'Offline'
                                    })}
                                    value='offline'
                                    checked={this.state.push_status === 'offline'}
                                />
                            </RadioButtonGroup>
                        </View>
                        <View style={style.modalFooter}>
                            <View style={style.divider}/>
                            <View style={style.modalFooterContainer}>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.cancelMobilePushStatusModal}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_cancel'
                                        defaultMessage='CANCEL'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                                <View style={{marginRight: 10}}/>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.saveMobilePushStatusModal}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_save'
                                        defaultMessage='SAVE'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    renderMobilePushSection() {
        const {config, theme} = this.props;

        const pushNotificationsEnabled = config.SendPushNotifications === 'true';

        let i18nId;
        let i18nMessage;
        const props = {};
        if (pushNotificationsEnabled) {
            switch (this.state.push) {
            case 'all':
                i18nId = 'user.settings.notifications.allActivity';
                i18nMessage = 'For all activity';
                break;
            case 'mention':
                i18nId = 'user.settings.notifications.onlyMentions';
                i18nMessage = 'Only for mentions and direct messages';
                break;
            case 'none':
                i18nId = 'user.settings.notifications.never';
                i18nMessage = 'Never';
                break;
            }
            props.description = (
                <FormattedText
                    id={i18nId}
                    defaultMessage={i18nMessage}
                />
            );
        } else {
            props.description = (
                <FormattedText
                    id='user.settings.push_notification.disabled'
                    defaultMessage='Disabled by System Administrator'
                />
            );
        }

        return (
            <SectionItem
                {...props}
                label={(
                    <FormattedText
                        id='mobile.notification_settings_mobile.push_activity_android'
                        defaultMessage='Send notifications for'
                    />
                )}
                action={this.showMobilePushModal}
                actionType='default'
                theme={theme}
            />
        );
    }

    renderMobilePushStatusSection(style) {
        const {config, theme} = this.props;

        const showSection = config.SendPushNotifications === 'true' && this.state.push !== 'none';
        if (!showSection) {
            return null;
        }

        let i18nId;
        let i18nMessage;
        switch (this.state.push_status) {
        case 'online':
            i18nId = 'user.settings.push_notification.online';
            i18nMessage = 'Online, away or offline';
            break;
        case 'away':
            i18nId = 'user.settings.push_notification.away';
            i18nMessage = 'Away or offline';
            break;
        case 'offline':
            i18nId = 'user.settings.push_notification.offline';
            i18nMessage = 'Offline';
            break;
        }

        return (
            <View>
                <SectionItem
                    description={(
                        <FormattedText
                            id={i18nId}
                            defaultMessage={i18nMessage}
                        />
                    )}
                    label={(
                        <FormattedText
                            id='mobile.notification_settings_model.push_status_android'
                            defaultMessage='Trigger push notifications when'
                        />
                    )}
                    action={this.showMobilePushStatusModal}
                    actionType='default'
                    theme={theme}
                />
                <View style={style.separator}/>
            </View>
        );
    }

    saveMobilePushModal = () => {
        this.setState({showMobilePushModal: false});
        this.setMobilePush(this.push);
    };

    saveMobilePushStatusModal = () => {
        this.setState({showMobilePushStatusModal: false});
        this.setMobilePushStatus(this.pushStatus);
    };

    showMobilePushModal = () => {
        this.setState({showMobilePushModal: true});
    };

    showMobilePushStatusModal = () => {
        this.setState({showMobilePushStatusModal: true});
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                >
                    {this.renderMobilePushSection()}
                    <View style={style.separator}/>
                    {this.renderMobilePushStatusSection(style)}
                </ScrollView>
                {this.renderMobilePushModal(style)}
                {this.renderMobilePushStatusModal(style)}
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
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06)
        },
        scrollViewContent: {
            paddingVertical: 0
        },
        modalOverlay: {
            backgroundColor: changeOpacity('#000000', 0.6),
            alignItems: 'center',
            flex: 1
        },
        modal: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
            marginTop: 20,
            width: '95%'
        },
        modalBody: {
            paddingHorizontal: 24
        },
        modalTitleContainer: {
            marginBottom: 30,
            marginTop: 20
        },
        modalTitle: {
            color: theme.centerChannelColor,
            fontSize: 19
        },
        modalOptionDisabled: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 17
        },
        modalFooter: {
            alignItems: 'flex-end',
            height: 58,
            marginTop: 40,
            width: '100%'
        },
        modalFooterContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            paddingRight: 24
        },
        modalFooterOptionContainer: {
            alignItems: 'center',
            height: 40,
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingVertical: 5
        },
        modalFooterOption: {
            color: theme.linkColor,
            fontSize: 14
        }
    };
});

export default injectIntl(NotificationSettingsMobileAndroid);
