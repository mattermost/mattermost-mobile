// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';

export const Children = PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf([PropTypes.node])]);

export const Style = PropTypes.oneOfType([
    PropTypes.object, // inline style
    PropTypes.number, // style sheet entry
    PropTypes.array,
]);

export default {
    Children,
    Style,
};
