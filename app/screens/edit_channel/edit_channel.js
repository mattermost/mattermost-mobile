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
import {ViewTypes} from 'app/constants';
import {setNavigatorStyles} from 'app/utils/theme';
import {cleanUpUrlable} from 'app/utils/url';

const messages = {
    display_name_required: {
        id: 'mobile.rename_channel.display_name_required',
        defaultMessage: 'Channel name is required',
    },
    display_name_maxLength: {
        id: 'mobile.rename_channel.display_name_maxLength',
        defaultMessage: 'Channel name must be less than {maxLength, number} characters',
    },
    display_name_minLength: {
        id: 'mobile.rename_channel.display_name_minLength',
        defaultMessage: 'Channel name must be {minLength, number} or more characters',
    },
    name_required: {
        id: 'mobile.rename_channel.name_required',
        defaultMessage: 'URL is required',
    },
    name_maxLength: {
        id: 'mobile.rename_channel.name_maxLength',
        defaultMessage: 'URL must be less than {maxLength, number} characters',
    },
    name_minLength: {
        id: 'mobile.rename_channel.name_minLength',
        defaultMessage: 'URL must be {minLength, number} or more characters',
    },
    name_lowercase: {
        id: 'mobile.rename_channel.name_lowercase',
        defaultMessage: 'URL be lowercase alphanumeric characters',
    },
};

export default class EditChannel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            patchChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
        }),
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        channel: PropTypes.object.isRequired,
        currentTeamUrl: PropTypes.string.isRequired,
        updateChannelRequest: PropTypes.object.isRequired,
        closeButton: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape,
    };

    rightButton = {
        id: 'edit-channel',
        disabled: true,
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);
        const {
            channel: {
                display_name: displayName,
                header,
                purpose,
                name: channelURL,
            },
        } = props;

        this.state = {
            error: null,
            updating: false,
            displayName,
            channelURL,
            purpose,
            header,
        };

        this.rightButton.title = context.intl.formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'});

        const buttons = {
            rightButtons: [this.rightButton],
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        this.emitCanUpdateChannel(false);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const {updateChannelRequest} = nextProps;

        if (this.props.updateChannelRequest !== updateChannelRequest) {
            switch (updateChannelRequest.status) {
            case RequestStatus.STARTED:
                this.emitUpdating(true);
                this.setState({error: null, updating: true});
                break;
            case RequestStatus.SUCCESS:
                EventEmitter.emit('close_channel_drawer');
                InteractionManager.runAfterInteractions(() => {
                    this.emitUpdating(false);
                    this.setState({error: null, updating: false});
                    this.close();
                });
                break;
            case RequestStatus.FAILURE:
                this.emitUpdating(false);
                this.setState({error: updateChannelRequest.error, updating: false});
                break;
            }
        }
    }

    close = () => {
        const {channel: {type}} = this.props;
        const isDirect = type === General.DM_CHANNEL || type === General.GM_CHANNEL;

        if (!isDirect) {
            this.props.actions.setChannelDisplayName(this.state.displayName);
        }

        this.props.navigator.pop({animated: true});
    };

    emitCanUpdateChannel = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}],
        };

        this.props.navigator.setButtons(buttons);
    };

    emitUpdating = (loading) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: loading}],
        };

        this.props.navigator.setButtons(buttons);
    };

    validateDisplayName = (displayName) => {
        const {formatMessage} = this.context.intl;

        if (!displayName) {
            return {error: formatMessage(messages.display_name_required)};
        } else if (displayName.length > ViewTypes.MAX_CHANNELNAME_LENGTH) {
            return {error: formatMessage(
                messages.display_name_maxLength,
                {maxLength: ViewTypes.MAX_CHANNELNAME_LENGTH}
            )};
        } else if (displayName.length < ViewTypes.MIN_CHANNELNAME_LENGTH) {
            return {error: formatMessage(
                messages.display_name_minLength,
                {minLength: ViewTypes.MIN_CHANNELNAME_LENGTH}
            )};
        }

        return {error: null};
    };

    validateChannelURL = (channelURL) => {
        const {formatMessage} = this.context.intl;

        if (!channelURL) {
            return {error: formatMessage(messages.name_required)};
        } else if (channelURL.length > ViewTypes.MAX_CHANNELNAME_LENGTH) {
            return {error: formatMessage(
                messages.name_maxLength,
                {maxLength: ViewTypes.MAX_CHANNELNAME_LENGTH}
            )};
        }

        const cleanedName = cleanUpUrlable(channelURL);
        if (cleanedName === channelURL) {
            return {error: null};
        }

        return {error: formatMessage(messages.name_lowercase)};
    };

    onUpdateChannel = () => {
        Keyboard.dismiss();
        const {displayName, channelURL, purpose, header} = this.state;
        const {channel: {id, type}} = this.props;
        const isDirect = type === General.DM_CHANNEL || type === General.GM_CHANNEL;
        const channel = {
            display_name: isDirect ? '' : displayName,
            name: channelURL,
            purpose,
            header,
        };

        if (!isDirect) {
            let result = this.validateDisplayName(displayName.trim());
            if (result.error) {
                this.setState({error: result.error});
                return;
            }

            result = this.validateChannelURL(channelURL.trim());
            if (result.error) {
                this.setState({error: result.error});
                return;
            }
        }

        this.props.actions.patchChannel(id, channel);
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-edit-channel':
                this.close();
                break;
            case 'edit-channel':
                this.onUpdateChannel();
                break;
            }
        }
    };

    onDisplayNameChange = (displayName) => {
        this.setState({displayName});
    };

    onChannelURLChange = (channelURL) => {
        this.setState({channelURL});
    };

    onPurposeChange = (purpose) => {
        this.setState({purpose});
    };

    onHeaderChange = (header) => {
        this.setState({header});
    };

    render() {
        const {
            channel: {
                display_name: oldDisplayName,
                name: oldChannelURL,
                header: oldHeader,
                purpose: oldPurpose,
                type,
            },
            navigator,
            theme,
            currentTeamUrl,
            deviceWidth,
            deviceHeight,
        } = this.props;
        const {
            error,
            updating,
            displayName,
            channelURL,
            purpose,
            header,
        } = this.state;

        return (
            <EditChannelInfo
                navigator={navigator}
                theme={theme}
                enableRightButton={this.emitCanUpdateChannel}
                error={error}
                saving={updating}
                channelType={type}
                currentTeamUrl={currentTeamUrl}
                onDisplayNameChange={this.onDisplayNameChange}
                onChannelURLChange={this.onChannelURLChange}
                onPurposeChange={this.onPurposeChange}
                onHeaderChange={this.onHeaderChange}
                displayName={displayName}
                channelURL={channelURL}
                header={header}
                purpose={purpose}
                editing={true}
                oldDisplayName={oldDisplayName}
                oldChannelURL={oldChannelURL}
                oldPurpose={oldPurpose}
                oldHeader={oldHeader}
                deviceWidth={deviceWidth}
                deviceHeight={deviceHeight}
            />
        );
    }
}

