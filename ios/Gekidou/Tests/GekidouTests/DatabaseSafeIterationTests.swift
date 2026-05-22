// DatabaseSafeIterationTests.swift
// Tests for safe SQLite iteration to prevent crashes from SQLITE_BUSY
//
// These tests verify that the Gekidou Database layer handles SQLite errors
// gracefully instead of crashing via SQLite.swift's `try!` in FailableIterator.
//
// Sentry issues: YND (7117724547), YNE (7118237218)
// Root cause: SQLite.swift 0.15.4 uses `try!` in Statement.next() which
// crashes when the database returns SQLITE_BUSY ("database is locked").

import XCTest
import SQLite
@testable import Gekidou

final class DatabaseSafeIterationTests: XCTestCase {

    // MARK: - busyTimeout

    /// Verify that openConnection sets a non-zero busyTimeout on every connection.
    /// Without this, concurrent access from main app + NotificationService extension
    /// will immediately return SQLITE_BUSY instead of retrying.
    func testOpenConnectionSetsBusyTimeout() throws {
        let db = Database.default
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_busy_timeout_\(UUID().uuidString).db")

        // Create a test database
        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE IF NOT EXISTS test (id TEXT PRIMARY KEY)")
        // Close by letting it go out of scope

        // Open via our helper and verify busyTimeout is set
        let safeConn = try db.openConnection(dbPath)
        XCTAssertGreaterThan(safeConn.busyTimeout, 0,
            "openConnection must set busyTimeout > 0 to handle SQLITE_BUSY from concurrent access")

        // Cleanup
        try? FileManager.default.removeItem(atPath: dbPath)
    }

    // MARK: - Safe iteration (prepareRowIterator + failableNext)

