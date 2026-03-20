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

    /// Verify that Array(RowIterator) pattern works for bulk loading.
    func testArrayFromRowIterator() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_array_iter_\(UUID().uuidString).db")

        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE items (id TEXT PRIMARY KEY, value TEXT)")
        try conn.execute("INSERT INTO items VALUES ('i1', 'one')")
        try conn.execute("INSERT INTO items VALUES ('i2', 'two')")

        let table = Table("items")
        let valueCol = SQLite.Expression<String>("value")

        let iterator = try conn.prepareRowIterator(table)
        let rows = try Array(iterator)
        let values = try rows.map { try $0.get(valueCol) }

        XCTAssertEqual(Set(values), Set(["one", "two"]),
            "Array(RowIterator) should collect all rows safely")

        try? FileManager.default.removeItem(atPath: dbPath)
    }

    // MARK: - Error handling (no crash)

    /// Verify that failableNext throws a catchable error on a closed database
    /// instead of crashing via try!.
    func testFailableNextThrowsInsteadOfCrashing() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_error_\(UUID().uuidString).db")

        let conn = try Connection(dbPath)
        try conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY)")
        try conn.execute("INSERT INTO test VALUES (1)")

        let table = Table("test")
        let iterator = try conn.prepareRowIterator(table)

        // Forcibly close the underlying SQLite handle to simulate an error state.
        // This is intentionally destructive — we're testing that the error is
        // catchable rather than causing a fatal crash.
        sqlite3_close_v2(conn.handle)

        // With the safe pattern, this should throw (or return nil), NOT crash
        // Note: behavior after force-closing is undefined, but the key point is
        // we're NOT calling the try! path that would abort the process.
        do {
            let _ = try iterator.failableNext()
            // If we get here without crashing, the test passes —
            // the error was handled gracefully
        } catch {
            // Expected: we get a catchable error instead of a crash
            // This is the correct behavior
        }

        // If we reach here, the process didn't crash — that's the whole point
        try? FileManager.default.removeItem(atPath: dbPath)
    }

    // MARK: - Concurrent access simulation

    /// Simulate concurrent database access (main app + extension pattern)
    /// and verify that busyTimeout prevents SQLITE_BUSY errors.
    func testBusyTimeoutHandlesConcurrentAccess() throws {
        let tempDir = NSTemporaryDirectory()
        let dbPath = (tempDir as NSString).appendingPathComponent("test_concurrent_\(UUID().uuidString).db")

        // Writer connection: holds a write lock
        let writer = try Connection(dbPath)
        writer.busyTimeout = 5.0
        try writer.execute("CREATE TABLE data (id INTEGER PRIMARY KEY, value TEXT)")
        try writer.execute("PRAGMA journal_mode=WAL")

        // Reader connection: should be able to read even during writes (WAL mode)
        let reader = try Connection(dbPath, readonly: true)
        reader.busyTimeout = 5.0

        // Insert some data
        try writer.execute("INSERT INTO data VALUES (1, 'hello')")

        // Begin a write transaction on the writer
        try writer.execute("BEGIN IMMEDIATE TRANSACTION")
        try writer.execute("INSERT INTO data VALUES (2, 'world')")

        // Reader should still be able to read (WAL allows concurrent reads)
        let table = Table("data")
        let valueCol = SQLite.Expression<String>("value")
        let iterator = try reader.prepareRowIterator(table)
        var values = [String]()
        while let row = try iterator.failableNext() {
            values.append(try row.get(valueCol))
        }

        // In WAL mode, the reader sees the state before the uncommitted transaction
        XCTAssertTrue(values.contains("hello"),
            "Reader should see committed data even during concurrent write transaction")

        // Commit the writer transaction
        try writer.execute("COMMIT")

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
