// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Alert, View} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {DocumentPickerUtil} from 'react-native-document-picker';

import {Client4} from 'mattermost-redux/client';

import {buildFileUploadData, encodeHeaderURIStringToUTF8} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

import TextSetting from 'app/components/widgets/settings/text_setting';
import Loading from 'app/components/loading';
import ErrorText from 'app/components/error_text';
import StatusBar from 'app/components/status_bar/index';
import ProfilePictureButton from 'app/components/profile_picture_button';
import ProfilePicture from 'app/components/profile_picture';
import mattermostBucket from 'app/mattermost_bucket';

import {getFormattedFileSize} from 'mattermost-redux/utils/file_utils';

const MAX_SIZE = 20 * 1024 * 1024;
const holders = {
    firstName: {
        id: t('user.settings.general.firstName'),
        defaultMessage: 'First Name',
    },
    lastName: {
        id: t('user.settings.general.lastName'),
        defaultMessage: 'Last Name',
    },
    username: {
        id: t('user.settings.general.username'),
        defaultMessage: 'Username',
    },
    nickname: {
        id: t('user.settings.general.nickname'),
        defaultMessage: 'Nickname',
    },
    position: {
        id: t('user.settings.general.position'),
        defaultMessage: 'Position',
    },
    email: {
        id: t('user.settings.general.email'),
        defaultMessage: 'Email',
    },
};

