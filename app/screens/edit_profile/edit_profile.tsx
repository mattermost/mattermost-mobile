// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getFormattedFileSize} from '@mm-redux/utils/file_utils';
import React, {PureComponent} from 'react';
import {Alert, View} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scrollview';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';
import RNFetchBlob from 'rn-fetch-blob';

import StatusBar from '@components/status_bar/index';
import TextSetting from '@components/widgets/text_settings';
import {t} from '@i18n';
import {HOLDERS, MAX_SIZE} from '@screens/edit_profile/constants';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import UserModel from '@typings/database/models/servers/user';
import {buildFileUploadData, encodeHeaderURIStringToUTF8} from '@utils/file';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import mattermostBucket from 'app/mattermost_bucket';

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

type EditProfileState = {
    email: string;
    error: Error | null;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    profileImage: string | undefined;
    isProfileImageRemoved: boolean;
    username: string;
    updating: boolean;
};

export default class EditProfile extends PureComponent<EditProfileProps, EditProfileState> {
    private scrollViewRef: any;
    private navigationEventListener: EventSubscription | undefined;

    constructor(props: EditProfileProps) {
        super(props);
        const {componentId, currentUser, theme, intl} = props;
        const {email, firstName, lastName, nickname, position, username} = currentUser;

        const buttons = {
            rightButtons: [{
                id: 'update-profile',
                enabled: false,
                showAsAction: 'always',
                testID: 'edit_profile.save.button',
                color: theme.sidebarHeaderTextColor,
                text: intl.formatMessage({id: t('mobile.account.settings.save'), defaultMessage: 'Save'}),
            }],
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

    canUpdate = (updatedField) => {
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
                    userKey = 'first_name';
                    break;
                case 'lastName':
                    userKey = 'last_name';
                    break;
                default:
                    userKey = key;
                    break;
            }

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
            rightButtons: [{...this.rightButton, enabled}],
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
            this.uploadProfileImage().catch(this.handleUploadError);
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

    handleUploadProfileImage = (images) => {
        const image = images && images.length > 0 && images[0];
        this.setState({profileImage: image});
        this.emitCanUpdateAccount(true);
    };

    handleRemoveProfileImage = () => {
        this.setState({isProfileImageRemoved: true});
        this.emitCanUpdateAccount(true);
    };

    uploadProfileImage = async () => {
        const {profileImage} = this.state;
        const {currentUser} = this.props;
        const fileData = buildFileUploadData(profileImage);

        const headers = {
            Authorization: `Bearer ${Client4.getToken()}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'multipart/form-data',
            'X-CSRF-Token': Client4.csrf,
        };

        const fileInfo = {
            name: 'image',
            filename: encodeHeaderURIStringToUTF8(fileData.name),
            data: RNFetchBlob.wrap(profileImage.uri.replace('file://', '')),
            type: fileData.type,
        };

        const certificate = await mattermostBucket.getPreference('cert');
        const options = {
            timeout: 10000,
            certificate,
        };

        return RNFetchBlob.config(options).fetch(
            'POST',
            `${Client4.getUserRoute(currentUser.id)}/image`,
            headers,
            [fileInfo],
        );
    };

    updateField = (id: string, name: string) => {
        const field = {[id]: name};
        this.setState(field, () => {
            this.emitCanUpdateAccount(this.canUpdate(field));
        });
    };

    onShowFileSizeWarning = () => {
        const {intl} = this.props;

        const fileSizeWarning = intl.formatMessage(
            {
                id: 'file_upload.fileAbove',
                defaultMessage: 'Files must be less than {max}',
            },
            {
                max: getFormattedFileSize({size: MAX_SIZE}),
            },
        );

        Alert.alert(fileSizeWarning);
    };

    onShowUnsupportedMimeTypeWarning = () => {
        const {intl} = this.props;
        const fileTypeWarning = intl.formatMessage({
            id: 'mobile.file_upload.unsupportedMimeType',
            defaultMessage:
                'Only BMP, JPG or PNG images may be used for profile pictures.',
        });

        Alert.alert('', fileTypeWarning);
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
