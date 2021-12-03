// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, DeviceEventEmitter, Keyboard, Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
import {FloatingTextInputRef} from '@components/floating_text_input_label';
import ProfilePicture from '@components/profile_picture';
import TabletTitle from '@components/tablet_title';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {FIELDS} from '@screens/edit_profile/constants';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';

import EmailField from './components/email_field';
import Field from './components/field';
import ProfileError from './components/profile_error';
import ProfileUpdating from './components/profile_updating';

import type UserModel from '@typings/database/models/servers/user';

type EditProfileProps = {
    closeButtonId?: string;
    componentId: string;
    currentUser: UserModel;
    isModal?: boolean;
    isTablet?: boolean;
    lockedFirstName: boolean;
    lockedLastName: boolean;
    lockedNickname: boolean;
    lockedPosition: boolean;
    lockedPicture: boolean;
};

const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
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
    };
});

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

    const style = getStyleSheet(theme);
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

    if (updating) {
        return <ProfileUpdating/>;
    }

    const includesSsoService = (sso: string) => ['gitlab', 'google', 'office365'].includes(sso);

    const isFieldLockedWithProtocol = (sso: string, lockedField: boolean) => {
        // return ['ldap', 'saml'].includes(sso) && lockedField;
        //fixme: undo
        return false;
    };

    const onFocusNextField = (fieldKey: string) => {
        type FieldSequence = Record<string, {
            ref: RefObject<FloatingTextInputRef>;
            nextRef: RefObject<FloatingTextInputRef> | undefined;
        }>

        const fieldSequence: FieldSequence = {
            firstName: {
                ref: firstNameRef,
                nextRef: lastNameRef,
            },
            lastName: {
                ref: lastNameRef,
                nextRef: usernameRef,
            },
            username: {
                ref: usernameRef,
                nextRef: nicknameRef,
            },
            email: {
                ref: emailRef,
                nextRef: nicknameRef,
            },
            nickname: {
                ref: nicknameRef,
                nextRef: positionRef,
            },
            position: {
                ref: positionRef,
                nextRef: undefined,
            },
        };

        //fixme: figure out how to implement field jumping if they are disabled in an adhoc way

        const nextField = fieldSequence[fieldKey];

        if (fieldKey === 'position' && canSave) {
            // performs form submission
            Keyboard.dismiss();
            submitUser();
        } else {
            nextField?.nextRef?.current?.focus();
        }
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
                style={style.flex}
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
                >
                    {Boolean(error) && <ProfileError error={error!}/>}
                    <View style={style.top}>
                        <ProfilePicture
                            author={currentUser}
                            size={153}
                            showStatus={false}
                        />
                    </View>
                    <Field
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        fieldKey='firstName'
                        fieldRef={firstNameRef}
                        isDisabled={isFieldLockedWithProtocol(service, lockedFirstName) || includesSsoService(service)}
                        label={FIELDS.firstName}
                        onFocusNextField={onFocusNextField}
                        onTextChange={updateField}
                        returnKeyType='next'
                        testID='edit_profile.text_setting.firstName'
                        value={userInfo.firstName}
                    />
                    <View style={style.separator}/>
                    <Field
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        fieldKey='lastName'
                        fieldRef={lastNameRef}
                        isDisabled={isFieldLockedWithProtocol(service, lockedLastName) || includesSsoService(service)}
                        label={FIELDS.lastName}
                        onFocusNextField={onFocusNextField}
                        onTextChange={updateField}
                        returnKeyType='next'
                        testID='edit_profile.text_setting.lastName'
                        value={userInfo.lastName}
                    />
                    <View style={style.separator}/>
                    <Field
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        fieldKey='username'
                        fieldRef={usernameRef}
                        isDisabled={service !== ''}
                        label={FIELDS.username}
                        maxLength={22}
                        onFocusNextField={onFocusNextField}
                        onTextChange={updateField}
                        returnKeyType='next'
                        testID='edit_profile.text_setting.username'
                        value={userInfo.username}
                    />
                    <View style={style.separator}/>
                    <EmailField
                        authService={currentUser.authService}
                        email={userInfo.email}
                        fieldRef={emailRef}
                        onChange={updateField}
                        onFocusNextField={onFocusNextField}
                    />
                    <View style={style.separator}/>
                    <Field
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        isDisabled={isFieldLockedWithProtocol(service, lockedNickname)}
                        fieldKey='nickname'
                        fieldRef={nicknameRef}
                        label={FIELDS.nickname}
                        maxLength={22}
                        onFocusNextField={onFocusNextField}
                        onTextChange={updateField}
                        returnKeyType='next'
                        testID='edit_profile.text_setting.nickname'
                        value={userInfo.nickname}
                    />
                    <View style={style.separator}/>
                    <Field
                        fieldKey='position'
                        fieldRef={positionRef}
                        isDisabled={isFieldLockedWithProtocol(service, lockedPosition)}
                        isOptional={true}
                        label={FIELDS.position}
                        maxLength={128}
                        onFocusNextField={onFocusNextField}
                        onTextChange={updateField}
                        returnKeyType='done'
                        testID='edit_profile.text_setting.position'
                        value={userInfo.position}
                    />
                    <View style={style.footer}/>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        </>
    );
};

export default EditProfile;
