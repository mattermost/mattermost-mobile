// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import XCTest
@testable import Gekidou

final class OutOfOfficeTests: XCTestCase {
    private let serverUrl = "https://out-of-office.example.com"
    private let otherServerUrl = "https://other.example.com"
    private let message: [AnyHashable: Any] = ["type": "message"]

    override func tearDown() {
        Preferences.default.removeObject(forKey: "outOfOfficeSettings." + serverUrl)
        super.tearDown()
    }

    private func save(allowCalls: Bool = false, allowMentions: Bool = false) throws {
        let settings: [String: Any] = ["enabled": true, "startAt": 1000, "endAt": 2000,
                                       "allowCalls": allowCalls, "allowMentions": allowMentions]
        let data = try JSONSerialization.data(withJSONObject: settings)
        Preferences.default.set(String(data: data, encoding: .utf8), forKey: "outOfOfficeSettings." + serverUrl)
    }

    func testScheduledPeriodIncludesStartAndExcludesEnd() throws {
        try save()
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: 999))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: 1000))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: 2000))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: otherServerUrl, payload: message, now: 1500))
    }

    func testExplicitMentionsBypassButOrdinaryMessagesDoNot() throws {
        try save(allowMentions: true)
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["is_mention": "true"], now: 1500))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["is_mention": true], now: 1500))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: 1500))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["is_mention": true], isCall: true, now: 1500))
    }

    func testAllowedCallsAndClearEventsBypassSuppression() throws {
        try save(allowCalls: true)
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, isCall: true, now: 1500))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["sub_type": "calls"], now: 1500))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["type": "clear"], now: 1500))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: 1500))
    }

    func testInvalidSettingsDoNotLeaveNotificationsMuted() {
        Preferences.default.set("invalid", forKey: "outOfOfficeSettings." + serverUrl)
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: 1500))
    }

    private func saveWeekly(_ overrides: [String: Any] = [:]) throws {
        var settings: [String: Any] = ["schedule": "weekly", "enabled": true, "quietHoursEnabled": true,
                                       "startMinute": 540, "endMinute": 1020, "daysOff": [],
                                       "allowCalls": false, "allowMentions": false]
        settings.merge(overrides) { _, new in new }
        let data = try JSONSerialization.data(withJSONObject: settings)
        Preferences.default.set(String(data: data, encoding: .utf8), forKey: "outOfOfficeSettings." + serverUrl)
    }

    private func localTime(day: Int = 16, hour: Int, minute: Int = 0) -> Double {
        let components = DateComponents(year: 2026, month: 11, day: day, hour: hour, minute: minute)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        return calendar.date(from: components)!.timeIntervalSince1970 * 1000
    }

    func testWeeklyHoursRepeatDailyAndRespectMinuteBoundaries() throws {
        try saveWeekly()
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 8, minute: 59)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 9)))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 17)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 18, hour: 12)))
    }

    func testWeeklyOvernightHoursSpanMidnight() throws {
        try saveWeekly(["startMinute": 1320, "endMinute": 420])
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 21, minute: 59)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 22)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 17, hour: 0)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 17, hour: 6, minute: 59)))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 17, hour: 7)))
    }

    func testTwoDaysOffCoverTheirEntireLocalCalendarDays() throws {
        // Wednesday and Sunday; hours disabled and equal endpoints are valid for days off alone.
        try saveWeekly(["quietHoursEnabled": false, "startMinute": 0, "endMinute": 0, "daysOff": [3, 0]])
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 17, hour: 23, minute: 59)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 18, hour: 0)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 18, hour: 23, minute: 59)))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 19, hour: 0)))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(day: 22, hour: 12)))
    }

    func testWeeklyExceptionsAlsoApplyDuringFullDaysOff() throws {
        try saveWeekly(["daysOff": [1], "allowCalls": true, "allowMentions": true])
        let now = localTime(hour: 0)
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, isCall: true, now: now))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["is_mention": "true"], now: now))
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["type": "clear"], now: now))
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: now))
    }

    func testMalformedWeeklyConfigurationFailsOpen() throws {
        let invalid: [[String: Any]] = [
            ["startMinute": 540.5], ["startMinute": true], ["endMinute": 1440],
            ["daysOff": [7]], ["daysOff": ["1"]], ["daysOff": "1"],
            ["enabled": 1], ["quietHoursEnabled": "true"], ["allowCalls": 0],
            ["allowMentions": NSNull()], ["startMinute": 540, "endMinute": 540],
            ["schedule": "unknown"], ["schedule": NSNull()],
        ]
        for overrides in invalid {
            try saveWeekly(overrides)
            XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 12)))
        }
        try saveWeekly(["quietHoursEnabled": false])
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: message, now: localTime(hour: 12)))
    }


    func testSessionAlertsBypassQuietHoursAndDaysOff() throws {
        try saveWeekly(["daysOff": [1]])
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["type": "session"], now: localTime(hour: 12)))
        try save()
        XCTAssertFalse(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["type": "session"], now: 1500))
    }

    func testExplicitMentionMetadataRejectsNumericValues() throws {
        let data = Data("{\"boolean\":true,\"number\":1,\"string\":\"true\",\"negative\":false,\"negativeString\":\"false\",\"invalid\":\"yes\"}".utf8)
        let metadata = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        XCTAssertTrue(OutOfOffice.mentionFlag(metadata["boolean"]) == true)
        XCTAssertTrue(OutOfOffice.mentionFlag(metadata["string"]) == true)
        XCTAssertTrue(OutOfOffice.mentionFlag(metadata["negative"]) == false)
        XCTAssertTrue(OutOfOffice.mentionFlag(metadata["negativeString"]) == false)
        XCTAssertTrue(OutOfOffice.mentionFlag(metadata["number"]) == nil)
        XCTAssertTrue(OutOfOffice.mentionFlag(metadata["invalid"]) == nil)
        XCTAssertTrue(OutOfOffice.mentionFlag(NSNull()) == nil)
        try save(allowMentions: true)
        XCTAssertTrue(OutOfOffice.shouldSuppress(serverUrl: serverUrl, payload: ["is_mention": metadata["number"] as Any], now: 1500))
    }


    func testIdLoadedReceiptPreservesOnlyExplicitMentionMetadata() {
        let notification = PushNotification.default
        let boolean = notification.parseIdLoadedNotification(Data("{\"is_mention\":true}".utf8))
        let string = notification.parseIdLoadedNotification(Data("{\"is_mention\":\"true\"}".utf8))
        let negative = notification.parseIdLoadedNotification(Data("{\"is_mention\":false}".utf8))
        let numeric = notification.parseIdLoadedNotification(Data("{\"is_mention\":1}".utf8))
        let absent = notification.parseIdLoadedNotification(Data("{\"message\":\"example\"}".utf8))
        XCTAssertTrue(boolean?["is_mention"] as? Bool == true)
        XCTAssertTrue(string?["is_mention"] as? Bool == true)
        XCTAssertTrue(negative?["is_mention"] as? Bool == false)
        XCTAssertTrue(numeric?["is_mention"] == nil)
        XCTAssertTrue(absent?["is_mention"] == nil)
    }

}
