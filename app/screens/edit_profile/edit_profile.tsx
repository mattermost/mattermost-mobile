// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateLocalUser} from '@actions/local/user';
import {fetchCustomProfileAttributes, updateCustomProfileAttributes} from '@actions/remote/custom_profile';
import {setDefaultProfileImage, updateMe, uploadUserProfileImage} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import TabletTitle from '@components/tablet_title';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {logError} from '@utils/log';
import {preventDoubleTap} from '@utils/tap';

import ProfileForm, {CUSTOM_ATTRS_PREFIX} from './components/form';
import ProfileError from './components/profile_error';
import Updating from './components/updating';
import UserProfilePicture from './components/user_profile_picture';
import {buildUserInfoUpdates, getChangedCustomAttributes} from './edit_profile.helpers';

import type UserModel from '@typings/database/models/servers/user';
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

const CLOSE_BUTTON_ID = 'close-edit-profile';
const UPDATE_BUTTON_ID = 'update-profile';
const CUSTOM_ATTRS_PREFIX_NAME = `${CUSTOM_ATTRS_PREFIX}.`;

const EditProfile = ({
    componentId, currentUser, isModal, isTablet,
    lockedFirstName, lockedLastName, lockedNickname, lockedPosition, lockedPicture, enableCustomAttributes,
    customAttributesSet, customFields,
}: EditProfileProps) => {

    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const changedProfilePicture = useRef<NewProfileImage | undefined>(undefined);
    const scrollViewRef = useRef<KeyboardAwareScrollView>();
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

    const buttonText = intl.formatMessage({id: 'mobile.account.settings.save', defaultMessage: 'Save'});
    const rightButton = useMemo(() => {
        return isTablet ? null : {
            id: 'update-profile',
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'edit_profile.save.button',
            color: theme.sidebarHeaderTextColor,
            text: buttonText,
        };
    }, [isTablet, theme.sidebarHeaderTextColor, buttonText]);

    const leftButton = useMemo(() => {
        return isTablet ? null : {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: 'close.edit_profile.button',
        };
    }, [isTablet, theme.centerChannelColor]);

    useEffect(() => {
        if (!isTablet) {
            setButtons(componentId, {
                rightButtons: [rightButton!],
                leftButtons: [leftButton!],
            });
        }
    }, [isTablet, componentId, rightButton, leftButton]);

    const close = useCallback(() => {
        if (isModal) {
            dismissModal({componentId});
        } else if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
        } else {
            popTopScreen(componentId);
        }
    }, [componentId, isModal, isTablet]);

    const enableSaveButton = useCallback((value: boolean) => {
        if (!isTablet) {
            const buttons = {
                rightButtons: [{
                    ...rightButton!,
                    enabled: value,
                }],
            };
            setButtons(componentId, buttons);
        }
        setCanSave(value);
    }, [componentId, rightButton, isTablet]);

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

    const fieldLockConfig = useMemo(() => {
        const service = currentUser?.authService || '';
        const includesSsoService = (sso: string) => ['gitlab', 'google', 'office365'].includes(sso);
        const isSAMLOrLDAP = (protocol: string) => ['ldap', 'saml'].includes(protocol);

        const config = {
            email: true, // Always disabled in form
            firstName: (isSAMLOrLDAP(service) && lockedFirstName) || includesSsoService(service),
            lastName: (isSAMLOrLDAP(service) && lockedLastName) || includesSsoService(service),
            nickname: isSAMLOrLDAP(service) && lockedNickname,
            position: isSAMLOrLDAP(service) && lockedPosition,
            username: service !== '',
        };

        return config;
    }, [currentUser?.authService, lockedFirstName, lockedLastName, lockedNickname, lockedPosition]);

    const handleProfileImageUpdate = useCallback(async (serverUrlParam: string, currentUserParam: UserModel) => {
        const localPath = changedProfilePicture.current?.localPath;
        const profileImageRemoved = changedProfilePicture.current?.isRemoved;

        if (localPath) {
            const now = Date.now();
            const {error: uploadError} = await uploadUserProfileImage(serverUrlParam, localPath);
            if (uploadError) {
                throw uploadError;
            }
            updateLocalUser(serverUrlParam, {last_picture_update: now});
        } else if (profileImageRemoved) {
            await setDefaultProfileImage(serverUrlParam, currentUserParam.id);
        }
    }, []);

    const submitUser = useCallback(preventDoubleTap(async () => {
        if (!currentUser) {
            return;
        }

        enableSaveButton(false);
        setError(undefined);
        setUpdating(true);

        try {
            // Build user info updates
            const userInfoUpdates = buildUserInfoUpdates(userInfo, currentUser, fieldLockConfig);

            // Handle profile image
            await handleProfileImageUpdate(serverUrl, currentUser);

            // Update user info if there are changes
            if (Object.keys(userInfoUpdates).length > 0) {
                const {error: reqError} = await updateMe(serverUrl, userInfoUpdates);
                if (reqError) {
                    resetScreenForProfileError(reqError);
                    return;
                }
            }

            // Handle custom attributes
            const changedCustomAttributes = getChangedCustomAttributes(userInfo, customAttributesSet, customFields, enableCustomAttributes);
            if (Object.keys(changedCustomAttributes).length > 0) {
                const {error: attrError} = await updateCustomProfileAttributes(serverUrl, currentUser.id, changedCustomAttributes);
                if (attrError) {
                    logError('Error updating custom attributes', attrError);
                    throw attrError;
                }
            }

            close();
        } catch (err) {
            resetScreen(err);
        }
    }), [userInfo, enableSaveButton, currentUser, fieldLockConfig, customAttributesSet, enableCustomAttributes, customFields, serverUrl, handleProfileImageUpdate, close]);

    useAndroidHardwareBackHandler(componentId, close);
    useNavButtonPressed(UPDATE_BUTTON_ID, componentId, submitUser, [userInfo]);
    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, []);

    const onUpdateProfilePicture = useCallback((newProfileImage: NewProfileImage) => {
        changedProfilePicture.current = newProfileImage;
        enableSaveButton(true);
    }, [enableSaveButton]);

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
        enableSaveButton(didChange);
    }, [userInfo, currentUser, enableSaveButton]);

    const resetScreenForProfileError = useCallback((resetError: unknown) => {
        setUsernameError(resetError);
        Keyboard.dismiss();
        setUpdating(false);
        enableSaveButton(true);
    }, [enableSaveButton]);

    const resetScreen = useCallback((resetError: unknown) => {
        setError(resetError);
        Keyboard.dismiss();
        setUpdating(false);
        enableSaveButton(true);
        scrollViewRef.current?.scrollToPosition(0, 0, true);
    }, [enableSaveButton]);

    const content = currentUser ? (
        <KeyboardAwareScrollView
            bounces={false}
            enableAutomaticScroll={Platform.select({ios: true, default: false})}
            enableOnAndroid={true}
            enableResetScrollToCoords={true}
            extraScrollHeight={Platform.select({ios: 45})}
            keyboardOpeningTime={0}
            keyboardDismissMode='none'
            keyboardShouldPersistTaps='handled'
            scrollToOverflowEnabled={true}
            testID='edit_profile.scroll_view'
            style={styles.flex}
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
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            {isTablet &&
                <TabletTitle
                    action={buttonText}
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
