// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    ScrollView,
    View,
} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';
import {getEmailInterval} from 'mattermost-redux/utils/notify_props';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';

export default class NotificationSettingsEmail extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            savePreferences: PropTypes.func.isRequired,
        }),
        currentUserId: PropTypes.string.isRequired,
        emailInterval: PropTypes.string.isRequired,
        enableEmailBatching: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        sendEmailNotifications: PropTypes.bool.isRequired,
        siteName: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {
            emailInterval,
            enableEmailBatching,
            navigator,
            sendEmailNotifications,
        } = props;

        this.state = {
            interval: getEmailInterval(
                sendEmailNotifications,
                enableEmailBatching,
                parseInt(emailInterval, 10),
            ).toString(),
        };

        navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

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

    onNavigatorEvent = (event) => {
        if (event.type === 'ScreenChangedEvent') {
            switch (event.id) {
            case 'willDisappear':
                this.saveUserNotifyProps();
                break;
            }
        }
    };

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

    saveUserNotifyProps = () => {
        const {currentUserId} = this.props;
        const {email, interval} = this.state;

        const emailNotify = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUserId, name: 'email', value: email};
        const emailInterval = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUserId, name: Preferences.EMAIL_INTERVAL, value: interval};
        this.props.actions.savePreferences(currentUserId, [emailNotify, emailInterval]);
    };

    renderEmailSection = () => {
        const {
            enableEmailBatching,
            sendEmailNotifications,
            siteName,
            theme,
        } = this.props;
        const {interval} = this.state;
        const style = getStyleSheet(theme);

        return (
            <Section
                headerId='mobile.notification_settings.email.send'
                headerDefaultMessage='SEND EMAIL NOTIFICATIONS'
                footerId='user.settings.notifications.emailInfo'
                footerDefaultMessage='Email notifications are sent for mentions and direct messages when you are offline or away from {siteName} for more than 5 minutes.'
                footerValues={{siteName}}
                disableFooter={!sendEmailNotifications}
                theme={theme}
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
                        action={this.setEmailNotifications}
                        actionType='select'
                        actionValue={Preferences.INTERVAL_IMMEDIATE.toString()}
                        selected={interval === Preferences.INTERVAL_IMMEDIATE.toString()}
                        theme={theme}
                    />
                    <View style={style.separator}/>
                    {enableEmailBatching &&
                    <View>
                        <SectionItem
                            label={(
                                <FormattedText
                                    id='user.settings.notifications.email.everyXMinutes'
                                    defaultMessage='Every {count, plural, one {minute} other {{count, number} minutes}}'
                                    values={{count: Preferences.INTERVAL_FIFTEEN_MINUTES / 60}}
                                />
                            )}
                            action={this.setEmailNotifications}
                            actionType='select'
                            actionValue={Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                            selected={interval === Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                            theme={theme}
                        />
                        <View style={style.separator}/>
                        <SectionItem
                            label={(
                                <FormattedText
                                    id='user.settings.notifications.email.everyHour'
                                    defaultMessage='Every hour'
                                />
                            )}
                            action={this.setEmailNotifications}
                            actionType='select'
                            actionValue={Preferences.INTERVAL_HOUR.toString()}
                            selected={interval === Preferences.INTERVAL_HOUR.toString()}
                            theme={theme}
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
                        action={this.setEmailNotifications}
                        actionType='select'
                        actionValue={Preferences.INTERVAL_NEVER.toString()}
                        selected={interval === Preferences.INTERVAL_NEVER.toString()}
                        theme={theme}
                    />
                </View>
                }
                {!sendEmailNotifications &&
                <FormattedText
                    id='user.settings.general.emailHelp2'
                    defaultMessage='Email has been disabled by your System Administrator. No notification emails will be sent until it is enabled.'
                    style={style.disabled}
                />
                }
            </Section>
        );
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
