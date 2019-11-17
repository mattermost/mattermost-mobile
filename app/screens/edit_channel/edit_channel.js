// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Dimensions,
    Keyboard,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import SafeAreaView from 'app/components/safe_area_view';
import {General} from 'mattermost-redux/constants';

import EditChannelInfo from 'app/components/edit_channel_info';
import {ViewTypes} from 'app/constants';
import {setNavigatorStyles} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import {popTopScreen, setButtons} from 'app/actions/navigation';

const messages = {
    display_name_required: {
        id: t('mobile.rename_channel.display_name_required'),
        defaultMessage: 'Channel name is required',
    },
    display_name_maxLength: {
        id: t('mobile.rename_channel.display_name_maxLength'),
        defaultMessage: 'Channel name must be less than {maxLength, number} characters',
    },
    display_name_minLength: {
        id: t('mobile.rename_channel.display_name_minLength'),
        defaultMessage: 'Channel name must be {minLength, number} or more characters',
    },
    name_required: {
        id: t('mobile.rename_channel.name_required'),
        defaultMessage: 'URL is required',
    },
    name_maxLength: {
        id: t('mobile.rename_channel.name_maxLength'),
        defaultMessage: 'URL must be less than {maxLength, number} characters',
    },
    name_minLength: {
        id: t('mobile.rename_channel.name_minLength'),
        defaultMessage: 'URL must be {minLength, number} or more characters',
    },
    name_lowercase: {
        id: t('mobile.rename_channel.name_lowercase'),
        defaultMessage: 'URL be lowercase alphanumeric characters',
    },
};

export default class EditChannel extends PureComponent {
    static propTypes = {
        channel: PropTypes.object.isRequired,
        componentId: PropTypes.string,
        getChannel: PropTypes.func.isRequired,
        patchChannel: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    rightButton = {
        id: 'edit-channel',
        enabled: false,
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);
        const {
            channel: {
                displayName,
                header,
                purpose,
            },
        } = props;

        this.state = {
            error: null,
            updating: false,
            displayName,
            purpose,
            header,
        };

        this.rightButton.color = props.theme.sidebarHeaderTextColor;
        this.rightButton.text = context.intl.formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'});

        const buttons = {
            rightButtons: [this.rightButton],
        };

        setButtons(props.componentId, buttons);
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);

        this.emitCanUpdateChannel(false);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.theme !== this.props.theme) {
            setNavigatorStyles(prevProps.componentId, this.props.theme);
        }
    }

    navigationButtonPressed({buttonId}) {
        switch (buttonId) {
        case 'close-edit-channel':
            popTopScreen();
            break;
        case 'edit-channel':
            this.onUpdateChannel();
            break;
        }
    }

    emitCanUpdateChannel = (enabled) => {
        const {componentId} = this.props;
        const buttons = {
            rightButtons: [{...this.rightButton, enabled}],
        };

        setButtons(componentId, buttons);
    };

    emitUpdating = (updating) => {
        const {componentId} = this.props;
        const buttons = {
            rightButtons: [{...this.rightButton, enabled: !updating}],
        };

        this.setState({updating});
        setButtons(componentId, buttons);
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

    onUpdateChannel = async () => {
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

        this.emitUpdating(true);
        if (!isDirect) {
            const result = this.validateDisplayName(displayName.trim());
            if (result.error) {
                this.setState({error: result.error});
                return;
            }
        }

        const data = await this.props.patchChannel(id, channel);
        this.emitUpdating(false);
        if (data.error && data.error.server_error_id === 'store.sql_channel.update.archived_channel.app_error') {
            this.props.getChannel(id);
            return;
        }

        popTopScreen();
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
            channel: {
                displayName: oldDisplayName,
                header: oldHeader,
                purpose: oldPurpose,
                type,
            },
            theme,
        } = this.props;
        const {
            error,
            updating,
            displayName,
            purpose,
            header,
        } = this.state;
        const {width, height} = Dimensions.get('window');

        return (
            <SafeAreaView
                excludeHeader={true}
                excludeFooter={true}
            >
                <EditChannelInfo
                    theme={theme}
                    enableRightButton={this.emitCanUpdateChannel}
                    error={error}
                    saving={updating}
                    channelType={type}
                    onDisplayNameChange={this.onDisplayNameChange}
                    onChannelURLChange={this.onChannelURLChange}
                    onPurposeChange={this.onPurposeChange}
                    onHeaderChange={this.onHeaderChange}
                    displayName={displayName}
                    header={header}
                    purpose={purpose}
                    editing={true}
                    oldDisplayName={oldDisplayName}
                    oldPurpose={oldPurpose}
                    oldHeader={oldHeader}
                    deviceWidth={width}
                    deviceHeight={height}
                />
            </SafeAreaView>
        );
    }
}