export default class EditProfile extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            setProfileImageUri: PropTypes.func.isRequired,
            removeProfileImage: PropTypes.func.isRequired,
            updateUser: PropTypes.func.isRequired,
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    leftButton = {
        id: 'close-settings',
    };

    rightButton = {
        id: 'update-profile',
        disabled: true,
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);

        const {email, first_name: firstName, last_name: lastName, nickname, position, username} = props.currentUser;
        const buttons = {
            leftButtons: [this.leftButton],
            rightButtons: [this.rightButton],
        };

        this.leftButton.title = context.intl.formatMessage({id: t('mobile.account.settings.cancel'), defaultMessage: 'Cancel'});
        this.rightButton.title = context.intl.formatMessage({id: t('mobile.account.settings.save'), defaultMessage: 'Save'});

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);

        this.state = {
            email,
            firstName,
            lastName,
            nickname,
            position,
            username,
        };
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
        this.props.navigator.dismissModal({
            animationType: 'slide-down',
        });
    };

    emitCanUpdateAccount = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}],
        };

        this.props.navigator.setButtons(buttons);
    };

    handleRequestError = (error) => {
        this.setState({error, updating: false});
        this.emitCanUpdateAccount(true);
        if (this.scrollView) {
            this.scrollView.props.scrollToPosition(0, 0);
        }
    };

    submitUser = preventDoubleTap(async () => {
        this.emitCanUpdateAccount(false);
        this.setState({error: null, updating: true});

        const {
            profileImage,
            profileImageRemove,
            firstName,
            lastName,
            username,
            nickname,
            position,
            email,
        } = this.state;
        const user = {
            first_name: firstName,
            last_name: lastName,
            username,
            nickname,
            position,
            email,
        };
        const {actions, currentUser} = this.props;

        if (profileImage) {
            actions.setProfileImageUri(profileImage.uri);
            this.uploadProfileImage().catch(this.handleUploadError);
        }

        if (profileImageRemove) {
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
        this.setState({profileImageRemove: true});
        this.emitCanUpdateAccount(true);
        this.props.navigator.dismissModal({
            animationType: 'none',
        });
    }

    uploadProfileImage = async () => {
        const {profileImage} = this.state;
        const {currentUser} = this.props;
        const fileData = buildFileUploadData(profileImage);

        const headers = {
            Authorization: `Bearer ${Client4.getToken()}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'multipart/form-data',
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

        return RNFetchBlob.config(options).fetch('POST', `${Client4.getUserRoute(currentUser.id)}/image`, headers, [fileInfo]);
    };

    updateField = (id, name) => {
        const field = {[id]: name};
        this.setState(field, () => {
            this.emitCanUpdateAccount(this.canUpdate(field));
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'update-profile':
                this.submitUser();
                break;
            case 'close-settings':
                this.close();
                break;
            }
        }
    };

    onShowFileSizeWarning = (filename) => {
        const {formatMessage} = this.context.intl;
        const fileSizeWarning = formatMessage({
            id: 'file_upload.fileAbove',
            defaultMessage: 'File above {max}MB cannot be uploaded: {filename}',
        }, {
            max: getFormattedFileSize({size: MAX_SIZE}),
            filename,
        });

        Alert.alert(fileSizeWarning);
    };

    renderFirstNameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {firstName} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' && config.LdapFristNameAttributeSet === 'true') ||
            (service === 'saml' && config.SamlFirstNameAttributeSet === 'true');

        return (
            <TextSetting
                disabled={disabled}
                id='firstName'
                label={holders.firstName}
                disabledText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                onChange={this.updateField}
                theme={theme}
                value={firstName}
            />
        );
    };

    renderLastNameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {lastName} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' && config.LdapLastNameAttributeSet === 'true') ||
            (service === 'saml' && config.SamlLastNameAttributeSet === 'true');

        return (
            <View>
                <TextSetting
                    disabled={disabled}
                    id='lastName'
                    label={holders.lastName}
                    disabledText={formatMessage({
                        id: 'user.settings.general.field_handled_externally',
                        defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                    })}
                    onChange={this.updateField}
                    theme={theme}
                    value={lastName}
                />
            </View>
        );
    };

    renderUsernameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {currentUser, theme} = this.props;
        const {username} = this.state;
        const disabled = currentUser.auth_service !== '';

        return (
            <TextSetting
                disabled={disabled}
                id='username'
                label={holders.username}
                disabledText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                maxLength={22}
                onChange={this.updateField}
                theme={theme}
                value={username}
            />
        );
    };

    renderEmailSettings = () => {
        const {formatMessage} = this.context.intl;
        const {currentUser, theme} = this.props;
        const {email} = this.state;

        let helpText;

        if (currentUser.auth_service === '') {
            helpText = formatMessage({
                id: 'user.settings.general.emailCantUpdate',
                defaultMessage: 'Email must be updated using a web client or desktop application.',
            });
        } else {
            switch (currentUser.auth_service) {
            case 'gitlab':
                helpText = formatMessage({
                    id: 'user.settings.general.emailGitlabCantUpdate',
                    defaultMessage: 'Login occurs through GitLab. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'google':
                helpText = formatMessage({
                    id: 'user.settings.general.emailGoogleCantUpdate',
                    defaultMessage: 'Login occurs through Google Apps. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'office365':
                helpText = formatMessage({
                    id: 'user.settings.general.emailOffice365CantUpdate',
                    defaultMessage: 'Login occurs through Office 365. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'ldap':
                helpText = formatMessage({
                    id: 'user.settings.general.emailLdapCantUpdate',
                    defaultMessage: 'Login occurs through AD/LDAP. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'saml':
                helpText = formatMessage({
                    id: 'user.settings.general.emailSamlCantUpdate',
                    defaultMessage: 'Login occurs through SAML. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            }
        }

        return (
            <View>
                <TextSetting
                    disabled={true}
                    id='email'
                    label={holders.email}
                    disabledText={helpText}
                    onChange={this.updateField}
                    theme={theme}
                    value={email}
                />
            </View>
        );
    };

    renderNicknameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {nickname} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' && config.LdapNicknameAttributeSet === 'true') ||
            (service === 'saml' && config.SamlNicknameAttributeSet === 'true');

        return (
            <TextSetting
                disabled={disabled}
                id='nickname'
                label={holders.nickname}
                disabledText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                maxLength={22}
                onChange={this.updateField}
                theme={theme}
                value={nickname}
            />
        );
    };

    renderPositionSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {position} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' || service === 'saml') && config.PositionAttribute === 'true';

        return (
            <TextSetting
                disabled={disabled}
                id='position'
                label={holders.position}
                disabledText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                maxLength={128}
                onChange={this.updateField}
                theme={theme}
                value={position}
            />
        );
    };

    scrollViewRef = (ref) => {
        this.scrollView = ref;
    };

    renderProfilePicture = () => {
        const {
            currentUser,
            theme,
            navigator,
        } = this.props;

        const {
            profileImage,
            profileImageRemove,
        } = this.state;

        const style = getStyleSheet(theme);
        const uri = profileImage ? profileImage.uri : null;

        return (
            <View style={style.top}>
                <ProfilePictureButton
                    currentUser={currentUser}
                    theme={theme}
                    blurTextBox={emptyFunction}
                    browseFileTypes={DocumentPickerUtil.images()}
                    canTakeVideo={false}
                    canBrowseVideoLibrary={false}
                    maxFileSize={MAX_SIZE}
                    navigator={navigator}
                    wrapper={true}
                    uploadFiles={this.handleUploadProfileImage}
                    removeProfileImage={this.handleRemoveProfileImage}
                    onShowFileSizeWarning={this.onShowFileSizeWarning}
                >
                    <ProfilePicture
                        userId={currentUser.id}
                        size={150}
                        statusBorderWidth={6}
                        statusSize={40}
                        edit={true}
                        imageUri={uri}
                        profileImageRemove={profileImageRemove}
                    />
                </ProfilePictureButton>
            </View>
        );
    }

    render() {
        const {theme} = this.props;

        const {
            error,
            updating,
        } = this.state;

        const style = getStyleSheet(theme);

        if (updating) {
            return (
                <View style={[style.container, style.flex]}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        let displayError;
        if (error) {
            displayError = (
                <View style={style.errorContainer}>
                    <View style={style.errorWrapper}>
                        <ErrorText
                            error={error}
                            textStyle={style.errorText}
                        />
                    </View>
                </View>
            );
        }

        return (
            <View style={style.flex}>
                <StatusBar/>
                <KeyboardAwareScrollView
                    bounces={false}
                    innerRef={this.scrollViewRef}
                    style={style.container}
                >
                    {displayError}
                    <View style={[style.scrollView]}>
                        {this.renderProfilePicture()}
                        {this.renderFirstNameSettings()}
                        <View style={style.separator}/>
                        {this.renderLastNameSettings()}
                        <View style={style.separator}/>
                        {this.renderUsernameSettings()}
                        <View style={style.separator}/>
                        {this.renderEmailSettings()}
                        <View style={style.separator}/>
                        {this.renderNicknameSettings()}
                        <View style={style.separator}/>
                        {this.renderPositionSettings()}
                        <View style={style.footer}/>
                    </View>
                </KeyboardAwareScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            backgroundColor: theme.centerChannelBg,
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
        errorContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            width: '100%',
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        errorText: {
            fontSize: 14,
            marginHorizontal: 15,
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
