// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

// import {bindActionCreators} from 'redux';

import {/*getMyPreferences, */getTheme} from '@mm-redux/selectors/entities/preferences';
// import {isPostFlagged} from '@mm-redux/utils/post_utils';
import {getDimensions} from '@selectors/device';

import ThreadOptions, {} from './thread_options';

import type {GlobalState} from '@mm-redux/types/store';

// import type {DispatchFunc} from '@mm-redux/types/actions';

export function makeMapStateToProps() {
    return (state: GlobalState/*, ownProps*/) => {
        // const myPreferences = getMyPreferences(state);
        return {
            ...getDimensions(state),

            // isFlagged: isPostFlagged(post.id, myPreferences),
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(/*dispatch: DispatchFunc*/) {
    return {

        // actions: bindActionCreators({

        //     //
        // }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ThreadOptions);
