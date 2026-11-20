// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useReducer, useState} from 'react';
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
import {isPropertyFieldRequired, isPropertyValueSet, pruneStaleAttributeValues, type ChannelAttributeField} from '@utils/channel_attributes';
import {getServerError} from '@utils/errors';
import {changeOpacity} from '@utils/theme';

import ChannelInfoForm from './channel_info_form';

import type {ChannelAttributeValueInput} from '@actions/remote/channel_attributes';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

const messages = defineMessages({
    missingRequiredAttributes: {
        id: 'channel_attributes.create.missing_required',
        defaultMessage: 'This channel is missing a required attribute. Check the channel attributes and try again.',
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

    // Fields or options can be removed while this screen is open; drop stale picks or the server rejects Create.
    useEffect(() => {
        setAttributeValues((current) => pruneStaleAttributeValues(attributeFields, current));
    }, [attributeFields]);

    // Also pruned synchronously: a sheet opened before an option update can submit a stale pick after the effect runs.
    const validAttributeValues = useMemo(
        () => pruneStaleAttributeValues(attributeFields, attributeValues),
        [attributeFields, attributeValues],
    );

    const allRequiredAttributesSet = editing || attributeFields.every((field) => !isPropertyFieldRequired(field) || isPropertyValueSet(validAttributeValues[field.id]));

    // attributesBlocked: a required attribute has no mobile editor, so nothing here could satisfy the server.
    const canSubmitAttributes = editing || !attributesBlocked;

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

        // The header button may hold a stale callback, so re-check the gate.
        if (!allRequiredAttributesSet || !canSubmitAttributes) {
            dispatch({
                type: RequestActions.FAILURE,
                error: formatMessage(canSubmitAttributes ? messages.missingRequiredAttributes : messages.unsupportedRequiredAttribute),
            });
            return;
        }

        const propertyValues = attributeFields.
            filter((field) => isPropertyValueSet(validAttributeValues[field.id])).
            map((field) => ({field_id: field.id, value: validAttributeValues[field.id]}));
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
    }, [isValidDisplayName, allRequiredAttributesSet, canSubmitAttributes, serverUrl, displayName, purpose, header, type, attributeFields, validAttributeValues, formatMessage, navigation]);

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
                attributeValues={validAttributeValues}
                onAttributeValueChange={onAttributeValueChange}
            />
        </View>
    );
};

export default CreateOrEditChannel;
