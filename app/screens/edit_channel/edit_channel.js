// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {
    Keyboard,
    InteractionManager
} from 'react-native';

import ChannelInfo from 'app/components/channel_info';
import {RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {ViewTypes} from 'app/constants';

import {cleanUpUrlable} from 'app/utils/url';

const holders = defineMessages({
    display_name_required: {
        id: 'rename_channel.mobile.display_name_required',
        defaultMessage: 'Channel name is required'
    },
    display_name_maxLength: {
        id: 'rename_channel.mobile.display_name_maxLength',
        defaultMessage: 'Channel name must be less than {maxLength, number} characters'
    },
    display_name_minLength: {
        id: 'rename_channel.mobile.display_name_minLength',
        defaultMessage: 'Channel name must be {minLength, number} or more characters'
    },
    name_required: {
        id: 'rename_channel.mobile.name_required',
        defaultMessage: 'URL is required'
    },
    name_maxLength: {
        id: 'rename_channel.mobile.name_maxLength',
        defaultMessage: 'URL must be less than {maxLength, number} characters'
    },
    name_minLength: {
        id: 'rename_channel.mobile.name_minLength',
        defaultMessage: 'URL must be {minLength, number} or more characters'
    },
    name_lowercase: {
        id: 'rename_channel.mobile.name_lowercase',
        defaultMessage: 'URL be lowercase alphanumeric characters'
    }
});

class EditChannel extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        channel: PropTypes.object.isRequired,
        currentTeamUrl: PropTypes.string,
        updateChannelRequest: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        closeButton: PropTypes.object,
        isDMorGM: PropTypes.bool,
        actions: PropTypes.shape({
            patchChannel: PropTypes.func.isRequired
        })
    };

    rightButton = {
        id: 'edit-channel',
        disabled: true,
        showAsAction: 'always'
    };

    constructor(props) {
        super(props);
        const {
            channel: {
                display_name: displayName,
                header,
                purpose,
                name: channelURL
            }
        } = props;

        this.state = {
            error: null,
            updating: false,
            displayName,
            channelURL,
            purpose,
            header
        };

        this.rightButton.title = props.intl.formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'});

        const buttons = {
            rightButtons: [this.rightButton]
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        this.emitCanUpdateChannel(false);
    }

    componentWillReceiveProps(nextProps) {
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
        this.props.navigator.pop({animated: true});
    };

    emitCanUpdateChannel = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}]
        };

        this.props.navigator.setButtons(buttons);
    };

    emitUpdating = (loading) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: loading}]
        };

        this.props.navigator.setButtons(buttons);
    };

    validateDisplayName = (displayName) => {
        const {formatMessage} = this.props.intl;

        if (!displayName) {
            return {error: formatMessage(holders.display_name_required)};
        } else if (displayName.length > ViewTypes.MAX_CHANNELNAME_LENGTH) {
            return {error: formatMessage(
                holders.display_name_maxLength,
                {maxLength: ViewTypes.MAX_CHANNELNAME_LENGTH}
            )};
        } else if (displayName.length < ViewTypes.MIN_CHANNELNAME_LENGTH) {
            return {error: formatMessage(
                holders.display_name_minLength,
                {minLength: ViewTypes.MIN_CHANNELNAME_LENGTH}
            )};
        }

        return {error: null};
    };

    validateChannelURL = (channelURL) => {
        const {formatMessage} = this.props.intl;

        if (!channelURL) {
            return {error: formatMessage(holders.name_required)};
        } else if (channelURL.length > ViewTypes.MAX_CHANNELNAME_LENGTH) {
            return {error: formatMessage(
                holders.name_maxLength,
                {maxLength: ViewTypes.MAX_CHANNELNAME_LENGTH}
            )};
        }

        const cleanedName = cleanUpUrlable(channelURL);
        if (cleanedName === channelURL) {
            return {error: null};
        }

        return {error: formatMessage(holders.name_lowercase)};
    };

    onUpdateChannel = () => {
        Keyboard.dismiss();
        const {displayName, channelURL, purpose, header} = this.state;
        const {channel: {id}} = this.props;
        const channel = {
            display_name: displayName,
            name: channelURL,
            purpose,
            header
        };

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
                purpose: oldPurpose
            },
            navigator,
            theme,
            currentTeamUrl,
            isDMorGM
        } = this.props;
        const {
            error,
            updating,
            displayName,
            channelURL,
            purpose,
            header
        } = this.state;

        return (
            <ChannelInfo
                navigator={navigator}
                theme={theme}
                enableRightButton={this.emitCanUpdateChannel}
                error={error}
                updating={updating}
                displayHeaderOnly={isDMorGM}
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
                oldChannel={{
                    displayName: oldDisplayName,
                    channelURL: oldChannelURL,
                    purpose: oldPurpose,
                    header: oldHeader
                }}
            />
        );
    }
}

export default injectIntl(EditChannel);
