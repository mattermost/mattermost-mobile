//
//  Preferences.swift
//  Gekidou
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//
import Foundation
import CoreFoundation

let appGroupId = Bundle.main.infoDictionary!["AppGroupIdentifier"] as? String

public class Preferences: NSObject {
    private let userDefauls = UserDefaults(suiteName: appGroupId)
    
    @objc public static let `default` = Preferences()
    
    override private init() {}
    
    public func object(forKey name: String) -> Any? {
        return userDefauls?.object(forKey: name)
    }
    
    public func removeObject(forKey name: String) {
        userDefauls?.removeObject(forKey: name)
    }
    
    public func set(_ value: Any?, forKey key: String) {
        userDefauls?.set(value, forKey: key)
    }
}

// Shared by the notification extension and CallKit, including when JavaScript is stopped.
public enum OutOfOffice {
    public static func shouldSuppress(serverUrl: String?, payload: [AnyHashable: Any], isCall: Bool = false, now: Double = Date().timeIntervalSince1970 * 1000) -> Bool {
        guard payload["type"] as? String != "clear", payload["type"] as? String != "session",
              let serverUrl = serverUrl,
              let raw = Preferences.default.object(forKey: "outOfOfficeSettings." + serverUrl) as? String,
              let data = raw.data(using: .utf8),
              let settings = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              now.isFinite
        else { return false }

        let active: Bool
        if settings.keys.contains("schedule") {
            guard settings["schedule"] as? String == "weekly",
                  let weekly = try? JSONDecoder().decode(WeeklySettings.self, from: data)
            else { return false }
            active = weekly.isActive(now: now)
        } else {
            guard settings["enabled"] as? Bool == true,
                  let start = settings["startAt"] as? Double,
                  let end = settings["endAt"] as? Double,
                  start.isFinite, end.isFinite
            else { return false }
            active = now >= start && now < end
        }
        guard active else { return false }

        let call = isCall || payload["type"] as? String == "call" || payload["sub_type"] as? String == "calls"
        if call { return settings["allowCalls"] as? Bool != true }
        // Never infer a mention from message text or from the fact a push was delivered.
        let mention = mentionFlag(payload["is_mention"]) == true
        return !(mention && settings["allowMentions"] as? Bool == true)
    }

    // JSONSerialization bridges numbers and booleans through NSNumber. Accept only
    // actual JSON booleans or their FCM string representation, never numeric values.
    static func mentionFlag(_ value: Any?) -> Bool? {
        if let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() {
            return number.boolValue
        }
        if let string = value as? String {
            if string == "true" { return true }
            if string == "false" { return false }
        }
        return nil
    }

    private struct WeeklySettings: Decodable {
        let enabled: Bool
        let quietHoursEnabled: Bool
        let startMinute: Int
        let endMinute: Int
        let daysOff: [Int]
        let allowCalls: Bool
        let allowMentions: Bool

        func isActive(now: Double) -> Bool {
            guard enabled, (0...1439).contains(startMinute), (0...1439).contains(endMinute),
                  (!quietHoursEnabled || startMinute != endMinute), daysOff.allSatisfy({ (0...6).contains($0) })
            else { return false }
            // Calendar.current resolves the device's local time, including DST changes.
            let local = Calendar.current.dateComponents([.weekday, .hour, .minute], from: Date(timeIntervalSince1970: now / 1000))
            guard let weekday = local.weekday, let hour = local.hour, let minute = local.minute else { return false }
            if daysOff.contains(weekday - 1) { return true }
            guard quietHoursEnabled else { return false }
            let minuteOfDay = hour * 60 + minute
            if startMinute < endMinute { return minuteOfDay >= startMinute && minuteOfDay < endMinute }
            return minuteOfDay >= startMinute || minuteOfDay < endMinute
        }
    }

}
