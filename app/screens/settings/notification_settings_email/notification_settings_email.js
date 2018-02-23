// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    ScrollView,
    View,
} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {getNotificationProps} from 'app/utils/notify_props';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';

export default class NotificationSettingsEmail extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        myPreferences: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {currentUser} = props;
        const notifyProps = getNotificationProps(currentUser);

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        this.state = this.setStateFromNotifyProps(notifyProps);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
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

    setEmailNotifications = (value) => {
        const {config} = this.props;
        let email = value;
        let interval;

        const emailBatchingEnabled = config.EnableEmailBatching === 'true';
        if (emailBatchingEnabled && value !== 'false') {
            interval = value;
            email = 'true';
        }

        this.setState({
            email,
            interval,
        });
    };

    setStateFromNotifyProps = (notifyProps) => {
        const {config, myPreferences} = this.props;
        let interval;
        if (config.SendEmailNotifications === 'true' && config.EnableEmailBatching === 'true') {
            const emailPreferences = getPreferencesByCategory(myPreferences, Preferences.CATEGORY_NOTIFICATIONS);
            if (emailPreferences.size) {
                interval = emailPreferences.get(Preferences.EMAIL_INTERVAL).value;
            }
        }

        return {
            ...notifyProps,
            interval,
        };
    };

    saveUserNotifyProps = () => {
        this.props.onBack({
            ...this.state,
            user_id: this.props.currentUser.id,
        });
    };

    renderEmailSection = () => {
        const {config, theme} = this.props;
        const style = getStyleSheet(theme);

        const sendEmailNotifications = config.SendEmailNotifications === 'true';
        const emailBatchingEnabled = sendEmailNotifications && config.EnableEmailBatching === 'true';

        let sendImmediatley = this.state.email === 'true';
        let sendImmediatleyValue = 'true';
        let fifteenMinutes;
        let hourly;
        const never = this.state.email === 'false';

        if (emailBatchingEnabled && this.state.email !== 'false') {
            sendImmediatley = this.state.interval === Preferences.INTERVAL_IMMEDIATE.toString();
            fifteenMinutes = this.state.interval === Preferences.INTERVAL_FIFTEEN_MINUTES.toString();
            hourly = this.state.interval === Preferences.INTERVAL_HOUR.toString();

            sendImmediatleyValue = Preferences.INTERVAL_IMMEDIATE.toString();
        }

        return (
            <Section
                headerId='mobile.notification_settings.email.send'
                headerDefaultMessage='SEND EMAIL NOTIFICATIONS'
                footerId='user.settings.notifications.emailInfo'
                footerDefaultMessage='Email notifications are sent for mentions and direct messages when you are offline or away from {siteName} for more than 5 minutes.'
                footerValues={{siteName: config.SiteName}}
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
                        actionValue={sendImmediatleyValue}
                        selected={sendImmediatley}
                        theme={theme}
                    />
                    <View style={style.separator}/>
                    {emailBatchingEnabled &&
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
                            selected={fifteenMinutes}
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
                            selected={hourly}
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
                        actionValue='false'
                        selected={never}
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
