// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PureComponent} from 'react';
import {Platform} from 'react-native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

export default class NotificationSettingsMobileBase extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        notificationPreferences: PropTypes.object,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        const {currentUser} = props;
        const notifyProps = currentUser.notify_props || {};

        this.state = {
            ...notifyProps,
            ...this.getNotificationPreferences(props),
            showMobilePushModal: false,
            showMobilePushStatusModal: false,
            showMobileSoundsModal: false
        };
        this.push = this.state.push;
        this.pushStatus = this.state.push_status;
        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    getNotificationPreferences = (props) => {
        if (Platform.OS === 'android') {
            const {
                defaultUri,
                shouldBlink,
                shouldVibrate,
                selectedUri,
                sounds
            } = props.notificationPreferences;

            const defSound = sounds.find((s) => s.uri === defaultUri);
            const defaultSound = defSound.name;

            let sound;
            if (selectedUri && selectedUri === 'none') {
                sound = 'none';
            } else if (selectedUri) {
                const selected = sounds.find((s) => s.uri === selectedUri);
                sound = selected.name;
            }

            return {
                defaultSound,
                shouldVibrate,
                shouldBlink,
                selectedUri,
                sound
            };
        }

        return {};
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'ScreenChangedEvent') {
            switch (event.id) {
            case 'willDisappear':
                this.saveUserNotifyProps();
                break;
            }
        }
    };

    setMobilePush = (push) => {
        this.setState({push});
    };

    setMobilePushStatus = (value) => {
        this.setState({push_status: value});
    };

    saveUserNotifyProps = () => {
        const {
            channel,
            comments,
            desktop,
            desktop_duration,
            email,
            first_name,
            mention_keys,
            push,
            push_status
        } = this.state;

        this.props.onBack({
            channel,
            comments,
            desktop,
            desktop_duration,
            email,
            first_name,
            mention_keys,
            push,
            push_status,
            user_id: this.props.currentUser.id
        });
    };
}
