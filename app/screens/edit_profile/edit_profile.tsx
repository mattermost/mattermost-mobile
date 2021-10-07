// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {PureComponent} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {ScrollView, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';
import {switchMap} from 'rxjs/operators';

import StatusBar from '@components/status_bar/index';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {t} from '@i18n';
import {VALID_MIME_TYPES} from '@screens/edit_profile/constants';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {WithDatabaseArgs} from '@typings/database/database';
import SystemModel from '@typings/database/models/servers/system';
import UserModel from '@typings/database/models/servers/user';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CommonFieldSettings from './components/common_field_settings';
import DisplayError from './components/display_error';
import EmailSettings from './components/email_settings';
import ProfileUpdating from './components/profile_updating';

type EditProfileProps = {
    commandType: string;
    componentId: string;
    config: SystemModel;
    currentUser: UserModel;
    intl: IntlShape;
    theme: Theme;
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

class EditProfile extends PureComponent<EditProfileProps, EditProfileState> {
    private firstNameDisabled: boolean | undefined;
    private lastNameDisabled: boolean | undefined;
    private navigationEventListener: EventSubscription | undefined;
    private nicknameDisabled: boolean | undefined;
    private positionDisabled: boolean | undefined;
    private profilePictureDisabled: boolean | undefined;
    private readonly scrollViewRef: React.RefObject<KeyboardAwareScrollView>;

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

        this.setUp();

        this.scrollViewRef = React.createRef<KeyboardAwareScrollView>();
    }

    setUp = () => {
        const {currentUser: {authService: service}, config: {value: configValue}} = this.props;

        this.firstNameDisabled = (service === 'ldap' && configValue.LdapFirstNameAttributeSet === 'true') ||
            (service === 'saml' && configValue.SamlFirstNameAttributeSet === 'true') ||
            (['gitlab', 'google', 'office365'].includes(service));

        this.lastNameDisabled = (service === 'ldap' && configValue.LdapLastNameAttributeSet === 'true') ||
            (service === 'saml' && configValue.SamlLastNameAttributeSet === 'true') ||
            (['gitlab', 'google', 'office365'].includes(service));

        this.nicknameDisabled = (service === 'ldap' && configValue.LdapNicknameAttributeSet === 'true') ||
            (service === 'saml' && configValue.SamlNicknameAttributeSet === 'true');

        this.positionDisabled = (service === 'ldap' && configValue.LdapPositionAttributeSet === 'true') ||
            (service === 'saml' && configValue.SamlPositionAttributeSet === 'true');

        this.profilePictureDisabled = (service === 'ldap' || service === 'saml') && configValue.LdapPictureAttributeSet === 'true';
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
        if (this.scrollViewRef?.current) {
            const scrollView = this.scrollViewRef?.current as unknown as ScrollView;
            scrollView.scrollTo({x: 0, y: 0});
        }
    };

    canUpdate = (updatedField?: Partial<Fields>) => {
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

    submitUser = preventDoubleTap(async () => {
        this.emitCanUpdateAccount(false);
        this.setState({error: null, updating: true});

        const {email, firstName, lastName, nickname, position, username} = this.state;
        const user = {email, first_name: firstName, last_name: lastName, nickname, position, username};

        //todo: To be handled in next PRs
        // if (profileImage) {actions.setProfileImageUri(profileImage.uri);/* this.uploadProfileImage().catch(this.handleUploadError);*/}

        //todo: To be handled in next PRs
        // if (isProfileImageRemoved) {actions.removeProfileImage(currentUser.id);}

        if (this.canUpdate()) {
            const {error} = await updateUser(user);
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

    setScrollViewRef = () => {
        return this.scrollViewRef;
    };

    render() {
        const {currentUser, theme} = this.props;
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
                            isDisabled={Boolean(this.firstNameDisabled)}
                            onChange={this.updateField}
                            value={firstName}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'lastName'}
                            isDisabled={Boolean(this.lastNameDisabled)}
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
                            isDisabled={Boolean(this.nicknameDisabled)}
                            onChange={this.updateField}
                            value={nickname}
                            maxLength={22}
                        />
                        <View style={style.separator}/>
                        <CommonFieldSettings
                            id={'position'}
                            isDisabled={Boolean(this.positionDisabled)}
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

export default withDatabase(withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((userId: SystemModel) => database.get(MM_TABLES.SERVER.USER).findAndObserve(userId.id)),
    ),
    config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
}))(injectIntl(EditProfile)));
