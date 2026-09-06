// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useReducer, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import {createChannel, patchChannel as handlePatchChannel, switchToChannelById} from '@actions/remote/channel';
import {type ChannelAttributeFormValues} from '@components/channel_attribute_form';
import NavigationButton from '@components/navigation_button';
import {General, Screens} from '@constants';
import {MIN_CHANNEL_NAME_LENGTH} from '@constants/channel';
import {MISSING_REQUIRED_ATTRIBUTES_ERROR_ID} from '@constants/channel_attributes';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {validateDisplayName} from '@utils/channel';
import {isPropertyValueSet, pruneStaleAttributeValues, type ChannelAttributeField} from '@utils/channel_attributes';
import {getServerError} from '@utils/errors';
import {changeOpacity} from '@utils/theme';

import ChannelInfoForm from './channel_info_form';

import type {ChannelAttributeValueInput} from '@actions/remote/channel_attributes';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

const messages = defineMessages({
    missingRequiredAttributes: {
        id: 'channel_attributes.create.missing_required',
        defaultMessage: 'This channel is missing a required attribute. Check the channel attributes above and try again.',
    },
    unsupportedRequiredAttribute: {
        id: 'channel_attributes.create.unsupported_required',
        defaultMessage: 'A required channel attribute cannot be set from this device yet. Ask an administrator to create this channel from a computer.',
    },
});

type Props = {
    channel?: ChannelModel;
    channelInfo?: ChannelInfoModel;
    headerOnly?: boolean;
    canCreatePublicChannels: boolean;
    canCreatePrivateChannels: boolean;
    attributeFields: ChannelAttributeField[];
    attributesBlocked: boolean;
}

enum RequestActions {
    START = 'Start',
    COMPLETE = 'Complete',
    FAILURE = 'Failure',
}

interface RequestState {
    error: string;
    saving: boolean;
}

interface RequestAction {
    type: RequestActions;
    error?: string;
}

const close = async (): Promise<void> => {
    Keyboard.dismiss();
    await navigateBack();
};

