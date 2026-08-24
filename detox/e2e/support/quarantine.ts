// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Test hooks for quarantined specs — tests excluded from normal runs because
 * they are known to fail.
 *
 * These replace a bare `it.skip` / `describe.skip`. A bare skip records only
 * that someone once turned the test off; it cannot be distinguished from a
 * platform gate, and it cannot be turned back on without editing the file. The
 * hooks below keep the same default (skipped) while making the reason explicit
 * and the set re-runnable via RUN_QUARANTINED_TESTS=true.
 *
 * Follows the existing conditional-hook idiom in this suite, e.g.
 * `const itWithSecondServer = hasSecondServer ? it : it.skip` in
 * server_login.e2e.ts.
 *
 * Use these ONLY for "this test is broken". A test that does not apply to a
 * platform or a topology is not quarantined — keep using an explicit condition
 * such as `isIos() ? it.skip : it`, which stays skipped even here.
 */

import {runQuarantinedTests} from '@support/test_config';

export const itQuarantined = runQuarantinedTests ? it : it.skip;

export const describeQuarantined = runQuarantinedTests ? describe : describe.skip;