    /// Verify that prepareRowIterator + failableNext correctly iterates rows
    /// without using the dangerous try! path.
    func testSafeIterationReturnsCorrectResults() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_safe_iter_\(UUID().uuidString).db")

        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)")
        try conn.execute("INSERT INTO users VALUES ('u1', 'alice')")
        try conn.execute("INSERT INTO users VALUES ('u2', 'bob')")
        try conn.execute("INSERT INTO users VALUES ('u3', 'charlie')")

        let table = Table("users")
        let idCol = SQLite.Expression<String>("id")

        // Use the safe pattern: prepareRowIterator + failableNext
        let iterator = try conn.prepareRowIterator(table.select(idCol))
        var ids = [String]()
        while let row = try iterator.failableNext() {
            ids.append(try row.get(idCol))
        }

        XCTAssertEqual(Set(ids), Set(["u1", "u2", "u3"]),
            "Safe iteration should return all rows")

        try? FileManager.default.removeItem(atPath: dbPath)
    }

    /// Verify that prepareRowIterator with a filter works correctly.
    func testSafeIterationWithFilter() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_safe_filter_\(UUID().uuidString).db")

        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)")
        try conn.execute("INSERT INTO users VALUES ('u1', 'alice')")
        try conn.execute("INSERT INTO users VALUES ('u2', 'bob')")

        let table = Table("users")
        let idCol = SQLite.Expression<String>("id")
        let usernameCol = SQLite.Expression<String>("username")

        let query = table.select(usernameCol).filter(idCol == "u1")
        let iterator = try conn.prepareRowIterator(query)
        var usernames = [String]()
        while let row = try iterator.failableNext() {
            usernames.append(try row.get(usernameCol))
        }

        XCTAssertEqual(usernames, ["alice"],
            "Filtered safe iteration should return matching rows only")

        try? FileManager.default.removeItem(atPath: dbPath)
    }

    /// Verify that failableNext loop works for bulk loading
    /// (replaces the unsafe Array(iterator) pattern).
    func testFailableNextLoopForBulkLoading() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_bulk_iter_\(UUID().uuidString).db")

        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE items (id TEXT PRIMARY KEY, value TEXT)")
        try conn.execute("INSERT INTO items VALUES ('i1', 'one')")
        try conn.execute("INSERT INTO items VALUES ('i2', 'two')")

        let table = Table("items")
        let valueCol = SQLite.Expression<String>("value")

        let iterator = try conn.prepareRowIterator(table)
        var values = [String]()
        while let row = try iterator.failableNext() {
            values.append(try row.get(valueCol))
        }

        XCTAssertEqual(Set(values), Set(["one", "two"]),
            "failableNext loop should collect all rows safely")

        try? FileManager.default.removeItem(atPath: dbPath)
    }

    // MARK: - Error handling (no crash)

    /// Verify that failableNext handles errors gracefully when the database
    /// is locked by another connection using DELETE journal mode.
    /// In DELETE mode (unlike WAL), readers block on writers holding locks.
    func testFailableNextHandlesLockedDatabase() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_locked_\(UUID().uuidString).db")

        // Create database with DELETE journal mode (no WAL)
        // so readers actually block on write locks
        let writer = try Connection(dbPath)
        try writer.execute("PRAGMA journal_mode=DELETE")
        try writer.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)")
        try writer.execute("INSERT INTO test VALUES (1, 'hello')")

        // Reader with zero busyTimeout — should fail immediately on lock
        let reader = try Connection(dbPath, readonly: true)
        reader.busyTimeout = 0

        // Writer holds an exclusive lock
        try writer.execute("BEGIN EXCLUSIVE TRANSACTION")

        let table = Table("test")

        // Reader should either throw (SQLITE_BUSY) or return empty results
        // The key point: it must NOT crash via try!
        do {
            let iterator = try reader.prepareRowIterator(table)
            var rows = [Row]()
            while let row = try iterator.failableNext() {
                rows.append(row)
            }
            // If we get here, SQLite allowed the read (unlikely with EXCLUSIVE + DELETE mode)
            // Either way, no crash = success
        } catch {
            // Expected: we get a catchable error (SQLITE_BUSY) instead of a crash
            // This is the correct behavior — the error is recoverable
            XCTAssertTrue(
                String(describing: error).contains("locked") ||
                String(describing: error).contains("busy"),
                "Error should be about database being locked/busy, got: \(error)")
        }

        // Release the lock
        try writer.execute("ROLLBACK")

        try? FileManager.default.removeItem(atPath: dbPath)
    }

    // MARK: - Concurrent access simulation

    /// Simulate concurrent database access (main app + extension pattern)
    /// using DELETE journal mode to exercise the busyTimeout retry path.
    func testBusyTimeoutHandlesConcurrentAccess() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_concurrent_\(UUID().uuidString).db")

        // Use DELETE journal mode so readers block on writers
        let writer = try Connection(dbPath)
        try writer.execute("PRAGMA journal_mode=DELETE")
        writer.busyTimeout = 5.0
        try writer.execute("CREATE TABLE data (id INTEGER PRIMARY KEY, value TEXT)")
        try writer.execute("INSERT INTO data VALUES (1, 'hello')")

        // Reader with busyTimeout — should retry when locked
        let reader = try Connection(dbPath, readonly: true)
        reader.busyTimeout = 5.0

        let table = Table("data")
        let valueCol = SQLite.Expression<String>("value")

        // Hold an exclusive lock briefly, then release from another thread
        try writer.execute("BEGIN EXCLUSIVE TRANSACTION")
        try writer.execute("INSERT INTO data VALUES (2, 'world')")

        // Release the lock after a short delay so the reader's busyTimeout can retry
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
            try? writer.execute("COMMIT")
        }

        // Reader should eventually succeed thanks to busyTimeout retry
        let iterator = try reader.prepareRowIterator(table)
        var values = [String]()
        while let row = try iterator.failableNext() {
            values.append(try row.get(valueCol))
        }

        // Reader should see data (either pre-commit or post-commit state)
        XCTAssertFalse(values.isEmpty,
            "Reader with busyTimeout should eventually read data after lock is released")

        try? FileManager.default.removeItem(atPath: dbPath)
    }

    // MARK: - Connection.scalar (safe alternative to prepare().scalar())

    /// Verify that Connection.scalar works for aggregate queries
    /// (replaces the old db.prepare(string).scalar() pattern).
    func testScalarQueryDoesNotUseDangerousIteration() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_scalar_\(UUID().uuidString).db")

        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE counts (id INTEGER PRIMARY KEY, amount INTEGER)")
        try conn.execute("INSERT INTO counts VALUES (1, 10)")
        try conn.execute("INSERT INTO counts VALUES (2, 20)")

        // Use Connection.scalar directly — this is the safe pattern
        // that replaces db.prepare(string).scalar()
        let sum = try conn.scalar("SELECT SUM(amount) FROM counts") as? Int64
        XCTAssertEqual(sum, 30,
            "Connection.scalar should return correct aggregate result")

        try? FileManager.default.removeItem(atPath: dbPath)
    }
}