const isDirect = (channel?: ChannelModel): boolean => {
    return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const CreateOrEditChannel = ({
    canCreatePrivateChannels,
    canCreatePublicChannels,
    channel,
    channelInfo,
    headerOnly,
    attributeFields,
    attributesBlocked,
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const editing = Boolean(channel);

    const [type, setType] = useState<ChannelType>(channel?.type || General.OPEN_CHANNEL);
    const [canSave, setCanSave] = useState(false);

    const [displayName, setDisplayName] = useState<string>(channel?.displayName || '');
    const [purpose, setPurpose] = useState<string>(channelInfo?.purpose || '');
    const [header, setHeader] = useState<string>(channelInfo?.header || '');
    const [attributeValues, setAttributeValues] = useState<ChannelAttributeFormValues>({});

    const [appState, dispatch] = useReducer((state: RequestState, action: RequestAction) => {
        switch (action.type) {
            case RequestActions.START:
                return {
                    error: '',
                    saving: true,
                };
            case RequestActions.COMPLETE:
                return {
                    error: '',
                    saving: false,
                };
            case RequestActions.FAILURE:
                return {
                    error: action.error,
                    saving: false,
                };

            default:
                return state;
        }
    }, {
        error: '',
        saving: false,
    });

    const isValidDisplayName = useCallback((): boolean => {
        if (isDirect(channel)) {
            return true;
        }

        const result = validateDisplayName(intl, displayName);
        if (result.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: result.error,
            });
            return false;
        }
        return true;
    }, [channel, displayName, intl]);

    // attributeFields is a live subscription: an administrator can remove a field
    // or an option while this screen is open. Without this, a draft pick that
    // stopped existing between the tap and Create would still be sent, for the
    // server to reject with nothing on screen to explain why.
    useEffect(() => {
        setAttributeValues((current) => pruneStaleAttributeValues(attributeFields, current));
    }, [attributeFields]);

    const onAttributeValueChange = useCallback((fieldId: string, value: ChannelAttributeValueInput) => {
        setAttributeValues((current) => {
            if (!isPropertyValueSet(value)) {
                if (!(fieldId in current)) {
                    return current;
                }
                const next = {...current};
                delete next[fieldId];
                return next;
            }
            return {...current, [fieldId]: value as string | string[]};
        });
    }, []);

    const onCreateChannel = useCallback(async () => {
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        if (!isValidDisplayName()) {
            return;
        }

        const propertyValues = attributeFields.map((field) => ({field_id: field.id, value: attributeValues[field.id]}));
        const createdChannel = await createChannel(serverUrl, displayName, purpose, header, type, propertyValues);
        if (createdChannel.error) {
            const isMissingRequiredAttributes = getServerError(createdChannel.error) === MISSING_REQUIRED_ATTRIBUTES_ERROR_ID;
            dispatch({
                type: RequestActions.FAILURE,
                error: isMissingRequiredAttributes ? formatMessage(messages.missingRequiredAttributes) : createdChannel.error as string,
            });
            return;
        }

        dispatch({type: RequestActions.COMPLETE});
        navigation.getParent()?.goBack();
        await new Promise((resolve) => setTimeout(resolve, 250));
        switchToChannelById(serverUrl, createdChannel.channel!.id, createdChannel.channel!.team_id);
    }, [isValidDisplayName, serverUrl, displayName, purpose, header, type, attributeFields, attributeValues, formatMessage, navigation]);

    const onUpdateChannel = useCallback(async () => {
        if (!channel) {
            return;
        }
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        if (!isValidDisplayName()) {
            return;
        }

        const patchChannel: ChannelPatch = {
            header,
            ...!isDirect(channel) && {
                display_name: displayName,
                purpose,
            },
        };

        const patchedChannel = await handlePatchChannel(serverUrl, channel.id, patchChannel);
        if (patchedChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: patchedChannel.error as string,
            });
            return;
        }
        dispatch({type: RequestActions.COMPLETE});
        close();
    }, [channel, isValidDisplayName, header, displayName, purpose, serverUrl]);

    const isEnabled = canSave && !appState.saving;

    useEffect(() => {
        const buttonText = editing ? formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}) : formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={editing ? onUpdateChannel : onCreateChannel}
                    text={buttonText}
                    testID={editing ? 'create_or_edit_channel.save.button' : 'create_or_edit_channel.create.button'}
                    color={isEnabled ? theme.sidebarHeaderTextColor : changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    disabled={!isEnabled}
                />
            ),
        });
    }, [editing, formatMessage, navigation, onUpdateChannel, onCreateChannel, isEnabled, theme.sidebarHeaderTextColor]);

    // Required attributes gate Create only: editing gains no attribute gate, both
    // because there is no attribute editing on this screen in edit mode and
    // because a channel that already exists cannot regress into "incomplete".
    const allRequiredAttributesSet = editing || attributeFields.every((field) => isPropertyValueSet(attributeValues[field.id]));

    // attributesBlocked means some required attribute the caller could otherwise
    // satisfy has no mobile editor at all — nothing typed here could ever fix
    // that, so Create stays disabled rather than round-tripping into a server
    // rejection with no way to resolve it on screen.
    const canSubmitAttributes = editing || !attributesBlocked;

    useEffect(() => {
        setCanSave(
            displayName.length >= MIN_CHANNEL_NAME_LENGTH && (
                displayName !== channel?.displayName ||
                purpose !== channelInfo?.purpose ||
                header !== channelInfo?.header ||
                type !== channel.type
            ) && allRequiredAttributesSet && canSubmitAttributes,
        );
    }, [channel, displayName, purpose, header, type, channelInfo?.purpose, channelInfo?.header, allRequiredAttributesSet, canSubmitAttributes]);

    useAndroidHardwareBackHandler(Screens.CREATE_OR_EDIT_CHANNEL, close);

    // A save error takes priority: it is the outcome of something the user just
    // did, where the unsupported-attribute notice is standing background context.
    const displayError = appState.error || (canSubmitAttributes ? '' : formatMessage(messages.unsupportedRequiredAttribute));

    return (
        <View style={styles.container}>
            <ChannelInfoForm
                error={displayError}
                saving={appState.saving}
                channelType={channel?.type}
                editing={editing}
                onTypeChange={setType}
                type={type}
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
                header={header}
                headerOnly={headerOnly}
                onHeaderChange={setHeader}
                purpose={purpose}
                onPurposeChange={setPurpose}
                canCreatePrivateChannels={canCreatePrivateChannels}
                canCreatePublicChannels={canCreatePublicChannels}
                attributeFields={attributeFields}
                attributeValues={attributeValues}
                onAttributeValueChange={onAttributeValueChange}
            />
        </View>
    );
};

export default CreateOrEditChannel;
