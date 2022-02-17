// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const svgM = (x: number, y: number) => `M ${x} ${y}`;
export const svgL = (x: number, y: number) => `L ${x} ${y}`;
export const svgArc = (toX: number, toY: number, radius: number) => `A ${radius},${radius} 0 0 0 ${toX},${toY}`;
export const z = 'z';

export const constructRectangularPathWithBorderRadius = (
    parentBounds: TutorialItemBounds,
    itemBounds: TutorialItemBounds,
    borderRadius = 0,
): string => {
    const {startX, startY, endX, endY} = itemBounds;
    return [
        svgM(parentBounds.startX, parentBounds.startY),
        svgL(parentBounds.startX, parentBounds.endY),
        svgL(parentBounds.endX, parentBounds.endY),
        svgL(parentBounds.endX, parentBounds.startY),
        z,
        svgM(startX, startY + borderRadius),
        svgL(startX, endY - borderRadius),
        svgArc(startX + borderRadius, endY, borderRadius),
        svgL(endX - borderRadius, endY),
        svgArc(endX, endY - borderRadius, borderRadius),
        svgL(endX, startY + borderRadius),
        svgArc(endX - borderRadius, startY, borderRadius),
        svgL(startX + borderRadius, startY),
        svgArc(startX, startY + borderRadius, borderRadius),
    ].join(' ');
};
