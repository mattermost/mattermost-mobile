// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, DeviceEventEmitter, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
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
    const buttonText = intl.formatMessage({id: 'mobile.account.settings.save', defaultMessage: 'Save'});
    const rightButton = isTablet ? null : {
        id: 'update-profile',
        enabled: false,
        showAsAction: 'always' as const,
        testID: 'edit_profile.save.button',
        color: theme.sidebarHeaderTextColor,
        text: buttonText,
    };

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
        if (isTablet) {
            setCanSave(value);
        } else {
            const buttons = {
                rightButtons: [{...rightButton!, enabled: value}],
            };

            setButtons(componentId, buttons);
        }
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

    const setScrollViewRef = useCallback((ref) => {
        scrollViewRef.current = ref;
    }, []);

    if (updating) {
        return <ProfileUpdating/>;
    }

    const includesSsoService = (sso: string) => ['gitlab', 'google', 'office365'].includes(sso);

    const isFieldLockedWithProtocol = (sso: string, lockedField: boolean) => ['ldap', 'saml'].includes(sso) && lockedField;

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
                    innerRef={setScrollViewRef}
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
                        fieldKey='firstName'
                        isDisabled={isFieldLockedWithProtocol(service, lockedFirstName) || includesSsoService(service)}
                        label={FIELDS.firstName}
                        onTextChange={updateField}
                        testID='edit_profile.text_setting.firstName'
                        value={userInfo.firstName}
                    />
                    <View style={style.separator}/>
                    <Field
                        fieldKey='lastName'
                        isDisabled={isFieldLockedWithProtocol(service, lockedLastName) || includesSsoService(service)}
                        label={FIELDS.lastName}
                        onTextChange={updateField}
                        testID='edit_profile.text_setting.lastName'
                        value={userInfo.lastName}
                    />
                    <View style={style.separator}/>
                    <Field
                        fieldKey='username'
                        isDisabled={service !== ''}
                        label={FIELDS.username}
                        maxLength={22}
                        onTextChange={updateField}
                        testID='edit_profile.text_setting.username'
                        value={userInfo.username}
                    />
                    <View style={style.separator}/>
                    <EmailField
                        email={userInfo.email}
                        authService={currentUser.authService}
                        onChange={updateField}
                    />
                    <View style={style.separator}/>
                    <Field
                        fieldKey='nickname'
                        isDisabled={isFieldLockedWithProtocol(service, lockedNickname)}
                        label={FIELDS.nickname}
                        maxLength={22}
                        onTextChange={updateField}
                        testID='edit_profile.text_setting.nickname'
                        value={userInfo.nickname}
                    />
                    <View style={style.separator}/>
                    <Field
                        fieldKey='position'
                        isDisabled={isFieldLockedWithProtocol(service, lockedPosition)}
                        label={FIELDS.position}
                        maxLength={128}
                        onTextChange={updateField}
                        isOptional={true}
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
