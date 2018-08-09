// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {setProfileImageUri, updateUser} from 'app/actions/views/edit_profile';

import EditProfile from './edit_profile';

function mapStateToProps(state) {
    return {
        config: getConfig(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setProfileImageUri,
            updateUser,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditProfile);
