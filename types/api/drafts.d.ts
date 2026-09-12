// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// DraftProps carries server draft props round-tripped by mobile even when mobile
// does not interpret them. Absent props normalize to an empty object.
type DraftProps = Record<string, unknown>;
