// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, DeviceEventEmitter, Keyboard, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
import {FloatingTextInputRef} from '@components/floating_text_input_label';
import Loading from '@components/loading';
import ProfilePicture from '@components/profile_picture';
import TabletTitle from '@components/tablet_title';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {FIELDS} from '@screens/edit_profile/constants';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {EditProfileProps, FieldConfig, FieldSequence, UserInfo} from '@typings/screens/edit_profile';
import {preventDoubleTap} from '@utils/tap';

import EmailField from './components/email_field';
import Field from './components/field';
import ProfileError from './components/profile_error';

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    top: {
        padding: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    separator: {
        height: 15,
    },
    footer: {
        height: 40,
        width: '100%',
    },
    spinner: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
});

const SPINNER_LAYER = 'Shape Layer 1';

const EditProfile = ({
    closeButtonId,
    componentId,
    currentUser,
    isModal,
    isTablet,
    lockedFirstName,
    lockedLastName,
    lockedNickname,
    lockedPosition,
}: EditProfileProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>();

    const firstNameRef = useRef<FloatingTextInputRef>(null);
    const lastNameRef = useRef<FloatingTextInputRef>(null);
    const usernameRef = useRef<FloatingTextInputRef>(null);
    const emailRef = useRef<FloatingTextInputRef>(null);
    const nicknameRef = useRef<FloatingTextInputRef>(null);
    const positionRef = useRef<FloatingTextInputRef>(null);

    const [userInfo, setUserInfo] = useState<UserInfo>({
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        nickname: currentUser.nickname,
        position: currentUser.position,
        username: currentUser.username,
    });
    const [canSave, setCanSave] = useState(false);
    const [error, setError] = useState<ErrorText | undefined>();
    const [updating, setUpdating] = useState(false);

    const scrollViewRef = useRef<KeyboardAwareScrollView>();

    const buttonText = intl.formatMessage({id: 'mobile.account.settings.save', defaultMessage: 'Save'});
    const rightButton = isTablet ? null : {
        id: 'update-profile',
        enabled: false,
        showAsAction: 'always' as const,
        testID: 'edit_profile.save.button',
        color: theme.sidebarHeaderTextColor,
        text: buttonText,
    };

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case 'update-profile':
                        submitUser();
                        break;
                    case closeButtonId:
                        close();
                        break;
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, [userInfo, isTablet]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', close);
        return () => {
            backHandler.remove();
        };
    }, []);

    useEffect(() => {
        if (!isTablet) {
            setButtons(componentId, {rightButtons: [rightButton!]});
        }
    }, [isTablet]);

    const service = currentUser.authService;

    const close = () => {
        if (isModal) {
            dismissModal({componentId});
        } else if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
        } else {
            popTopScreen(componentId);
        }

        return true;
    };

    const enableSaveButton = (value: boolean) => {
        const buttons = {
            rightButtons: [{...rightButton!, enabled: value}],
        };
        setCanSave(value);
        setButtons(componentId, buttons);
    };

    const submitUser = preventDoubleTap(async () => {
        enableSaveButton(false);
        setError(undefined);
        setUpdating(true);
        try {
            const partialUser: Partial<UserProfile> = {
                email: userInfo.email,
                first_name: userInfo.firstName,
                last_name: userInfo.lastName,
                nickname: userInfo.nickname,
                position: userInfo.position,
                username: userInfo.username,
            };

            const {error: reqError} = await updateMe(serverUrl, partialUser);

            if (reqError) {
                resetScreen(reqError as Error);
                return;
            }

            close();
        } catch (e) {
            resetScreen(e as Error);
        }
    });

    const resetScreen = (resetError: Error) => {
        setError(resetError?.message);
        Keyboard.dismiss();
        setUpdating(false);
        enableSaveButton(true);
        scrollViewRef.current?.scrollToPosition(0, 0, true);
    };

    const updateField = useCallback((fieldKey: string, name: string) => {
        const update = {...userInfo};
        update[fieldKey] = name;
        setUserInfo(update);

        // @ts-expect-error access object property by string key
        const currentValue = currentUser[fieldKey];
        const didChange = currentValue !== name;
        enableSaveButton(didChange);
    }, [userInfo]);

    const includesSsoService = (sso: string) => ['gitlab', 'google', 'office365'].includes(sso);
    const isSAMLOrLDAP = (protocol: string) => ['ldap', 'saml'].includes(protocol);

    const fieldSequence: FieldSequence = {
        firstName: {
            ref: firstNameRef,
            isDisabled: (isSAMLOrLDAP(service) && lockedFirstName) || includesSsoService(service),
        },
        lastName: {
            ref: lastNameRef,
            isDisabled: (isSAMLOrLDAP(service) && lockedLastName) || includesSsoService(service),
        },
        username: {
            ref: usernameRef,
            isDisabled: service !== '',
        },
        email: {
            ref: emailRef,
            isDisabled: true,
        },
        nickname: {
            ref: nicknameRef,
            isDisabled: isSAMLOrLDAP(service) && lockedNickname,
        },
        position: {
            ref: positionRef,
            isDisabled: isSAMLOrLDAP(service) && lockedPosition,
        },
    };

    const onFocusNextField = (fieldKey: string) => {
        const findNextField = () => {
            const fields = Object.keys(fieldSequence);
            const curIndex = fields.indexOf(fieldKey);
            const searchIndex = curIndex + 1;

            if (curIndex === -1 || searchIndex > fields.length) {
                return undefined;
            }

            const remainingFields = fields.slice(searchIndex);

            const nextFieldIndex = remainingFields.findIndex((f: string) => {
                const field = fieldSequence[f];
                return !field.isDisabled;
            });

            if (nextFieldIndex === -1) {
                return {isLastEnabledField: true, nextField: undefined};
            }

            const fieldName = remainingFields[nextFieldIndex];
            return {isLastEnabledField: false, nextField: fieldSequence[fieldName]};
        };

        const next = findNextField();
        if (next?.isLastEnabledField && canSave) {
            // performs form submission
            Keyboard.dismiss();
            submitUser();
        } else if (next?.nextField) {
            next?.nextField?.ref?.current?.focus();
        } else {
            Keyboard.dismiss();
        }
    };

    const fieldConfig: FieldConfig = {
        blurOnSubmit: false,
        enablesReturnKeyAutomatically: true,
        onFocusNextField,
        onTextChange: updateField,
        returnKeyType: 'next',
    };

    return (
        <>
            {isTablet &&
                <TabletTitle
                    action={buttonText}
                    enabled={canSave}
                    onPress={submitUser}
                    testID='custom_status.done.button'
                    title={intl.formatMessage({id: 'mobile.screen.your_profile', defaultMessage: 'Your Profile'})}
                />
            }
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='edit_profile.screen'
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    enableAutomaticScroll={true}
                    enableOnAndroid={true}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={25}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'

                    // @ts-expect-error legacy ref
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    testID='edit_profile.scroll_view'
                    style={styles.flex}
                >
                    {updating && (
                        <View
                            style={styles.spinner}
                        >
                            <Loading
                                colorFilters={[{keypath: SPINNER_LAYER, color: theme.buttonBg}]}
                            />
                        </View>

                    )}
                    {Boolean(error) && <ProfileError error={error!}/>}
                    <View style={styles.top}>
                        <ProfilePicture
                            author={currentUser}
                            size={153}
                            showStatus={false}
                        />
                    </View>
                    <Field
                        fieldKey='firstName'
                        fieldRef={firstNameRef}
                        isDisabled={fieldSequence.firstName.isDisabled}
                        label={FIELDS.firstName}
                        testID='edit_profile.text_setting.firstName'
                        value={userInfo.firstName}
                        {...fieldConfig}
                    />
                    <View style={styles.separator}/>
                    <Field
                        fieldKey='lastName'
                        fieldRef={lastNameRef}
                        isDisabled={fieldSequence.lastName.isDisabled}
                        label={FIELDS.lastName}
                        testID='edit_profile.text_setting.lastName'
                        value={userInfo.lastName}
                        {...fieldConfig}
                    />
                    <View style={styles.separator}/>
                    <Field
                        fieldKey='username'
                        fieldRef={usernameRef}
                        isDisabled={fieldSequence.username.isDisabled}
                        label={FIELDS.username}
                        maxLength={22}
                        testID='edit_profile.text_setting.username'
                        value={userInfo.username}
                        {...fieldConfig}
                    />
                    <View style={styles.separator}/>
                    <EmailField
                        authService={currentUser.authService}
                        isDisabled={fieldSequence.email.isDisabled}
                        email={userInfo.email}
                        fieldRef={emailRef}
                        onChange={updateField}
                        onFocusNextField={onFocusNextField}
                    />
                    <View style={styles.separator}/>
                    <Field
                        fieldKey='nickname'
                        fieldRef={nicknameRef}
                        isDisabled={fieldSequence.nickname.isDisabled}
                        label={FIELDS.nickname}
                        maxLength={22}
                        testID='edit_profile.text_setting.nickname'
                        value={userInfo.nickname}
                        {...fieldConfig}
                    />
                    <View style={styles.separator}/>
                    <Field
                        fieldKey='position'
                        fieldRef={positionRef}
                        isDisabled={fieldSequence.position.isDisabled}
                        isOptional={true}
                        label={FIELDS.position}
                        maxLength={128}
                        {...fieldConfig}
                        returnKeyType='done'
                        testID='edit_profile.text_setting.position'
                        value={userInfo.position}
                    />
                    <View style={styles.footer}/>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        </>
    );
};

export default EditProfile;
