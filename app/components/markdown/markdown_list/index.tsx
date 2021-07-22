// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, ReactElement} from 'react';

type MarkdownList = {
   children: ReactElement[];
   isOrdered: boolean;
   start: number;
   isTight: boolean;
};

const MarkdownList = ({start = 1, isTight, isOrdered, children}: MarkdownList) => {
    let bulletWidth = 15;
    if (isOrdered) {
        const lastNumber = (start + children.length) - 1;
        bulletWidth = (9 * lastNumber.toString().length) + 7;
    }

    const childrenElements = React.Children.map(children, (child) => {
        return React.cloneElement(child, {
            bulletWidth,
            ordered: isOrdered,
            tight: isTight,
        });
    });

    return (
        <React.Fragment>
            {childrenElements}
        </React.Fragment>
    );
};

export default memo(MarkdownList);
