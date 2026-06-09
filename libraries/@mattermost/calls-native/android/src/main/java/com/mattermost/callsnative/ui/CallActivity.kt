package com.mattermost.callsnative.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Outline
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.util.Locale
import androidx.core.graphics.drawable.toDrawable
import com.mattermost.callsnative.utils.CallPermissions
import com.mattermost.callsnative.managers.CallRegistry
import com.mattermost.callsnative.managers.CallSurfaceCoordinator
import com.mattermost.callsnative.managers.CallsBridge
import com.mattermost.callsnative.utils.HostAppIcons
import com.mattermost.callsnative.services.MMCallsForegroundService
import com.mattermost.callsnative.utils.TurboLogger
import com.mattermost.callsnative.R

/**
 * Single-Activity, state-driven incoming/active call surface. Lifecycle:
 *
 *   Incoming → Answering → Connecting → Connected → Ended
 *
 */
class CallActivity : ComponentActivity() {

    private var uuid: String = ""
    private var heartbeat: ObjectAnimator? = null
    private var rotation: ObjectAnimator? = null
    private var endingDown: Boolean = false
    private var answerGateInFlight: Boolean = false

    private lateinit var root: ConstraintLayout
    private lateinit var statusIcon: ImageView
    private lateinit var statusLabel: TextView
    private lateinit var timer: TextView
    private lateinit var avatarFrame: View
    private lateinit var avatarGlow: View
    private lateinit var avatarRingStatic: View
    private lateinit var avatarRingRotating: View
    private lateinit var avatar: ImageView
    private lateinit var callerName: TextView
    private lateinit var incomingActions: View
    private lateinit var activeActions: View
    private lateinit var answerButton: View
    private lateinit var declineButton: View
    private lateinit var answerStack: View
    private lateinit var declineStack: View
    private lateinit var muteButton: ImageView
    private lateinit var muteLabel: TextView
    private lateinit var hangupButton: View

    // Gates the answer flow on RECORD_AUDIO / BLUETOOTH_CONNECT runtime
    // permissions. JS-side react-native-permissions can't request from a
    // headless context, so we prompt here before emitting CallAnswered.
    private lateinit var permissionLauncher: androidx.activity.result.ActivityResultLauncher<Array<String>>

    private var connectedAtElapsedRealtime: Long = 0L
    private val timerTicker = object : Runnable {
        override fun run() {
            if (connectedAtElapsedRealtime == 0L) return
            val elapsed = (SystemClock.elapsedRealtime() - connectedAtElapsedRealtime) / 1000L
            val mm = elapsed / 60
            val ss = elapsed % 60
            timer.text = String.format(Locale.ENGLISH, "%02d:%02d", mm, ss)
            timer.postDelayed(this, 1000L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        uuid = intent?.getStringExtra(EXTRA_UUID).orEmpty()
        if (uuid.isEmpty()) {
            finish()
            return
        }

        // Registered before STARTED — the Activity Result contract requires
        // the launcher to exist before any caller could invoke it.
        permissionLauncher = registerForActivityResult(
            androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions(),
        ) { results ->
            onPermissionResult(results)
        }

        // Swallow back during a ringing/active call.
        onBackPressedDispatcher.addCallback(this, object : androidx.activity.OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { /* no-op */ }
        })

        setContentView(R.layout.activity_call)
        bindViews()
        applyBackgroundFromHostApp()
        clipAvatarToCircle()
        wireClicks()
        startHeartbeat()

        observeCallState()

        if (intent?.getBooleanExtra(EXTRA_AUTO_ANSWER, false) == true) {
            onAnswerTapped()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val newUuid = intent.getStringExtra(EXTRA_UUID).orEmpty()
        if (newUuid.isNotEmpty() && newUuid != uuid) {
            uuid = newUuid
            observeCallState()
        }
        if (intent.getBooleanExtra(EXTRA_AUTO_ANSWER, false)) {
            onAnswerTapped()
        }
    }

    override fun onDestroy() {
        stopAnimations()
        timer.removeCallbacks(timerTicker)
        super.onDestroy()
    }

    private fun bindViews() {
        root = findViewById(R.id.root)
        statusIcon = findViewById(R.id.status_icon)
        statusLabel = findViewById(R.id.status_label)
        timer = findViewById(R.id.timer)
        avatarFrame = findViewById(R.id.avatar_frame)
        avatarGlow = findViewById(R.id.avatar_glow)
        avatarRingStatic = findViewById(R.id.avatar_ring_static)
        avatarRingRotating = findViewById(R.id.avatar_ring_rotating)
        avatar = findViewById(R.id.avatar)
        callerName = findViewById(R.id.caller_name)
        incomingActions = findViewById(R.id.incoming_actions)
        activeActions = findViewById(R.id.active_actions)
        answerButton = findViewById(R.id.answer_button)
        declineButton = findViewById(R.id.decline_button)
        answerStack = findViewById(R.id.answer_stack)
        declineStack = findViewById(R.id.decline_stack)
        muteButton = findViewById(R.id.mute_button)
        muteLabel = findViewById(R.id.mute_label)
        hangupButton = findViewById(R.id.hangup_button)
    }

    private fun applyBackgroundFromHostApp() {
        val resId = HostAppIcons.splashBackground(this)
        if (resId == 0) return

        val bitmap = try {
            android.graphics.BitmapFactory.decodeResource(resources, resId)
        } catch (_: Exception) {
            null
        } ?: return

        val bitmapDrawable = bitmap.toDrawable(resources).apply {
            gravity = android.view.Gravity.CENTER or android.view.Gravity.FILL_VERTICAL
            setTileModeXY(null, null)
        }

        val vignette = androidx.core.content.ContextCompat.getDrawable(this, R.drawable.bg_vignette)
        val layers = android.graphics.drawable.LayerDrawable(
            listOfNotNull(
                0xFF090A0B.toInt().toDrawable(),
                bitmapDrawable,
                vignette,
            ).toTypedArray()
        )
        root.background = layers
    }

    private fun clipAvatarToCircle() {
        avatar.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setOval(0, 0, view.width, view.height)
            }
        }
        avatar.clipToOutline = true
    }

