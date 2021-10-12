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

import {updateMe} from '@actions/remote/user';
import ProfilePicture from '@components/profile_picture';
import StatusBar from '@components/status_bar/index';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {withServerUrl} from '@context/server_url';
import {withTheme} from '@context/theme';
import {t} from '@i18n';
import {dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {UploadedFile, UserInfo} from '@typings/screens/edit_profile';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CommonFieldSettings from './components/common_field_settings';
import DisplayError from './components/display_error';
import EmailSettings from './components/email_settings';
import ProfileUpdating from './components/profile_updating';

import type Database from '@nozbe/watermelondb/Database';
import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type EditProfileProps = {
    commandType: string;
    componentId: string;
    config: SystemModel;
    currentUser: UserModel;
    database: Database;
    intl: IntlShape;
    serverUrl: string;
    theme: Theme;
};

type EditProfileState = UserInfo & {
    error: Error | null;
    updating: boolean;
    profileImage: UploadedFile | undefined;
    isProfileImageRemoved: boolean;
};

const {SERVER: {USER, SYSTEM}} = MM_TABLES;

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
        this.scrollViewRef = React.createRef<KeyboardAwareScrollView>();

        setButtons(componentId, {
            rightButtons: [this.getRightButton()],
        });

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

    canUpdate = (updatedField?: Partial<UserInfo>) => {
        const {currentUser} = this.props;
        const keys = Object.keys(this.state);
        const newState: UserInfo = {...this.state, ...(updatedField || {})};
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

            // @ts-expect-error Here, we are comparing the current user value against the updated ones
            if (currentUser[userKey] !== newState[key]) {
                return true;
            }
        }

        return false;
    };

    submitUser = preventDoubleTap(async () => {
        const {currentUser, database, serverUrl} = this.props;
        const {email, firstName, lastName, nickname, position, username} = this.state;

        this.emitCanUpdateAccount(false);
        this.setState({error: null, updating: true});

        //todo: To be handled in next PRs
        // if (profileImage) {actions.setProfileImageUri(profileImage.uri);/* this.uploadProfileImage().catch(this.handleUploadError);*/}

        //todo: To be handled in next PRs
        // if (isProfileImageRemoved) {actions.removeProfileImage(currentUser.id);}

        if (this.canUpdate()) {
            try {
                await database.write(async () => {
                    // eslint-disable-next-line max-nested-callbacks
                    await currentUser.update(() => {
                        currentUser.email = email;
                        currentUser.firstName = firstName;
                        currentUser.lastName = lastName;
                        currentUser.nickname = nickname;
                        currentUser.position = position;
                        currentUser.username = username;
                    });
                });

                //fixme: the updateMe call is still returning an error of 400
                updateMe(serverUrl, currentUser);
            } catch (error) {
                this.handleRequestError(error as Error);
                return;
            }
        }

        this.close();
    });

    updateField = (id: string, name: string) => {
        const field: Partial<UserInfo> = {[id]: name};
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
                        <View style={style.top}>
                            <ProfilePicture
                                author={currentUser}
                                size={153}
                                iconSize={104}
                                statusSize={36}
                                testID='edit_profile.profile_picture'
                            />
                        </View>
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

const EnhancedProfile = injectIntl(withServerUrl(withTheme(EditProfile)));
export default withDatabase(withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(switchMap((id: SystemModel) => database.get(USER).findAndObserve(id.value))),
    config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
}))(EnhancedProfile));
