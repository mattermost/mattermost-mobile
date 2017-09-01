// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

export default class NotificationSettingsMobileBase extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        const {currentUser} = props;
        const notifyProps = currentUser.notify_props || {};

        this.state = {
            ...notifyProps,
            showMobilePushModal: false,
            showMobilePushStatusModal: false
        };
        this.push = this.state.push;
        this.pushStatus = this.state.push_status;
        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
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

    setMobilePush = (push) => {
        this.setState({push});
    };

    setMobilePushStatus = (value) => {
        this.setState({push_status: value});
    };

    saveUserNotifyProps = () => {
        const props = {...this.state};

        Reflect.deleteProperty(props, 'showMobilePushModal');
        Reflect.deleteProperty(props, 'showMobilePushStatusModal');
        this.props.onBack({
            ...props,
            user_id: this.props.currentUser.id
        });
    };
}
