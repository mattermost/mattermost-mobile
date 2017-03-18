// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    ScrollView,
    StyleSheet,
    View
} from 'react-native';

import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {Preferences, RequestStatus} from 'mattermost-redux/constants';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

import Section from './section';
import SectionItem from './section_item';
import SaveNotificationsButton from './save_notifications_button';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            marginHorizontal: 15
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
        },
        scrollViewContent: {
            paddingBottom: 30
        },
        wrapper: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});

const SAVE_NOTIFY_PROPS = 'save_notify_props';
const SAVING_NOTIFY_PROPS = 'saving_notify_props';

export default class AccountNotifications extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            goBack: PropTypes.func.isRequired,
            handleUpdateUserNotifyProps: PropTypes.func.isRequired
        }),
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        myPreferences: PropTypes.object.isRequired,
        saveRequestStatus: PropTypes.string.isRequired,
        subscribeToHeaderEvent: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        unsubscribeFromHeaderEvent: PropTypes.func.isRequired
    };

    static navigationProps = {
        renderRightComponent: (props, emitter) => {
            return <SaveNotificationsButton emitter={emitter}/>;
        }
    }

    constructor(props) {
        super(props);

        const {currentUser} = props;
        const notifyProps = currentUser.notify_props || {};
        this.setStateFromNotifyProps(notifyProps);
    }

    componentWillMount() {
        this.props.subscribeToHeaderEvent(SAVE_NOTIFY_PROPS, this.saveUserNotifyProps);
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent(SAVE_NOTIFY_PROPS);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.currentUser !== this.props.currentUser) {
            const {notify_props: notifyProps} = nextProps.currentUser;
            this.setStateFromNotifyProps(notifyProps);
        }

        if (nextProps.saveRequestStatus === RequestStatus.SUCCESS && this.props.saveRequestStatus === RequestStatus.STARTED) {
            this.props.actions.goBack();
        } else if (nextProps.saveRequestStatus === RequestStatus.FAILURE && this.props.saveRequestStatus === RequestStatus.STARTED) {
            EventEmitter.emit(SAVING_NOTIFY_PROPS, false);
            this.setStateFromNotifyProps(nextProps.currentUser.notify_props);
        }
    }

    setStateFromNotifyProps = (notifyProps) => {
        const mentionKeys = (notifyProps.mention_keys || '').split(',');
        const usernameMentionIndex = mentionKeys.indexOf(this.props.currentUser.username);
        if (usernameMentionIndex > -1) {
            mentionKeys.splice(usernameMentionIndex, 1);
        }

        const email = notifyProps.email;
        let interval;
        if (this.props.config.EnableEmailBatching === 'true') {
            const emailPreferences = getPreferencesByCategory(this.props.myPreferences, Preferences.CATEGORY_NOTIFICATIONS);
            interval = emailPreferences.get(Preferences.EMAIL_INTERVAL).value;
        }

        const newState = {
            ...notifyProps,
            email,
            interval,
            usernameMention: usernameMentionIndex > -1,
            mention_keys: mentionKeys.join(',')
        };

        if (this.state) {
            this.setState(newState);
        } else {
            this.state = {...newState};
        }
    }

    toggleFirstNameMention = () => {
        this.setState({
            first_name: (!(this.state.first_name === 'true')).toString()
        });
    }

    toggleUsernameMention = () => {
        this.setState({
            usernameMention: !this.state.usernameMention
        });
    }

    toggleChannelMentions = () => {
        this.setState({
            channel: (!(this.state.channel === 'true')).toString()
        });
    }

    updateMentionKeys = (text) => {
        this.setState({
            mention_keys: text
        });
    }

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
            interval
        });
    }

    setReplyNotifications = (value) => {
        this.setState({
            comments: value
        });
    }

    setMobilePush = (value) => {
        this.setState({
            push: value
        });
    }

    setMobilePushStatus = (value) => {
        this.setState({
            push_status: value
        });
    }

    saveUserNotifyProps = () => {
        EventEmitter.emit(SAVING_NOTIFY_PROPS, true);
        let {mention_keys: mentionKeys, usernameMention, ...notifyProps} = this.state; //eslint-disable-line prefer-const

        if (mentionKeys.length > 0) {
            mentionKeys = mentionKeys.split(',').map((m) => m.replace(/\s/g, ''));
        } else {
            mentionKeys = [];
        }

        if (usernameMention) {
            mentionKeys.push(`${this.props.currentUser.username}`);
        }

        mentionKeys = mentionKeys.join(',');

        this.props.actions.handleUpdateUserNotifyProps({
            ...notifyProps,
            mention_keys: mentionKeys,
            user_id: this.props.currentUser.id
        });
    }

    buildMentionSection = () => {
        const {currentUser, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Section
                headerId='user.settings.notifications.wordsTrigger'
                headerDefaultMessage='Words that trigger mentions'
                footerId='mobile.account_notifications.mentions_footer'
                footerDefaultMessage='Your username (\"{username}\") will always trigger mentions.'
                footerValues={{username: currentUser.username}}
                theme={theme}
            >
                {currentUser.first_name.length > 0 &&
                    <View>
                        <SectionItem
                            labelId='user.settings.notifications.sensitiveName'
                            labelDefaultMessage='Your case sensitive first name "{first_name}"'
                            labelValues={{first_name: currentUser.first_name}}
                            action={this.toggleFirstNameMention}
                            actionType='toggle'
                            selected={this.state.first_name === 'true'}
                            theme={theme}
                        />
                        <View style={style.separator}/>
                    </View>
                }
                <SectionItem
                    labelId='user.settings.notifications.sensitiveUsername'
                    labelDefaultMessage='Your non-case sensitive username "{username}"'
                    labelValues={{username: currentUser.username}}
                    selected={this.state.usernameMention}
                    action={this.toggleUsernameMention}
                    actionType='toggle'
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='user.settings.notifications.channelWide'
                    labelDefaultMessage='Channel-wide mentions "@channel", "@all"'
                    action={this.toggleChannelMentions}
                    actionType='toggle'
                    selected={this.state.channel === 'true'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='user.settings.notifications.sensitiveWords'
                    labelDefaultMessage='Other non-case sensitive words, separated by commas'
                    theme={theme}
                >
                    <TextInputWithLocalizedPlaceholder
                        value={this.state.mention_keys}
                        onChangeText={this.updateMentionKeys}
                        style={style.input}
                        autoCapitalize='none'
                        autoCorrect={false}
                        placeholder={{id: 'mobile.account_notifications.non-case_sensitive_words', defaultMessage: 'Additional words...'}}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                        underlineColorAndroid='transparent'
                    />
                </SectionItem>
            </Section>
        );
    }

    buildEmailSection = () => {
        const {config, theme} = this.props;
        const style = getStyleSheet(theme);

        const sendEmailNotifications = config.SendEmailNotifications === 'true';
        const emailBatchingEnabled = config.EnableEmailBatching === 'true';

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
                headerId='user.settings.notifications.email.send'
                headerDefaultMessage='Send email notifications'
                footerId='user.settings.notifications.emailInfo'
                footerDefaultMessage='Email notifications are sent for mentions and direct messages when you are offline or away from {siteName} for more than 5 minutes.'
                footerValues={{siteName: config.SiteName}}
                disableFooter={!sendEmailNotifications}
                theme={theme}
            >
                {sendEmailNotifications &&
                    <View>
                        <SectionItem
                            labelId='user.settings.notifications.email.immediately'
                            labelDefaultMessage='Immediately'
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
                                    labelId='user.settings.notifications.email.everyXMinutes'
                                    labelDefaultMessage='Every {count, plural, one {minute} other {{count, number} minutes}}'
                                    labelValues={{count: Preferences.INTERVAL_FIFTEEN_MINUTES / 60}}
                                    action={this.setEmailNotifications}
                                    actionType='select'
                                    actionValue={Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                                    selected={fifteenMinutes}
                                    theme={theme}
                                />
                                <View style={style.separator}/>
                                <SectionItem
                                    labelId='user.settings.notifications.email.everyHour'
                                    labelDefaultMessage='Every hour'
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
                            labelId='user.settings.notifications.email.never'
                            labelDefaultMessage='Never'
                            action={this.setEmailNotifications}
                            actionType='select'
                            actionValue='false'
                            selected={never}
                            theme={theme}
                        />
                    </View>
                }
                {!sendEmailNotifications &&
                    <SectionItem
                        labelId='user.settings.general.emailHelp2'
                        labelDefaultMessage='Email has been disabled by your System Administrator. No notification emails will be sent until it is enabled.'
                        theme={theme}
                    />
                }
            </Section>
        );
    }

    buildReplySection = () => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Section
                headerId='mobile.account_notifications.reply.header'
                headerDefaultMessage='Send reply notifications for'
                footerId='user.settings.notifications.commentsInfo'
                footerDefaultMessage="In addition to notifications for when you're mentioned, select if you would like to receive notifications on reply threads."
                theme={theme}
            >
                <SectionItem
                    labelId='mobile.account_notifications.threads_start_participate'
                    labelDefaultMessage='Threads that I start or participate in'
                    action={this.setReplyNotifications}
                    actionType='select'
                    actionValue='any'
                    selected={this.state.comments === 'any'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='mobile.account_notifications.threads_start'
                    labelDefaultMessage='Threads that I start'
                    action={this.setReplyNotifications}
                    actionType='select'
                    actionValue='root'
                    selected={this.state.comments === 'root'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='mobile.account_notifications.threads_mentions'
                    labelDefaultMessage='Mentions in threads'
                    action={this.setReplyNotifications}
                    actionType='select'
                    actionValue='never'
                    selected={this.state.comments === 'never'}
                    theme={theme}
                />
            </Section>
        );
    }

    buildMobilePushSection = () => {
        const {config, theme} = this.props;
        const style = getStyleSheet(theme);

        const pushNotificationsEnabled = config.SendPushNotifications === 'true';
        if (!pushNotificationsEnabled) {
            return null;
        }

        return (
            <Section
                headerId='user.settings.push_notification.send'
                headerDefaultMessage='Send mobile push notifications'
                footerId='user.settings.push_notification.info'
                footerDefaultMessage='Notification alerts are pushed to your mobile device when there is activity in Mattermost.'
                theme={theme}
            >
                <SectionItem
                    labelId='user.settings.notifications.allActivity'
                    labelDefaultMessage='For all activity'
                    action={this.setMobilePush}
                    actionType='select'
                    actionValue='all'
                    selected={this.state.push === 'all'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='user.settings.notifications.onlyMentions'
                    labelDefaultMessage='Only for mentions and direct messages'
                    action={this.setMobilePush}
                    actionType='select'
                    actionValue='mention'
                    selected={this.state.push === 'mention'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='user.settings.notifications.never'
                    labelDefaultMessage='Never'
                    action={this.setMobilePush}
                    actionType='select'
                    actionValue='none'
                    selected={this.state.push === 'none'}
                    theme={theme}
                />
            </Section>
        );
    }

    buildMobilePushStatusSection = () => {
        const {config, theme} = this.props;
        const style = getStyleSheet(theme);

        const showSection = config.SendPushNotifications === 'true' && this.state.push !== 'none';
        if (!showSection) {
            return null;
        }

        return (
            <Section
                headerId='user.settings.push_notification.status'
                headerDefaultMessage='Trigger push notifications when'
                footerId='user.settings.push_notification.status_info'
                footerDefaultMessage='Notification alerts are only pushed to your mobile device when your online status matches the selection above.'
                theme={theme}
            >
                <SectionItem
                    labelId='user.settings.push_notification.online'
                    labelDefaultMessage='Online, away or offline'
                    action={this.setMobilePushStatus}
                    actionType='select'
                    actionValue='online'
                    selected={this.state.push_status === 'online'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='user.settings.push_notification.away'
                    labelDefaultMessage='Away or offline'
                    action={this.setMobilePushStatus}
                    actionType='select'
                    actionValue='away'
                    selected={this.state.push_status === 'away'}
                    theme={theme}
                />
                <View style={style.separator}/>
                <SectionItem
                    labelId='user.settings.push_notification.offline'
                    labelDefaultMessage='Offline'
                    action={this.setMobilePushStatus}
                    actionType='select'
                    actionValue='offline'
                    selected={this.state.push_status === 'offline'}
                    theme={theme}
                />
            </Section>
        );
    }

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.wrapper}>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                >
                    {this.buildMentionSection()}
                    {this.buildEmailSection()}
                    {this.buildReplySection()}
                    {this.buildMobilePushSection()}
                    {this.buildMobilePushStatusSection()}
                </ScrollView>
            </View>
        );
    }
}
