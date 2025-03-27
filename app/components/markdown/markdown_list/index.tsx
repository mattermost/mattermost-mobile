// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactElement} from 'react';

type MarkdownListProps = {
   children: ReactElement[];
   ordered: boolean;
   start: number;
   tight: boolean;
};

const MarkdownList = ({start = 1, tight, ordered, children}: MarkdownListProps) => {
    let bulletWidth = 15;
    if (ordered) {
        const lastNumber = (start + children.length) - 1;
        bulletWidth = (9 * lastNumber.toString().length) + 7;
    }

    const childrenElements = React.Children.map(children, (child) => {
        return React.cloneElement(child, {
            bulletWidth,
            ordered,
            tight,
        });
    });

    return (
        <>
            {childrenElements}
        </>
    );
};

export default MarkdownList;
