//
//  Logger.swift
//
//  Unified logging system that supports both os_log (fallback) and TurboLog (when injected)
//

import Foundation
import OSLog

/// Log level enum for Gekidou logger
public enum GekidouLogLevel {
    case debug
    case info
    case warning
    case error

    /// Maps to OSLogType for os_log fallback
    var osLogType: OSLogType {
        switch self {
        case .debug:
            return .debug
        case .info:
            return .info
        case .warning:
            return .default
        case .error:
            return .error
        }
    }
}

/// Type alias for log handler closure
/// - Parameters:
///   - level: The log level
///   - message: The formatted log message (already processed with arguments)
public typealias GekidouLogHandler = (GekidouLogLevel, String) -> Void

/// Unified logger for Gekidou library
/// Supports injection of external logger (e.g., TurboLog) while falling back to os_log
public class GekidouLogger {
    public static let shared = GekidouLogger()

    private var logHandler: GekidouLogHandler?
    private let lock = NSLock()
    private let osLog = OSLog(subsystem: "com.mattermost.Gekidou", category: "default")

    private init() {
    }

    /// Sets an external log handler (e.g., TurboLog)
    /// - Parameter handler: Closure that handles logging with external system
    public func setLogHandler(_ handler: @escaping GekidouLogHandler) {
        lock.lock()
        defer { lock.unlock() }
        logHandler = handler
    }

    /// Logs a message with the specified level
    /// - Parameters:
    ///   - level: The log level
    ///   - message: The message to log
    ///   - args: Optional arguments for string formatting
    public func log(_ level: GekidouLogLevel, _ message: String, _ args: CVarArg...) {
        lock.lock()
        let handler = logHandler
        lock.unlock()

        if let handler = handler {
            // Use external logger (TurboLog)
            // Format the message by replacing %{public}@ and %d with standard format specifiers
            if args.isEmpty {
                handler(level, message)
            } else {
                let cleanMessage = message
                    .replacingOccurrences(of: "%{public}@", with: "%@")
                    .replacingOccurrences(of: "%{public}d", with: "%d")
                let formattedMessage = String(format: cleanMessage, arguments: args)
                handler(level, formattedMessage)
            }
        } else {
            // Fallback to os_log
            let formattedMessage: String
            if args.isEmpty {
                formattedMessage = message
            } else {
                // Convert CVarArg to format string arguments
                // Note: os_log expects format strings, but we need to handle them carefully
                formattedMessage = String(format: message.replacingOccurrences(of: "%{public}@", with: "%@"), arguments: args)
            }
            os_log("%{public}@", log: osLog, type: level.osLogType, formattedMessage)
        }
    }
}