    private fun wireClicks() {
        answerButton.setOnClickListener { onAnswerTapped() }
        declineButton.setOnClickListener { onDeclineTapped() }
        muteButton.setOnClickListener { onMuteTapped() }
        hangupButton.setOnClickListener { onHangupTapped() }
        // Tap-to-return to the in-app RN call screen.
        avatar.setOnClickListener { onAvatarTapped() }
        avatar.isClickable = true
        avatar.isFocusable = true
    }

    private fun onAvatarTapped() {
        // No-op while ringing or locked.
        val handle = CallRegistry.get(uuid) ?: return
        if (!handle.answered) return
        if (CallSurfaceCoordinator.isKeyguardLocked()) return
        CallSurfaceCoordinator.launchMainActivity()
    }

    private fun observeCallState() {
        val handle = CallRegistry.get(uuid)
        if (handle == null) {
            TurboLogger.w(TAG, "no registry entry; finishing")
            finish()
            return
        }

        // Initial enter animation runs once, on first bind.
        runIncomingEnterAnimation()

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                handle.snapshot.collectLatest { snap ->
                    if (endingDown) return@collectLatest
                    bindSnapshot(snap)
                }
            }
        }
    }

    private fun bindSnapshot(snap: CallRegistry.CallSnapshot) {
        if (snap.ended) {
            runEndingTransition(snap.endReason)
            return
        }

        callerName.text = snap.displayName.ifBlank {
            getString(R.string.mobile_android_calls_incoming_call_placeholder)
                .replace("{applicationName}", HostAppIcons.appLabel(this))
        }

        if (snap.avatar != null) {
            avatar.setImageBitmap(snap.avatar)
        } else {
            avatar.setImageResource(HostAppIcons.launcher(this))
        }

        when {
            snap.connected -> applyConnectedState()
            snap.answered -> applyConnectingState()
            else -> applyIncomingState()
        }

        applyMuteState(snap.muted)
    }

    private fun applyIncomingState() {
        statusLabel.setText(R.string.mobile_android_calls_incoming_voice_call)
        timer.visibility = View.GONE
        connectedAtElapsedRealtime = 0L
        timer.removeCallbacks(timerTicker)

        incomingActions.visibility = View.VISIBLE
        activeActions.visibility = View.GONE

        avatarRingStatic.visibility = View.VISIBLE
        avatarRingRotating.visibility = View.GONE
        startHeartbeat()
        stopRotation()
    }

    private fun applyConnectingState() {
        crossfadeStatusLabel(R.string.mobile_android_calls_connecting)
        timer.visibility = View.GONE
        connectedAtElapsedRealtime = 0L
        timer.removeCallbacks(timerTicker)

        incomingActions.visibility = View.GONE
        activeActions.visibility = View.VISIBLE

        avatarRingStatic.visibility = View.GONE
        avatarRingRotating.visibility = View.VISIBLE
        stopHeartbeat()
        startRotation()
    }

    @SuppressLint("SetTextI18n")
    private fun applyConnectedState() {
        crossfadeStatusLabel(R.string.mobile_android_calls_connected)
        if (connectedAtElapsedRealtime == 0L) {
            connectedAtElapsedRealtime = SystemClock.elapsedRealtime()
            timer.text = "00:00"
            timer.visibility = View.VISIBLE
            timer.post(timerTicker)
        }

        incomingActions.visibility = View.GONE
        activeActions.visibility = View.VISIBLE

        avatarRingStatic.visibility = View.VISIBLE
        avatarRingRotating.visibility = View.GONE
        stopHeartbeat()
        stopRotation()
    }

    private fun applyMuteState(muted: Boolean) {
        muteButton.setImageResource(
            if (muted) R.drawable.ic_mic_off else R.drawable.ic_mic,
        )
        muteButton.setBackgroundResource(
            if (muted) R.drawable.bg_circle_control_active else R.drawable.bg_circle_control,
        )
        muteButton.imageTintList = android.content.res.ColorStateList.valueOf(
            if (muted) 0xFF1F2937.toInt() else 0xFFFFFFFF.toInt(),
        )
        muteLabel.setText(
            if (muted) R.string.mobile_android_calls_unmute else R.string.mobile_android_calls_mute,
        )
    }

    private fun runIncomingEnterAnimation() {
        avatar.alpha = 0f
        avatar.scaleX = 0.95f
        avatar.scaleY = 0.95f
        avatar.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(250L).start()

        avatarRingStatic.alpha = 0f
        avatarRingStatic.animate().alpha(1f).setDuration(250L).start()

        callerName.alpha = 0f
        callerName.animate().alpha(1f).setDuration(250L).start()

        val translateStart = 20f * resources.displayMetrics.density
        incomingActions.alpha = 0f
        incomingActions.translationY = translateStart
        incomingActions.animate().alpha(1f).translationY(0f).setDuration(250L).start()
    }

    private fun startHeartbeat() {
        if (heartbeat?.isStarted == true) return
        heartbeat = ObjectAnimator.ofFloat(avatarRingStatic, "scaleX", 1f, 1.05f, 1f).apply {
            duration = 2000L
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                val s = avatarRingStatic.scaleX
                avatarRingStatic.scaleY = s
                avatarGlow.scaleX = s
                avatarGlow.scaleY = s
            }
            start()
        }
    }

    private fun stopHeartbeat() {
        heartbeat?.cancel()
        heartbeat = null
        avatarRingStatic.scaleX = 1f
        avatarRingStatic.scaleY = 1f
        avatarGlow.scaleX = 1f
        avatarGlow.scaleY = 1f
    }

    private fun startRotation() {
        if (rotation?.isStarted == true) return
        rotation = ObjectAnimator.ofFloat(avatarRingRotating, "rotation", 0f, 360f).apply {
            duration = 3000L
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            start()
        }
    }

    private fun stopRotation() {
        rotation?.cancel()
        rotation = null
        avatarRingRotating.rotation = 0f
    }

    private fun crossfadeStatusLabel(resId: Int, color: Int? = null) {
        if (statusLabel.text == getString(resId)) {
            if (color != null) statusLabel.setTextColor(color)
            return
        }
        statusLabel.animate().alpha(0f).setDuration(75L).withEndAction {
            statusLabel.setText(resId)
            if (color != null) statusLabel.setTextColor(color)
            statusLabel.animate().alpha(1f).setDuration(75L).start()
        }.start()
    }

    private fun stopAnimations() {
        stopHeartbeat()
        stopRotation()
    }

    private fun onAnswerTapped() {
        if (answerGateInFlight) return
        answerGateInFlight = true

        declineStack.animate().alpha(0f).setDuration(150L)
            .withEndAction { declineStack.visibility = View.GONE }
            .start()
        avatar.animate().scaleX(1.05f).scaleY(1.05f).setDuration(200L).start()

        answerStack.animate()
            .scaleX(1.15f).scaleY(1.15f).setDuration(120L)
            .withEndAction {
                answerStack.animate().scaleX(1f).scaleY(1f).setDuration(120L)
                    .withEndAction {
                        gatePermissionsThenAnswer()
                    }
                    .start()
            }
            .start()
    }

    private fun gatePermissionsThenAnswer() {
        val missing = CallPermissions.missingForAnswer(this)
        if (missing.isEmpty()) {
            CallRegistry.requestUserAnswer(uuid)
            return
        }
        permissionLauncher.launch(missing.toTypedArray())
    }

    private fun onPermissionResult(@Suppress("UNUSED_PARAMETER") results: Map<String, Boolean>) {
        // Re-check via the helper rather than trust the result map.
        if (!CallPermissions.isMicGranted(this)) {
            TurboLogger.w(TAG, "mic permission denied; ending call as failed")
            answerGateInFlight = false
            CallRegistry.disconnect(uuid, CallRegistry.Reason.Failed)
            return
        }
        // BT is optional — WebRTC stack tolerates its absence.
        CallRegistry.requestUserAnswer(uuid)
    }

    private fun onDeclineTapped() {
        declineStack.animate()
            .scaleX(0.92f).scaleY(0.92f).setDuration(80L)
            .withEndAction {
                declineStack.animate().scaleX(1f).scaleY(1f).setDuration(80L)
                    .withEndAction {
                        CallRegistry.requestUserDecline(uuid)
                        runEndingTransition(null)
                    }
                    .start()
            }
            .start()
    }

    private fun onMuteTapped() {
        val handle = CallRegistry.get(uuid) ?: return
        val target = !handle.muted
        handle.muted = target
        MMCallsForegroundService.refresh(this, uuid)
        CallsBridge.send(
            CallsBridge.Event.CallMuted,
            mapOf("uuid" to uuid, "muted" to target),
        )
    }

    private fun onHangupTapped() {
        CallRegistry.requestUserHangup(uuid)
        runEndingTransition(null)
    }

    private fun runEndingTransition(reason: CallRegistry.Reason?) {
        if (endingDown) return
        endingDown = true
        stopAnimations()

        if (reason == CallRegistry.Reason.Failed) {
            val red = androidx.core.content.ContextCompat.getColor(this, R.color.call_red)
            statusIcon.setColorFilter(red)
            crossfadeStatusLabel(R.string.mobile_android_calls_call_failed, red)
            incomingActions.animate().alpha(0f).setDuration(150L).start()
            activeActions.animate().alpha(0f).setDuration(150L).start()
            root.postDelayed({ fadeOutAndFinish() }, 3000L)
            return
        }

        fadeOutAndFinish()
    }

    private fun fadeOutAndFinish() {
        incomingActions.animate().alpha(0f).setDuration(150L).start()
        activeActions.animate().alpha(0f).setDuration(150L).start()
        callerName.animate().alpha(0f).setDuration(200L).start()
        avatar.animate().alpha(0f).scaleX(0.95f).scaleY(0.95f).setDuration(200L).start()
        root.animate().alpha(0f).setDuration(200L)
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    finishAndRemoveTask()
                }
            })
            .start()
    }

    companion object {
        private const val TAG = "MMCalls/CallActivity"
        const val EXTRA_UUID = "com.mattermost.callsnative.extra.UUID"
        const val EXTRA_AUTO_ANSWER = "com.mattermost.callsnative.extra.AUTO_ANSWER"

        fun intent(context: Context, uuid: String): Intent {
            return Intent(context, CallActivity::class.java).apply {
                putExtra(EXTRA_UUID, uuid)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
        }

        /** Variant of [intent] that auto-triggers the answer flow on launch.
         *  Used by the notification Answer action so the runtime-permission
         *  gate lives in one place. */
        fun answerIntent(context: Context, uuid: String): Intent {
            return intent(context, uuid).apply {
                putExtra(EXTRA_AUTO_ANSWER, true)
            }
        }
    }
}
