// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getChannelAttributeEditorSnapPoints, SHEET_MAX_ROWS} from './utils';

// Mirrors the one mutation GenericBottomSheetRoute performs on whatever this
// helper returns, so ordering can be asserted the way it will actually be
// consumed rather than on the helper's raw output.
function applyRouteMargin(points: number[], margin: number): number[] {
    const withMargin = [...points];
    if (typeof withMargin[1] === 'number') {
        withMargin[1] += margin;
    }
    return withMargin;
}

describe('getChannelAttributeEditorSnapPoints', () => {
    const base = {
        bottomInset: 0,
        isTablet: false,
        windowHeight: 800,
    };

    it('should return two ascending points ordered bottom to top', () => {
        const [closed, open] = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 3});

        expect(closed).toBe(1);
        expect(open).toBeGreaterThan(closed);
    });

    it('should never resolve the open point above the window-height cap', () => {
        const [, open] = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 3});

        expect(open).toBeLessThanOrEqual(base.windowHeight * 0.8);
    });

    it('should never resolve the effective, post-route-margin open point above the window-height cap', () => {
        const bottomInset = 34;
        const points = getChannelAttributeEditorSnapPoints({...base, bottomInset, fieldType: 'select', totalRows: 3});
        const [, effectiveOpen] = applyRouteMargin(points, bottomInset);

        expect(effectiveOpen).toBeLessThanOrEqual(base.windowHeight * 0.8);
    });

    it('should cap the collapsed point on a short window instead of exceeding it', () => {
        const [, open] = getChannelAttributeEditorSnapPoints({...base, windowHeight: 320, fieldType: 'select', totalRows: 3});

        expect(open).toBeLessThanOrEqual(320 * 0.8);
    });

    it('should add a taller third point for an option field only when there are more rows than the collapsed estimate covers', () => {
        const withinLimit = getChannelAttributeEditorSnapPoints({...base, fieldType: 'multiselect', totalRows: SHEET_MAX_ROWS});
        const overLimit = getChannelAttributeEditorSnapPoints({...base, fieldType: 'multiselect', totalRows: SHEET_MAX_ROWS + 10});

        expect(withinLimit).toHaveLength(2);
        expect(overLimit).toHaveLength(3);
    });

    it('should keep the three points strictly ascending when a taller point is offered', () => {
        const points = getChannelAttributeEditorSnapPoints({...base, fieldType: 'multiselect', totalRows: SHEET_MAX_ROWS + 10});

        expect(points[0]).toBeLessThan(points[1]);
        expect(points[1]).toBeLessThan(points[2]);
    });

    it('should never offer a taller point for a text field: it never has more than one row, and the caller opens it with keyboardBehavior="interactive" instead of relying on a taller snap point for the keyboard', () => {
        const points = getChannelAttributeEditorSnapPoints({...base, fieldType: 'text', totalRows: 1});

        expect(points).toHaveLength(2);
    });

    it('should stay ordered after GenericBottomSheetRoute applies its margin, for every window height that offers a third point', () => {
        // Scans rather than hand-picking one windowHeight: what matters is that
        // no window size in range ever produces an inversion once the route's
        // margin lands on the second point, not that one particular value does.
        let sawThreePoints = false;
        for (let windowHeight = 300; windowHeight <= 1200; windowHeight += 10) {
            const points = getChannelAttributeEditorSnapPoints({...base, windowHeight, bottomInset: 34, fieldType: 'multiselect', totalRows: SHEET_MAX_ROWS + 10});
            if (points.length < 3) {
                continue;
            }
            sawThreePoints = true;

            const afterRoute = applyRouteMargin(points, 34);
            expect(afterRoute[1]).toBeLessThan(afterRoute[2]);
        }

        expect(sawThreePoints).toBe(true);
    });

    it('should drop the taller point rather than risk an inversion when the collapsed estimate lands within the route margin of the cap', () => {
        // Scans for a windowHeight where the collapsed point ends up close
        // enough to the cap that adding the route's margin would invert it, and
        // asserts the helper falls back to two points there instead.
        let sawDroppedPoint = false;
        for (let windowHeight = 300; windowHeight <= 1200; windowHeight += 10) {
            const uncapped = getChannelAttributeEditorSnapPoints({...base, windowHeight, bottomInset: 0, fieldType: 'multiselect', totalRows: SHEET_MAX_ROWS + 10});
            const points = getChannelAttributeEditorSnapPoints({...base, windowHeight, bottomInset: 34, fieldType: 'multiselect', totalRows: SHEET_MAX_ROWS + 10});

            if (uncapped.length === 3 && points.length === 2) {
                sawDroppedPoint = true;
            }
        }

        expect(sawDroppedPoint).toBe(true);
    });

    it('should reserve extra height for the save button on text and multiselect fields but not select', () => {
        const selectPoints = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 1});
        const multiselectPoints = getChannelAttributeEditorSnapPoints({...base, fieldType: 'multiselect', totalRows: 1});

        expect(multiselectPoints[1]).toBeGreaterThan(selectPoints[1]);
    });

    it('should account for the safe-area inset only when a save button is shown', () => {
        const withoutInset = getChannelAttributeEditorSnapPoints({...base, fieldType: 'multiselect', totalRows: 1});
        const withInset = getChannelAttributeEditorSnapPoints({...base, fieldType: 'multiselect', totalRows: 1, bottomInset: 34});
        const selectWithoutInset = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 1});
        const selectWithInset = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 1, bottomInset: 34});

        expect(withInset[1]).toBe(withoutInset[1] + 34);
        expect(selectWithInset[1]).toBe(selectWithoutInset[1]);
    });

    it('should reserve more separator margin on tablet than on phone', () => {
        const phone = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 1, isTablet: false});
        const tablet = getChannelAttributeEditorSnapPoints({...base, fieldType: 'select', totalRows: 1, isTablet: true});

        expect(tablet[1]).toBeGreaterThan(phone[1]);
    });
});
