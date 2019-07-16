// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import {Platform} from 'react-native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {getNotificationProps} from 'app/utils/notify_props';
import {setNavigatorStyles} from 'app/utils/theme';

export default class NotificationSettingsMobileBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            updateMe: PropTypes.func.isRequired,
        }),
        componentId: PropTypes.string,
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        notificationPreferences: PropTypes.object,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {currentUser} = props;
        const notifyProps = getNotificationProps(currentUser);
        const notifyPreferences = this.getNotificationPreferences(props);

        this.state = {
            ...notifyProps,
            ...notifyPreferences,
            newPush: notifyProps.push,
            newPushStatus: notifyProps.push_status,
            newSound: notifyPreferences.sound,
            showMobilePushModal: false,
            showMobilePushStatusModal: false,
            showMobileSoundsModal: false,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }
    }

    getNotificationPreferences = (props) => {
        if (Platform.OS === 'android') {
            const {
                defaultUri,
                shouldBlink,
                shouldVibrate,
                selectedUri,
                sounds,
            } = props.notificationPreferences;

            const defSound = sounds.find((s) => s.uri === defaultUri);
            const defaultSound = defSound ? defSound.name : 'none';

            let sound;
            if (selectedUri && selectedUri === 'none') {
                sound = 'none';
            } else if (selectedUri) {
                const selected = sounds.find((s) => s.uri === selectedUri);
                sound = selected ? selected.name : 'none';
            }

            return {
                defaultSound,
                shouldVibrate,
                shouldBlink,
                selectedUri,
                sound,
            };
        }

        return {};
    };

    componentDidDisappear() {
        this.saveUserNotifyProps();
    }

    setMobilePush = (push, callback) => {
        this.setState({push}, callback);
    };

    setMobilePushStatus = (value, callback) => {
        this.setState({push_status: value}, callback);
    };

    saveUserNotifyProps = () => {
        const {
            channel,
            comments,
            desktop,
            email,
            first_name: firstName,
            mention_keys: mentionKeys,
            push,
            push_status: pushStatus,
        } = this.state;

        this.props.onBack({
            channel,
            comments,
            desktop,
            email,
            first_name: firstName,
            mention_keys: mentionKeys,
            push,
            push_status: pushStatus,
            user_id: this.props.currentUser.id,
        });
    };
}
