// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';

import {setAutocompleteSelector} from 'app/actions/views/post';

import AutocompleteSelector from './autocomplete_selector';
import {isLandscape} from 'app/selectors/device';

function mapStateToProps(state) {
    return {
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setAutocompleteSelector,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AutocompleteSelector);
