// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView, KeyboardController} from 'react-native-keyboard-controller';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateLocalUser} from '@actions/local/user';
import {fetchCustomProfileAttributes, updateCustomProfileAttributes} from '@actions/remote/custom_profile';
import {setDefaultProfileImage, updateMe, uploadUserProfileImage} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import TabletTitle from '@components/tablet_title';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {logError} from '@utils/log';
import {changeOpacity} from '@utils/theme';
import {isCustomFieldSamlLinked} from '@utils/user';

import ProfileForm, {CUSTOM_ATTRS_PREFIX} from './components/form';
import ProfileError from './components/profile_error';
import Updating from './components/updating';
import UserProfilePicture from './components/user_profile_picture';

import type {CustomProfileFieldModel} from '@database/models/server';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';
import type {EditProfileProps, NewProfileImage, UserInfo} from '@typings/screens/edit_profile';

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    top: {
        marginVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const CUSTOM_ATTRS_PREFIX_NAME = `${CUSTOM_ATTRS_PREFIX}.`;

const EditProfile = ({
    currentUser, isTablet,
    lockedFirstName, lockedLastName, lockedNickname, lockedPosition, lockedPicture, enableCustomAttributes,
    customAttributesSet, customFields,
}: EditProfileProps) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const changedProfilePicture = useRef<NewProfileImage | undefined>(undefined);
    const hasUpdateUserInfo = useRef<boolean>(false);
    const [userInfo, setUserInfo] = useState<UserInfo>({
        email: currentUser?.email || '',
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        nickname: currentUser?.nickname || '',
        position: currentUser?.position || '',
        username: currentUser?.username || '',
        customAttributes: {},
    });
    const [canSave, setCanSave] = useState(false);
    const [error, setError] = useState<unknown>();
    const [usernameError, setUsernameError] = useState<unknown>();
    const [updating, setUpdating] = useState(false);
    const lastRequest = useRef(0);

    const close = useCallback(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
            return;
        }
        navigation.goBack();
    }, [isTablet, navigation]);

    const resetScreenForProfileError = useCallback(async (resetError: unknown) => {
        setUsernameError(resetError);
        if (KeyboardController.isVisible()) {
            await KeyboardController.dismiss();
        }
        setUpdating(false);
        setCanSave(true);
    }, []);

    const resetScreen = useCallback(async (resetError: unknown) => {
        setError(resetError);
        if (KeyboardController.isVisible()) {
            await KeyboardController.dismiss();
        }
        setUpdating(false);
        setCanSave(true);
    }, []);

    const submitUser = usePreventDoubleTap(useCallback(async () => {
        if (!currentUser) {
            return;
        }
        setCanSave(false);
        setError(undefined);
        setUpdating(true);
        try {
            // Build update object with only changed and unlocked fields
            const newUserInfo: Partial<UserProfile> = {};

            // Only include fields that have changed and are not locked by SAML
            if (userInfo.email.trim() !== currentUser.email && !currentUser.authService) {
                newUserInfo.email = userInfo.email.trim();
            }
            if (userInfo.firstName.trim() !== currentUser.firstName && (!lockedFirstName || !currentUser.authService)) {
                newUserInfo.first_name = userInfo.firstName.trim();
            }
            if (userInfo.lastName.trim() !== currentUser.lastName && (!lockedLastName || !currentUser.authService)) {
                newUserInfo.last_name = userInfo.lastName.trim();
            }
            if (userInfo.nickname.trim() !== currentUser.nickname && (!lockedNickname || !currentUser.authService)) {
                newUserInfo.nickname = userInfo.nickname.trim();
            }
            if (userInfo.position.trim() !== currentUser.position && (!lockedPosition || !currentUser.authService)) {
                newUserInfo.position = userInfo.position.trim();
            }
            if (userInfo.username.trim() !== currentUser.username && !currentUser.authService) {
                newUserInfo.username = userInfo.username.trim();
            }

            const localPath = changedProfilePicture.current?.localPath;
            const profileImageRemoved = changedProfilePicture.current?.isRemoved;
            if (localPath) {
                const now = Date.now();
                const {error: uploadError} = await uploadUserProfileImage(serverUrl, localPath);
                if (uploadError) {
                    resetScreen(uploadError);
                    return;
                }
                updateLocalUser(serverUrl, {last_picture_update: now});
            } else if (profileImageRemoved) {
                await setDefaultProfileImage(serverUrl, currentUser.id);
            }

            // Only update user info if there are actually changes to unlocked fields
            if (Object.keys(newUserInfo).length > 0) {
                const {error: reqError} = await updateMe(serverUrl, newUserInfo);
                if (reqError) {
                    resetScreenForProfileError(reqError);
                    return;
                }
            }

            // Update custom attributes if changed and not SAML-linked
            if (userInfo.customAttributes && enableCustomAttributes) {
                // Create a map of custom fields for quick lookup
                const customFieldsMap = new Map<string, CustomProfileFieldModel>();
                customFields?.forEach((field) => {
                    customFieldsMap.set(field.id, field);
                });

                // Only send custom attributes that have actually changed and are not SAML-linked
                const changedCustomAttributes: CustomAttributeSet = {};

                Object.keys(userInfo.customAttributes).forEach((key) => {
                    const currentValue = (customAttributesSet && customAttributesSet[key]?.value) || '';
                    const newValue = userInfo.customAttributes[key]?.value || '';
                    const customAttribute = userInfo.customAttributes[key];
                    const customField = customFieldsMap.get(customAttribute?.id);

                    // Only include if value changed and field is not SAML-linked
                    if (currentValue !== newValue && !isCustomFieldSamlLinked(customField)) {
                        changedCustomAttributes[key] = userInfo.customAttributes[key];
                    }
                });

                if (Object.keys(changedCustomAttributes).length > 0) {
                    const {error: attrError} = await updateCustomProfileAttributes(serverUrl, currentUser.id, changedCustomAttributes);
                    if (attrError) {
                        logError('Error updating custom attributes', attrError);
                        resetScreenForProfileError(attrError);
                        return;
                    }
                }
            }

            close();
        } catch (e) {
            resetScreen(e);
        }
    }, [currentUser, userInfo, lockedFirstName, lockedLastName, lockedNickname, lockedPosition, enableCustomAttributes, close, serverUrl, resetScreen, resetScreenForProfileError, customFields, customAttributesSet]));

    const onUpdateProfilePicture = useCallback((newProfileImage: NewProfileImage) => {
        changedProfilePicture.current = newProfileImage;
        setCanSave(true);
    }, []);

    const onUpdateField = useCallback((fieldKey: string, value: string) => {
        const update = {...userInfo};
        if (fieldKey.startsWith(CUSTOM_ATTRS_PREFIX_NAME)) {
            const attrKey = fieldKey.slice(CUSTOM_ATTRS_PREFIX_NAME.length);
            update.customAttributes = {...update.customAttributes, [attrKey]: {id: attrKey, name: userInfo.customAttributes[attrKey].name, value, type: userInfo.customAttributes[attrKey].type, sort_order: userInfo.customAttributes[attrKey].sort_order}};
        } else {
            switch (fieldKey) {
            // typescript doesn't like to do update[fieldkey] as it might containg a customAttribute case
                case 'email':
                    update.email = value;
                    break;
                case 'firstName':
                    update.firstName = value;
                    break;
                case 'lastName':
                    update.lastName = value;
                    break;
                case 'nickname':
                    update.nickname = value;
                    break;
                case 'position':
                    update.position = value;
                    break;
                case 'username':
                    update.username = value;
                    break;
            }
        }
        setUserInfo(update);

        let didChange = false;
        if (fieldKey.startsWith(CUSTOM_ATTRS_PREFIX_NAME)) {
            const attrKey = fieldKey.slice(CUSTOM_ATTRS_PREFIX_NAME.length);
            didChange = userInfo.customAttributes?.[attrKey].value !== value;
        } else {
            // @ts-expect-error access object property by string key
            const currentValue = currentUser[fieldKey];
            didChange = currentValue !== value;
        }

        hasUpdateUserInfo.current = didChange;
        setCanSave(didChange);
    }, [userInfo, currentUser]);

    useEffect(() => {
        if (!isTablet) {
            navigation.setOptions({
                headerRight: () => (
                    <Pressable
                        onPress={submitUser}
                        disabled={!canSave}
                        testID={'edit_profile.save.button'}
                    >
                        <FormattedText
                            id='mobile.account.settings.save'
                            defaultMessage='Save'
                            style={{color: canSave ? theme.sidebarHeaderTextColor : changeOpacity(theme.sidebarHeaderTextColor, 0.32), fontSize: 16}}
                        />
                    </Pressable>
                ),
            });
        }
    }, [isTablet, navigation, canSave, theme.sidebarHeaderTextColor, submitUser]);

    useEffect(() => {
        const loadCustomAttributes = async () => {
            if (!currentUser) {
                return;
            }

            if (enableCustomAttributes) {
                setUserInfo((prev) => ({
                    ...prev,
                    customAttributes: customAttributesSet || {},
                }));
            }

            // Then fetch from server for latest data
            const reqTime = Date.now();
            lastRequest.current = reqTime;
            const {error: fetchError, attributes} = await fetchCustomProfileAttributes(serverUrl, currentUser.id);
            if (!fetchError && attributes && lastRequest.current === reqTime) {
                setUserInfo((prev) => ({...prev, customAttributes: attributes}));
            }
        };

        loadCustomAttributes();
    }, [currentUser, serverUrl, enableCustomAttributes, customAttributesSet]);

    useAndroidHardwareBackHandler(Screens.EDIT_PROFILE, close);

    const content = currentUser ? (
        <KeyboardAwareScrollView
            bounces={true}
            keyboardDismissMode='none'
            keyboardShouldPersistTaps='handled'
            scrollToOverflowEnabled={true}
            testID='edit_profile.scroll_view'
            bottomOffset={62}
        >
            {updating && <Updating/>}
            {Boolean(error) && <ProfileError error={error}/>}
            <View style={styles.top}>
                <UserProfilePicture
                    currentUser={currentUser}
                    lockedPicture={lockedPicture}
                    onUpdateProfilePicture={onUpdateProfilePicture}
                />
            </View>
            <ProfileForm
                canSave={canSave}
                currentUser={currentUser}
                isTablet={isTablet}
                lockedFirstName={lockedFirstName}
                lockedLastName={lockedLastName}
                lockedNickname={lockedNickname}
                lockedPosition={lockedPosition}
                error={usernameError}
                onUpdateField={onUpdateField}
                userInfo={userInfo}
                submitUser={submitUser}
                enableCustomAttributes={enableCustomAttributes}
                customFields={customFields}
            />
        </KeyboardAwareScrollView>
    ) : null;

    return (
        <View
            style={styles.flex}
        >
            {isTablet &&
                <TabletTitle
                    action={intl.formatMessage({id: 'mobile.account.settings.save', defaultMessage: 'Save'})}
                    enabled={canSave}
                    onPress={submitUser}
                    testID='edit_profile'
                    title={intl.formatMessage({id: 'mobile.screen.your_profile', defaultMessage: 'Your Profile'})}
                />
            }
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='edit_profile.screen'
            >
                {content}
            </SafeAreaView>
        </View>
    );
};

export default EditProfile;
