// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    InteractionManager,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {General, RequestStatus} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

import {popTopScreen, dismissModal, setButtons} from 'app/actions/navigation';
import EditChannelInfo from 'app/components/edit_channel_info';
import {NavigationTypes} from 'app/constants';

export default class CreateChannel extends PureComponent {
    static propTypes = {
        componentId: PropTypes.string,
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
        enabled: false,
        showAsAction: 'always',
        testID: 'edit_channel.create.button',
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

        this.rightButton.text = context.intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});
        this.rightButton.color = props.theme.sidebarHeaderTextColor;

        if (props.closeButton) {
            this.left = {...this.leftButton, icon: props.closeButton};
        }
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        this.emitCanCreateChannel(false);
    }

    componentWillReceiveProps(nextProps) {
        const {createChannelRequest} = nextProps;

        if (this.props.createChannelRequest !== createChannelRequest) {
            switch (createChannelRequest.status) {
            case RequestStatus.STARTED:
                this.emitCreating(true);
                this.setState({error: null, creating: true});
                break;
            case RequestStatus.SUCCESS:
                EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
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

    navigationButtonPressed({buttonId}) {
        switch (buttonId) {
        case 'close-new-channel':
            this.close(!this.props.closeButton);
            break;
        case 'create-channel':
            this.onCreateChannel();
            break;
        }
    }

    close = (goBack = false) => {
        Keyboard.dismiss();
        if (goBack) {
            popTopScreen();
        } else {
            dismissModal();
        }
    };

    emitCanCreateChannel = (enabled) => {
        const {componentId} = this.props;
        const buttons = {
            rightButtons: [{...this.rightButton, enabled}],
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        setButtons(componentId, buttons);
    };

    emitCreating = (loading) => {
        const {componentId} = this.props;
        const buttons = {
            rightButtons: [{...this.rightButton, enabled: !loading}],
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        setButtons(componentId, buttons);
    };

    onCreateChannel = () => {
        Keyboard.dismiss();
        const {displayName, purpose, header} = this.state;
        this.props.actions.handleCreateChannel(displayName, purpose, header, this.props.channelType);
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
                testID='create_channel.screen'
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

