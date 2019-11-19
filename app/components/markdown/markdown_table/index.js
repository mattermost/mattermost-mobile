// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getDimensions} from 'app/selectors/device';

import MarkdownTable from './markdown_table';

function mapStateToProps(state) {
    const {deviceWidth} = getDimensions(state);

    return {
        deviceWidth,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(MarkdownTable);
