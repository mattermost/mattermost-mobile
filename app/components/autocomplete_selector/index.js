// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';

import AutocompleteSelector from './autocomplete_selector';

import {setAutocompleteSelector} from 'app/actions/views/post';

function mapStateToProps(state) {
    return {
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
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
