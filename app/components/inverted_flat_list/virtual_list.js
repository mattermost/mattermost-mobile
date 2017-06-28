// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {VirtualizedList} from 'react-native';

/* eslint-disable */

export default class Virtualized extends VirtualizedList {
    _onScroll = (e) => {
        if (this.props.onScroll) {
            this.props.onScroll(e);
        }
        const timestamp = e.timeStamp;
        const visibleLength = this._selectLength(e.nativeEvent.layoutMeasurement);
        const contentLength = this._selectLength(e.nativeEvent.contentSize);
        const offset = this._selectOffset(e.nativeEvent.contentOffset);
        const dt = Math.max(1, timestamp - this._scrollMetrics.timestamp);
        const dOffset = offset - this._scrollMetrics.offset;
        const velocity = dOffset / dt;
        this._scrollMetrics = {contentLength, dt, offset, timestamp, velocity, visibleLength};
        const {data, getItemCount, onEndReached, onEndReachedThreshold, windowSize} = this.props;
        this._updateViewableItems(data);
        if (!data) {
            return;
        }
        const distanceFromEnd = contentLength - visibleLength - offset;
        const itemCount = getItemCount(data);
        if (this.state.last === itemCount - 1 &&
            distanceFromEnd <= onEndReachedThreshold &&
            (this._hasDataChangedSinceEndReached ||
            this._scrollMetrics.contentLength !== this._sentEndForContentLength)) {
            // Only call onEndReached once for a given dataset + content length.
            this._hasDataChangedSinceEndReached = false;
            this._sentEndForContentLength = this._scrollMetrics.contentLength;
            onEndReached({distanceFromEnd});
        }
        const {first, last} = this.state;
        if ((first > 0 && velocity < 0) || (last < itemCount - 1 && velocity > 0)) {
            const distanceToContentEdge = Math.min(
                Math.abs(this._getFrameMetricsApprox(first).offset - offset),
                Math.abs(this._getFrameMetricsApprox(last).offset - (offset + visibleLength)),
            );
            const hiPri = distanceToContentEdge < (windowSize * visibleLength / 4);
            if (hiPri) {
                // Don't worry about interactions when scrolling quickly; focus on filling content as fast
                // as possible.
                this._updateCellsToRenderBatcher.dispose({abort: true});
                this._updateCellsToRender();
                return;
            }
        }
        this._updateCellsToRenderBatcher.schedule();
    };
}
