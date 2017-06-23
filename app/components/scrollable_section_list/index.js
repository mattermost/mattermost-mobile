// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable */

import React from 'react';
import {SectionList} from 'react-native';
import MetroListView from 'react-native/Libraries/Lists/MetroListView';
import VirtualizedSectionList from './virtualized_section_list';

export default class ScrollableSectionList extends SectionList {
    getWrapperRef = () => {
        return this._wrapperListRef;
    };

    render() {
        const List = this.props.legacyImplementation
            ? MetroListView
            : VirtualizedSectionList;
        return <List {...this.props} ref={this._captureRef} />;
    }

    _wrapperListRef: MetroListView | VirtualizedSectionList<any>;
    _captureRef = ref => {
        this._wrapperListRef = ref;
    };
}
