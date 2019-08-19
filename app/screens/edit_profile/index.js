// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';
import {isLandscape} from 'app/selectors/device';
import {popTopScreen, dismissModal, setButtons} from 'app/actions/navigation';
import {setProfileImageUri, removeProfileImage, updateUser} from 'app/actions/views/edit_profile';

import EditProfile from './edit_profile';

function mapStateToProps(state, ownProps) {
    const config = getConfig(state);
    const {serverVersion} = state.entities.general;
    const {auth_service: service} = ownProps.currentUser;

    const firstNameDisabled = (service === 'ldap' && config.LdapFirstNameAttributeSet === 'true') ||
        (service === 'saml' && config.SamlFirstNameAttributeSet === 'true');

    const lastNameDisabled = (service === 'ldap' && config.LdapLastNameAttributeSet === 'true') ||
        (service === 'saml' && config.SamlLastNameAttributeSet === 'true');

    const nicknameDisabled = (service === 'ldap' && config.LdapNicknameAttributeSet === 'true') ||
        (service === 'saml' && config.SamlNicknameAttributeSet === 'true');

    let positionDisabled = false;
    if (isMinimumServerVersion(serverVersion, 5, 12)) {
        positionDisabled = (service === 'ldap' && config.LdapPositionAttributeSet === 'true') ||
            (service === 'saml' && config.SamlPositionAttributeSet === 'true');
    } else {
        positionDisabled = (service === 'ldap' || service === 'saml') && config.PositionAttribute === 'true';
    }

    return {
        firstNameDisabled,
        lastNameDisabled,
        nicknameDisabled,
        positionDisabled,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setProfileImageUri,
            removeProfileImage,
            updateUser,
            popTopScreen,
            dismissModal,
            setButtons,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditProfile);
