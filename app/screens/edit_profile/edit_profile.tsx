// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scrollview';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import StatusBar from '@components/status_bar/index';
import {t} from '@i18n';
import {VALID_MIME_TYPES} from '@screens/edit_profile/constants';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import UserModel from '@typings/database/models/servers/user';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CommonFieldSettings from './components/common_field_settings';
import DisplayError from './components/display_error';
import EmailSettings from './components/email_settings';
import ProfileUpdating from './components/profile_updating';

import type {IntlShape} from 'react-intl';

type EditProfileProps = {
    componentId: string;
    currentUser: UserModel;
    firstNameDisabled: boolean;
    lastNameDisabled: boolean;
    nicknameDisabled: boolean;
    positionDisabled: boolean;
    profilePictureDisabled: boolean;
    theme: Theme;
    commandType: string;
    isLandscape: boolean;
    intl: IntlShape;
};

type Fields = {
    email: string;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    username: string;
}
type EditProfileState = Fields & {
    error: Error | null;
    updating: boolean;
    profileImage: UploadedFile | undefined;
    isProfileImageRemoved: boolean;
};

type UploadedFile = {
    fileName: string;
    fileSize: number;
    height: number;
    type: typeof VALID_MIME_TYPES[number];
    uri: string;
    width: number;
}

export default class EditProfile extends PureComponent<EditProfileProps, EditProfileState> {
    private scrollViewRef: any;
    private navigationEventListener: EventSubscription | undefined;

    constructor(props: EditProfileProps) {
        super(props);
        const {componentId, currentUser} = props;
        const {email, firstName, lastName, nickname, position, username} = currentUser;

        const buttons = {
            rightButtons: [this.getRightButton()],
        };

        setButtons(componentId, buttons);

        this.state = {
            email,
            error: null,
            firstName,
            lastName,
            nickname,
            position,
            profileImage: undefined,
            isProfileImageRemoved: false,
            updating: false,
            username,
        };
    }

    getRightButton = () => {
        const {intl, theme} = this.props;
        return {
            id: 'update-profile',
            enabled: false,
            showAsAction: 'always',
            testID: 'edit_profile.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: t('mobile.account.settings.save'), defaultMessage: 'Save'}),
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({buttonId}: {buttonId: string}) {
        switch (buttonId) {
            case 'update-profile':
                this.submitUser();
                break;
            case 'close-settings':
                this.close();
                break;
        }
    }

    canUpdate = (updatedField: Partial<Fields>) => {
        const {currentUser} = this.props;
        const keys = Object.keys(this.state);
        const newState = {...this.state, ...(updatedField || {})};
        Reflect.deleteProperty(newState, 'error');
        Reflect.deleteProperty(newState, 'updating');

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let userKey;
            switch (key) {
                case 'firstName':
                    userKey = 'firstName';
                    break;
                case 'lastName':
                    userKey = 'lastName';
                    break;
                default:
                    userKey = key;
                    break;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (currentUser[userKey] !== newState[key]) {
                return true;
            }
        }

        return false;
    };

    close = () => {
        const {commandType, componentId} = this.props;
        if (commandType === 'Push') {
            popTopScreen(componentId);
        } else {
            dismissModal({componentId});
        }
    };

    emitCanUpdateAccount = (enabled: boolean) => {
        const {componentId} = this.props;
        const buttons = {
            rightButtons: [{...this.getRightButton(), enabled}],
        };

        setButtons(componentId, buttons);
    };

    handleRequestError = (error: Error) => {
        this.setState({error, updating: false});
        this.emitCanUpdateAccount(true);
        if (this.setScrollViewRef) {
            this.setScrollViewRef.props.scrollTo({x: 0, y: 0});
        }
    };

    submitUser = preventDoubleTap(async () => {
        this.emitCanUpdateAccount(false);
        this.setState({error: null, updating: true});

        const {email, firstName, isProfileImageRemoved, lastName, nickname, position, profileImage, username} = this.state;

        const user = {email, first_name: firstName, last_name: lastName, nickname, position, username};

        const {currentUser} = this.props;

        if (profileImage) {
            actions.setProfileImageUri(profileImage.uri);

            // this.uploadProfileImage().catch(this.handleUploadError);
        }

        if (isProfileImageRemoved) {
            actions.removeProfileImage(currentUser.id);
        }

        if (this.canUpdate()) {
            const {error} = await actions.updateUser(user);
            if (error) {
                this.handleRequestError(error);
                return;
            }
        }

        this.close();
    });

    updateField = (id: string, name: string) => {
        const field: Partial<Fields> = {[id]: name};
        this.setState(field as EditProfileState, () => {
            this.emitCanUpdateAccount(this.canUpdate(field));
        });
    };

    setScrollViewRef = (ref: any) => {
        this.setScrollViewRef = ref;
    };

    render() {
        const {currentUser, firstNameDisabled, lastNameDisabled, nicknameDisabled, positionDisabled, theme} = this.props;
        const {email, error, firstName, lastName, nickname, position, updating, username} = this.state;

        const style = getStyleSheet(theme);

        if (updating) {
            return <ProfileUpdating/>;
        }

        return (
            <SafeAreaView
                testID='edit_profile.screen'
                style={style.flex}
            >
                <StatusBar theme={theme}/>
                <KeyboardAwareScrollView
                    bounces={false}
                    innerRef={this.setScrollViewRef}
                    testID='edit_profile.scroll_view'
                >
                    {error && <DisplayError error={error}/>}
                    <View style={[style.scrollViewRef]}>
                        {/* todo: To be implemented {this.renderProfilePicture()} */}
                        <CommonFieldSettings
                            id={'firstName'}
                            isDisabled={firstNameDisabled}
                            onChange={this.updateField}
                            value={firstName}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'lastName'}
                            isDisabled={lastNameDisabled}
                            onChange={this.updateField}
                            value={lastName}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'username'}
                            isDisabled={currentUser.authService !== ''}
                            onChange={this.updateField}
                            value={username}
                            maxLength={22}
                        />
                        <View style={style.separator}/>
                        <EmailSettings
                            email={email}
                            currentUser={currentUser}
                            onChange={this.updateField}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'nickname'}
                            isDisabled={nicknameDisabled}
                            onChange={this.updateField}
                            value={nickname}
                            maxLength={22}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'position'}
                            isDisabled={positionDisabled}
                            onChange={this.updateField}
                            value={position}
                            maxLength={128}
                            optional={true}
                        />
                        <View style={style.footer}/>
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
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
