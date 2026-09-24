"use client";

import { useEffect, useRef, useState } from "react";
import {
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
    ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { usePhotos } from "@/app/ui/home/photo-context";
import {
    frameStyles,
    IDENTITY,
    makeEditCopy,
    maxScaleFor,
    metrics,
    minScaleFor,
    resolveTransform,
    type Transform,
} from "@/app/ui/home/image-utils";

/** Sharper than the 1200px browsing copy, so zooming in does not look soft. */
const EDIT_MAX_EDGE = 2400;
/** Must match --animate-overlay-out / --animate-frame-out. */
const EXIT_MS = 140;
/** A straighten range, not a free spin: past this it stops reading as levelling
 *  a horizon, and the auto-zoom needed to keep the frame covered gets severe. */
const MAX_TILT = 45;

const controlButton =
    "flex size-12 items-center justify-center rounded-full p-3 transition duration-150 " +
    // Snap into the press, ease back out: a quick tap would otherwise barely
    // move before the 150ms return cancels it.
    "active:duration-75 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-black/40";

/** Thin wrapper so the surface below can be keyed per photo: remounting is how
 *  the draft resets, rather than writing state from an effect. */
export default function PhotoEditor() {
    const { photos, editingIndex } = usePhotos();
    const photo = editingIndex === null ? null : photos[editingIndex];

    if (!photo || editingIndex === null) return null;
    return <EditorSurface key={photo.id} index={editingIndex} />;
}

function EditorSurface({ index }: { index: number }) {
    const { photos, ratio, closeEditor, setTransform } = usePhotos();
    const photo = photos[index];

    // The transform being edited. Committed on Done, discarded on Cancel.
    const [draft, setDraft] = useState<Transform>(photo.transform);
    const [editUrl, setEditUrl] = useState<string | null>(null);
    // Unmounting immediately would cut the exit animation off, so the close is
    // held back until it has played.
    const [closing, setClosing] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const frameRef = useRef<HTMLDivElement>(null);
    // The zoom the user actually asked for. Rotating forces extra zoom to keep
    // the frame covered, and without remembering their own choice, straightening
    // back to level would leave the photo stuck at the angle's zoom.
    const chosenScale = useRef(photo.transform.scale);
    // Quarter turns are tracked separately so the slider always shows the tilt
    // away from level, rather than flipping sign at the extremes.
    const [quarter, setQuarter] = useState(Math.round(photo.transform.rotation / 90));
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    // Where a two-finger gesture began. Every move is measured from here rather
    // than from the previous event: the browser reports one pointermove per
    // finger, so an incremental sum would keep reading a half-updated pair and
    // accumulate drift.
    const pinch = useRef<{
        distance: number;
        midX: number;
        midY: number;
        transform: Transform;
    } | null>(null);

    useEffect(() => () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }, []);

    // A sharper copy for this one photo, released as soon as the editor closes.
    useEffect(() => {
        if (!photo) return;
        let url: string | null = null;
        let cancelled = false;

        makeEditCopy(photo.file, EDIT_MAX_EDGE).then((made) => {
            if (cancelled) {
                URL.revokeObjectURL(made);
                return;
            }
            url = made;
            setEditUrl(made);
        });

        return () => {
            cancelled = true;
            setEditUrl(null);
            if (url) URL.revokeObjectURL(url);
        };
    }, [photo]);

    if (!photo) return null;

    function dismiss(commit: boolean) {
        if (closing) return;
        if (commit) setTransform(index, draft);
        setClosing(true);
        closeTimer.current = setTimeout(closeEditor, EXIT_MS);
    }

    const tilt = draft.rotation - quarter * 90;
    const isUntouched =
        draft.x === 0 && draft.y === 0 && draft.scale === 1 && draft.rotation === 0;
    const imageAspect = photo.width / photo.height;
    const maxScale = maxScaleFor(photo, ratio);

    function update(next: Transform) {
        setDraft(resolveTransform(next, imageAspect, ratio, maxScale));
    }

    function quarterTurn() {
        // Functional updates, so tapping twice quickly turns 180 rather than
        // both taps reading the same pre-render value and turning 90 once.
        setQuarter((current) => current + 1);
        setDraft((current) => {
            const rotation = current.rotation + 90;
            return resolveTransform(
                {
                    ...current,
                    rotation,
                    scale: Math.max(
                        chosenScale.current,
                        minScaleFor(imageAspect, ratio, rotation),
                    ),
                },
                imageAspect,
                ratio,
                maxScale,
            );
        });
    }

    function resetEdits() {
        setQuarter(0);
        chosenScale.current = 1;
        update(IDENTITY);
    }

    function rotate(degrees: number) {
        update({
            ...draft,
            rotation: degrees,
            scale: Math.max(
                chosenScale.current,
                minScaleFor(imageAspect, ratio, degrees),
            ),
        });
    }

    /** Pan is stored along the photo's own axes, but gestures arrive in screen
     *  axes. Once the photo is turned the two no longer line up, so vectors have
     *  to be rotated between the two. */
    function toScreen(vx: number, vy: number, degrees: number) {
        const r = (degrees * Math.PI) / 180;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        return { x: vx * cos - vy * sin, y: vx * sin + vy * cos };
    }

    /** Stored pan -> pixels from the frame's centre, in screen axes. */
    function offsets(current: Transform, frame: DOMRect) {
        const size = metrics(current, imageAspect, ratio, frame);
        const screen = toScreen(
            current.x * size.roomX,
            current.y * size.roomY,
            current.rotation,
        );
        return { dx: screen.x, dy: screen.y, size };
    }

    /** Screen-axis pixels -> the stored -1..1 form. */
    function fromOffsets(
        current: Transform,
        dx: number,
        dy: number,
        frame: DOMRect,
    ): Transform {
        const size = metrics(current, imageAspect, ratio, frame);
        const own = toScreen(dx, dy, -current.rotation);
        return {
            ...current,
            x: size.roomX === 0 ? 0 : own.x / size.roomX,
            y: size.roomY === 0 ? 0 : own.y / size.roomY,
        };
    }

    function pan(dx: number, dy: number, current: Transform, frame: DOMRect) {
        const { dx: x, dy: y } = offsets(current, frame);
        return fromOffsets(current, x + dx, y + dy, frame);
    }

    /** Scale about a point, keeping whatever is under it in place, and follow
     *  the fingers as they also move. Without this the photo drifts away from
     *  the pinch and zoom appears to stick to whichever edge you were near. */
    function zoomAround(
        current: Transform,
        factor: number,
        from: { x: number; y: number },
        to: { x: number; y: number },
        frame: DOMRect,
    ): Transform {
        const scaled = resolveTransform(
            { ...current, scale: current.scale * factor },
            imageAspect,
            ratio,
            maxScale,
        );
        // Clamping may have refused part of the zoom, so use what we really got.
        const applied = scaled.scale / current.scale;

        chosenScale.current = scaled.scale;

        const { dx, dy } = offsets(current, frame);
        // Keep the image point under `from` under `to`: p' - d' = (p - d) * k
        const nextDx = to.x - applied * (from.x - dx);
        const nextDy = to.y - applied * (from.y - dy);

        return fromOffsets(scaled, nextDx, nextDy, frame);
    }

    function midpoint() {
        const [a, b] = [...pointers.current.values()];
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
    }

    function onPointerDown(event: React.PointerEvent) {
        // Throws if the pointer is already gone; never worth failing the gesture.
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
            const m = midpoint();
            pinch.current = {
                distance: m.distance,
                midX: m.x,
                midY: m.y,
                transform: draft,
            };
        }
    }

    function onPointerMove(event: React.PointerEvent) {
        const previous = pointers.current.get(event.pointerId);
        if (!previous) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        const frame = frameRef.current?.getBoundingClientRect();
        if (!frame) return;
        // Work relative to the frame's centre, which is where the photo's own
        // offsets are measured from.
        const centre = { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 };

        if (pointers.current.size >= 2 && pinch.current) {
            const start = pinch.current;
            const m = midpoint();
            update(
                zoomAround(
                    start.transform,
                    m.distance / start.distance,
                    { x: start.midX - centre.x, y: start.midY - centre.y },
                    { x: m.x - centre.x, y: m.y - centre.y },
                    frame,
                ),
            );
            return;
        }

        update(pan(event.clientX - previous.x, event.clientY - previous.y, draft, frame));
    }

    /** Desktop convenience, and how this gets tested without two fingers. */
    function onWheel(event: React.WheelEvent) {
        const frame = frameRef.current?.getBoundingClientRect();
        if (!frame) return;
        const centre = { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 };
        const at = { x: event.clientX - centre.x, y: event.clientY - centre.y };

        update(zoomAround(draft, Math.exp(-event.deltaY / 400), at, at, frame));
    }

    function onPointerUp(event: React.PointerEvent) {
        pointers.current.delete(event.pointerId);
        // Re-establish from scratch if a finger returns, rather than resuming
        // from a stale starting point.
        if (pointers.current.size < 2) pinch.current = null;
    }

    return (
        <div
            className={`fixed inset-0 z-40 flex flex-col bg-black/80 backdrop-blur-sm ${
                closing ? "animate-overlay-out pointer-events-none" : "animate-overlay-in"
            }`}
        >
            {/* The size container lives here, not on the frame. An element
                cannot query itself, so cqh on the frame fell back to the
                viewport and the photo overflowed into the controls. */}
            <div className="flex min-h-0 flex-1 items-center justify-center p-4 [container-type:size]">
                <div
                    ref={frameRef}
                    className={`relative overflow-hidden rounded-lg bg-surface touch-none ${
                        closing ? "animate-frame-out" : "animate-frame-in"
                    }`}
                    style={{
                        aspectRatio: String(ratio),
                        width: `min(100cqw, calc(100cqh * ${ratio}))`,
                    }}
                    onWheel={onWheel}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimized by next/image */}
                    <img
                        src={editUrl ?? photo.displayUrl}
                        alt=""
                        draggable={false}
                        className="max-w-none select-none"
                        style={frameStyles(draft, imageAspect, ratio)}
                    />
                </div>
            </div>

            <div className="flex shrink-0 flex-col gap-5 px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Rotate 90 degrees"
                        onClick={quarterTurn}
                        className={`${controlButton} size-11 shrink-0 bg-white/15 text-white hover:bg-white/30 active:bg-white/40`}
                    >
                        <ArrowPathIcon className="size-full" strokeWidth={2} />
                    </button>

                    <input
                        type="range"
                        min={-MAX_TILT}
                        max={MAX_TILT}
                        step={0.5}
                        value={tilt}
                        aria-label="Straighten"
                        onChange={(event) =>
                            rotate(quarter * 90 + Number(event.target.value))
                        }
                        className="h-11 flex-1 cursor-pointer accent-white"
                    />

                    <button
                        type="button"
                        aria-label="Level the photo"
                        onClick={() => rotate(quarter * 90)}
                        // Tabular figures stop the row twitching as the number changes.
                        className={`${controlButton} w-16 shrink-0 rounded-md bg-white/15 p-0 text-sm text-white tabular-nums hover:bg-white/30 active:bg-white/40`}
                    >
                        {tilt.toFixed(1)}&deg;
                    </button>
                </div>

                <div className="flex items-center justify-between">
                <button
                    type="button"
                    aria-label="Cancel"
                    onClick={() => dismiss(false)}
                    className={`${controlButton} bg-white/15 text-white hover:bg-white/30 active:bg-white/40`}
                >
                    <XMarkIcon className="size-full" strokeWidth={2} />
                </button>

                <button
                    type="button"
                    aria-label="Reset edits"
                    onClick={resetEdits}
                    disabled={isUntouched}
                    className={`${controlButton} gap-2 w-auto rounded-full bg-white/15 px-4 text-sm text-white hover:bg-white/30 active:bg-white/40 disabled:opacity-35 disabled:active:scale-100`}
                >
                    <ArrowUturnLeftIcon className="size-4 shrink-0" strokeWidth={2} />
                    Reset
                </button>

                <button
                    type="button"
                    aria-label="Done"
                    onClick={() => dismiss(true)}
                    className={`${controlButton} bg-white text-black shadow-lg hover:bg-white/85 active:bg-white/70`}
                >
                    <CheckIcon className="size-full" strokeWidth={2} />
                </button>
                </div>
            </div>
        </div>
    );
}
