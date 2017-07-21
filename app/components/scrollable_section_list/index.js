// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {SectionList} from 'react-native';
import MetroListView from 'react-native/Libraries/Lists/MetroListView';
import VirtualizedSectionList from './virtualized_section_list';

export default class ScrollableSectionList extends SectionList {
    getWrapperRef = () => {
        return this._wrapperListRef; //eslint-disable-line no-underscore-dangle
    };

    render() {
        const List = this.props.legacyImplementation ?
            MetroListView :
            VirtualizedSectionList;
        return (
            <List
                {...this.props}
                ref={this._captureRef} //eslint-disable-line no-underscore-dangle
            />
        );
    }

    _wrapperListRef: MetroListView | VirtualizedSectionList<any>; //eslint-disable-line no-underscore-dangle
    _captureRef = (ref) => {
        this._wrapperListRef = ref; //eslint-disable-line no-underscore-dangle
    };
}
