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

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import EditChannelInfo from 'app/components/edit_channel_info';
import {setNavigatorStyles} from 'app/utils/theme';
import {popTopScreen, dismissModal, setButtons} from 'app/actions/navigation';

export default class CreateChannel extends PureComponent {
    static propTypes = {
        componentId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number.isRequired,
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

    componentDidUpdate(prevProps) {
        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.componentId, this.props.theme);
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

    onCreateChannel = async () => {
        Keyboard.dismiss();
        const {actions} = this.props;
        const {displayName, purpose, header} = this.state;

        this.emitCreating(true);
        this.setState({error: null, creating: true});

        const created = await actions.handleCreateChannel(displayName, purpose, header, this.props.channelType);
        if (created.error) {
            this.emitCreating(false);
            this.setState({error: created.error, creating: false});
            return;
        }

        EventEmitter.emit('close_channel_drawer');
        InteractionManager.runAfterInteractions(() => {
            this.emitCreating(false);
            this.setState({error: null, creating: false});
            this.close(false);
        });
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

