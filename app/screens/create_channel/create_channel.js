// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    InteractionManager,
} from 'react-native';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import EditChannelInfo from 'app/components/edit_channel_info';
import {setNavigatorStyles} from 'app/utils/theme';

export default class CreateChannel extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        createChannelRequest: PropTypes.object.isRequired,
        channelType: PropTypes.string,
        closeButton: PropTypes.object,
        actions: PropTypes.shape({
            handleCreateChannel: PropTypes.func.isRequired,
        }),
    };

    static contextTypes = {
        intl: intlShape,
    };

    static defaultProps = {
        channelType: General.OPEN_CHANNEL,
    };

    leftButton = {
        id: 'close-new-channel',
    };

    rightButton = {
        id: 'create-channel',
        disabled: true,
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);

        this.state = {
            error: null,
            creating: false,
            displayName: '',
            purpose: '',
            header: '',
        };

        this.rightButton.title = context.intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});

        if (props.channelType === General.PRIVATE_CHANNEL) {
            this.left = {...this.leftButton, icon: props.closeButton};
        }

        const buttons = {
            rightButtons: [this.rightButton],
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        this.emitCanCreateChannel(false);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const {createChannelRequest} = nextProps;

        if (this.props.createChannelRequest !== createChannelRequest) {
            switch (createChannelRequest.status) {
            case RequestStatus.STARTED:
                this.emitCreating(true);
                this.setState({error: null, creating: true});
                break;
            case RequestStatus.SUCCESS:
                EventEmitter.emit('close_channel_drawer');
                InteractionManager.runAfterInteractions(() => {
                    this.emitCreating(false);
                    this.setState({error: null, creating: false});
                    this.close(false);
                });
                break;
            case RequestStatus.FAILURE:
                this.emitCreating(false);
                this.setState({error: createChannelRequest.error, creating: false});
                break;
            }
        }
    }

    close = (goBack = false) => {
        EventEmitter.emit('closing-create-channel', false);
        if (goBack) {
            this.props.navigator.pop({animated: true});
        } else {
            this.props.navigator.dismissModal({
                animationType: 'slide-down',
            });
        }
    };

    emitCanCreateChannel = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}],
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        this.props.navigator.setButtons(buttons);
    };

    emitCreating = (loading) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: loading}],
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        this.props.navigator.setButtons(buttons);
    };

    onCreateChannel = () => {
        Keyboard.dismiss();
        const {displayName, purpose, header} = this.state;
        this.props.actions.handleCreateChannel(displayName, purpose, header, this.props.channelType);
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-new-channel':
                this.close(this.props.channelType === General.OPEN_CHANNEL);
                break;
            case 'create-channel':
                this.onCreateChannel();
                break;
            }
        }
    };

    onDisplayNameChange = (displayName) => {
        this.setState({displayName});
    };

    onPurposeChange = (purpose) => {
        this.setState({purpose});
    };

    onHeaderChange = (header) => {
        this.setState({header});
    };

    render() {
        const {
            navigator,
            theme,
            deviceWidth,
            deviceHeight,
        } = this.props;
        const {
            error,
            creating,
            displayName,
            purpose,
            header,
        } = this.state;

        return (
            <EditChannelInfo
                navigator={navigator}
                theme={theme}
                enableRightButton={this.emitCanCreateChannel}
                error={error}
                saving={creating}
                onDisplayNameChange={this.onDisplayNameChange}
                onPurposeChange={this.onPurposeChange}
                onHeaderChange={this.onHeaderChange}
                displayName={displayName}
                purpose={purpose}
                header={header}
                deviceWidth={deviceWidth}
                deviceHeight={deviceHeight}
            />
        );
    }
}

