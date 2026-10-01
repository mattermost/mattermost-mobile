import Foundation
import UIKit
import Gekidou

/// Prevents suspension via a `UIApplication` background task assertion. Ported from
/// Quinn "The Eskimo!"'s `QRunInBackgroundAssertion` (https://developer.apple.com/forums/thread/729335).
class DatabaseActivityAssertion {
    let name: String

    /// Called on the main thread if the system releases the assertion itself.
    var systemDidReleaseAssertion: (() -> Void)? {
        willSet { dispatchPrecondition(condition: .onQueue(.main)) }
    }

    private(set) var isGranted: Bool

    private var taskID: UIBackgroundTaskIdentifier

    init(name: String) {
        dispatchPrecondition(condition: .onQueue(.main))
        self.name = name
        self.systemDidReleaseAssertion = nil
        self.taskID = .invalid
        self.isGranted = false
        let t = UIApplication.shared.beginBackgroundTask(withName: name) {
            self.taskDidExpire()
        }
        self.taskID = t
        self.isGranted = t != .invalid
        if !isGranted {
            GekidouLogger.shared.log(.error, "DatabaseActivityAssertion: OS declined background task %{public}@", name)
        }
    }

    /// Safe to call redundantly. Must be called on the main thread.
    func release() {
        dispatchPrecondition(condition: .onQueue(.main))
        consumeValidTaskID {}
    }

    deinit {
        consumeValidTaskID {}
    }

    private func consumeValidTaskID(_ body: () -> Void) {
        guard taskID != .invalid else { return }
        UIApplication.shared.endBackgroundTask(taskID)
        taskID = .invalid
        body()
        systemDidReleaseAssertion = nil
    }

    private func taskDidExpire() {
        dispatchPrecondition(condition: .onQueue(.main))
        GekidouLogger.shared.log(.error, "DatabaseActivityAssertion: OS expired background task %{public}@", name)
        consumeValidTaskID {
            self.systemDidReleaseAssertion?()
        }
    }
}
