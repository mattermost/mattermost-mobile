// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Keyboard,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    View
} from 'react-native';

import {Preferences, RequestStatus} from 'mattermost-redux/constants';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

import Loading from 'app/components/loading';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import Section from './section';
import SectionItem from './section_item';

class AccountNotifications extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleUpdateUserNotifyProps: PropTypes.func.isRequired
        }),
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        myPreferences: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        updateMeRequest: PropTypes.object.isRequired
    };

    saveButton = {
        id: 'save-notifications',
        showAsAction: 'never'
    };

    constructor(props) {
        super(props);

        const {currentUser} = props;
        const notifyProps = currentUser.notify_props || {};

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons({
            rightButtons: [{
                ...this.saveButton,
                title: props.intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'})
            }]
        });

        this.setStateFromNotifyProps(notifyProps);
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {currentUser, updateMeRequest} = nextProps;
        if (currentUser !== this.props.currentUser) {
            const {notify_props: notifyProps} = currentUser;
            this.setStateFromNotifyProps(notifyProps);
        }

        if (this.props.updateMeRequest !== updateMeRequest) {
            switch (updateMeRequest.status) {
            case RequestStatus.STARTED:
                this.savingNotifyProps(true);
                this.setState({error: null, saving: true});
                break;
            case RequestStatus.SUCCESS:
                this.savingNotifyProps(false);
                this.setState({error: null, saving: false});
                this.close();
                break;
            case RequestStatus.FAILURE:
                this.savingNotifyProps(false);
                this.setState({error: updateMeRequest.error, saving: false});
                break;
            }
        }
    }

    handleAndroidKeyboard = () => {
        this.refs.mention_keys.getWrappedInstance().blur();
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'save-notifications') {
                this.saveUserNotifyProps();
            }
        }
    };

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

        const comments = notifyProps.comments || 'never';

        const newState = {
            ...notifyProps,
            comments,
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
    };

    toggleFirstNameMention = () => {
        this.setState({
            first_name: (!(this.state.first_name === 'true')).toString()
        });
    };

    toggleUsernameMention = () => {
        this.setState({
            usernameMention: !this.state.usernameMention
        });
    };

    toggleChannelMentions = () => {
        this.setState({
            channel: (!(this.state.channel === 'true')).toString()
        });
    };

    updateMentionKeys = (text) => {
        this.setState({
            mention_keys: text
        });
    };

    savingNotifyProps = (loading) => {
        this.props.navigator.setButtons({
            rightButtons: [{...this.saveButton, disabled: loading}]
        });
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
            interval
        });
    };

    setReplyNotifications = (value) => {
        this.setState({
            comments: value
        });
    };

    setMobilePush = (value) => {
        this.setState({
            push: value
        });
    };

    setMobilePushStatus = (value) => {
        this.setState({
            push_status: value
        });
    };

    saveUserNotifyProps = () => {
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
    };

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
                        ref='mention_keys'
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
    };

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
    };

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
    };

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
    };

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
    };

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        if (this.state.saving) {
            return (
                <View style={style.wrapper}>
                    <StatusBar barStyle='light-content'/>
                    <Loading/>
                </View>
            );
        }

        return (
            <View style={style.wrapper}>
                <StatusBar barStyle='light-content'/>
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

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        wrapper: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
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
        }
    });
});

export default injectIntl(AccountNotifications);
