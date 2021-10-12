// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, DeviceEventEmitter, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {updateMe} from '@actions/remote/user';
import ProfilePicture from '@components/profile_picture';
import StatusBar from '@components/status_bar';
import TabletTitle from '@components/tablet_title';
import {Events} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {

    // UploadedFile,
    UserInfo} from '@typings/screens/edit_profile';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CommonFieldSettings from './components/common_field_settings';
import DisplayError from './components/display_error';
import EmailSettings from './components/email_settings';
import ProfileUpdating from './components/profile_updating';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
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

const {SERVER: {USER, SYSTEM}} = MM_TABLES;
const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 10,
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
    closeButtonId, componentId, currentUser, isModal, isTablet,
    lockedFirstName, lockedLastName, lockedNickname, lockedPosition,

    // lockedPicture
}: EditProfileProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [userInfo, setUserInfo] = useState<UserInfo>({
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        nickname: currentUser.nickname,
        position: currentUser.position,
        username: currentUser.username,
    });
    const [canSave, setCanSave] = useState(false);
    const [error, setError] = useState<string | undefined>();

    // const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
    // const [isProfileImageRemoved, setIsProfileImageRemoved] = useState(false);

    const [updating, setUpdating] = useState(false);
    const scrollViewRef = useRef<KeyboardAwareScrollView>();
    const service = currentUser.authService;

    const rightButton = {
        id: 'update-profile',
        enabled: false,
        showAsAction: 'always',
        testID: 'edit_profile.save.button',
        color: theme.sidebarHeaderTextColor,
        text: intl.formatMessage({id: t('mobile.account.settings.save'), defaultMessage: 'Save'}),
    };

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
                rightButtons: [{...rightButton, enabled: value}],
            };

            setButtons(componentId, buttons);
        }
    };

    const submitUser = useCallback(preventDoubleTap(async () => {
        enableSaveButton(false);
        setError(undefined);
        setUpdating(true);

        //todo: To be handled in next PRs
        // if (profileImage) {actions.setProfileImageUri(profileImage.uri);/* this.uploadProfileImage().catch(this.handleUploadError);*/}

        //todo: To be handled in next PRs
        // if (isProfileImageRemoved) {actions.removeProfileImage(currentUser.id);}

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
            setError(error);
            setUpdating(false);
            enableSaveButton(true);
            scrollViewRef.current?.scrollToPosition(0, 0, true);
            return;
        }

        close();
    }), [userInfo]);

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

        const backHandler = BackHandler.addEventListener('hardwareBackPress', close);

        return () => {
            unsubscribe.remove();
            backHandler.remove();
        };
    }, [userInfo, isTablet]);

    useEffect(() => {
        if (!isTablet) {
            setButtons(componentId, {rightButtons: [rightButton]});
        }
    }, [isTablet]);

    const updateField = useCallback((id: string, name: string) => {
        const update = {...userInfo};
        update[id] = name;
        setUserInfo(update);

        // @ts-expect-error access object property by string key
        const currentValue = currentUser[id];
        const didChange = currentValue !== name;
        enableSaveButton(didChange);
    }, [userInfo]);

    const setScrollViewRef = useCallback((ref) => {
        scrollViewRef.current = ref;
    }, []);

    if (updating) {
        return <ProfileUpdating/>;
    }

    return (
        <>
            {isTablet &&
                <TabletTitle
                    action={rightButton.text}
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
                <StatusBar theme={theme}/>
                <KeyboardAwareScrollView
                    bounces={false}
                    innerRef={setScrollViewRef}
                    testID='edit_profile.scroll_view'
                >
                    {error && <DisplayError error={error}/>}
                    <View style={[style.scrollViewRef]}>
                        {/* todo: To be implemented {this.renderProfilePicture()} */}
                        <View style={style.top}>
                            <ProfilePicture
                                author={currentUser}
                                size={153}
                                iconSize={104}
                                statusSize={36}
                                testID='edit_profile.profile_picture'
                            />
                        </View>
                        {/* todo the fields should match the design */}
                        <CommonFieldSettings
                            id={'firstName'}
                            isDisabled={(['ldap', 'saml'].includes(service) && lockedFirstName) || ['gitlab', 'google', 'office365'].includes(service)}
                            onChange={updateField}
                            value={userInfo.firstName}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'lastName'}
                            isDisabled={(['ldap', 'saml'].includes(service) && lockedLastName) || ['gitlab', 'google', 'office365'].includes(service)}
                            onChange={updateField}
                            value={userInfo.lastName}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'username'}
                            isDisabled={service !== ''}
                            onChange={updateField}
                            value={userInfo.username}
                            maxLength={22}
                        />
                        <View style={style.separator}/>
                        <EmailSettings
                            email={userInfo.email}
                            currentUser={currentUser}
                            onChange={updateField}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'nickname'}
                            isDisabled={['ldap', 'saml'].includes(service) && lockedNickname}
                            onChange={updateField}
                            value={userInfo.nickname}
                            maxLength={22}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'position'}
                            isDisabled={['ldap', 'saml'].includes(service) && lockedPosition}
                            onChange={updateField}
                            value={userInfo.position}
                            maxLength={128}
                            optional={true}
                        />
                        <View style={style.footer}/>
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        </>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);

    return {
        currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(switchMap((id) => database.get<UserModel>(USER).findAndObserve(id.value))),
        lockedFirstName: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapFirstNameAttributeSet === 'true' || value.SamlFirstNameAttributeSet === 'true'),
            ),
        ),
        lockedLastName: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapLastNameAttributeSet === 'true' || value.SamlLastNameAttributeSet === 'true'),
            ),
        ),
        lockedNickname: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapNicknameAttributeSet === 'true' || value.SamlNicknameAttributeSet === 'true'),
            ),
        ),
        lockedPosition: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapPositionAttributeSet === 'true' || value.SamlPositionAttributeSet === 'true'),
            ),
        ),
        lockedPicture: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapPictureAttributeSet === 'true'),
            ),
        ),
    };
});

export default withDatabase(enhanced(EditProfile));
