"use client";

import { useEffect, useRef } from "react";
import { usePhotos } from "@/app/ui/home/photo-context";
import { DELETE_TARGET_ID } from "@/app/ui/home/delete-target";
import { PlusIcon } from "@heroicons/react/24/outline";

/** Hold this long without moving to pick a thumbnail up. */
const LONG_PRESS_MS = 250;
/** Move more than this before the timer fires and it counts as a scroll. */
const SLOP_PX = 8;
/** Dragging within this far of a strip edge scrolls it, so photos off-screen
 *  can still be reached. */
const EDGE_PX = 44;
const EDGE_SPEED_PX = 10;

export default function PhotoStrip() {
    const {
        photos,
        selectedIndex,
        canAdd,
        drag,
        addPhotos,
        removePhoto,
        movePhoto,
        select,
        setDrag,
    } = usePhotos();

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);

    const press = useRef<{
        index: number;
        x: number;
        y: number;
        timer: ReturnType<typeof setTimeout> | null;
        dragging: boolean;
        over: boolean;
    } | null>(null);
    // Set when a drag ends, so the click that follows does not also select.
    const swallowClick = useRef(false);
    // -1, 0 or 1 while dragging near an edge of the strip.
    const edgeScroll = useRef(0);
    const isDragging = !!drag;

    // Keep the selected thumbnail on screen when the carousel is swiped. Not
    // during a drag: reordering moves the selection, and auto-scrolling to it
    // would yank the strip out from under the finger.
    useEffect(() => {
        if (isDragging) return;
        const thumb = listRef.current?.children[selectedIndex];
        thumb?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
        });
    }, [selectedIndex, isDragging]);

    // While dragging, swallow touchmove so the strip does not scroll under the
    // finger. It must be non-passive to be allowed to preventDefault.
    useEffect(() => {
        if (!drag) return;
        const block = (event: TouchEvent) => event.preventDefault();
        document.addEventListener("touchmove", block, { passive: false });
        return () => document.removeEventListener("touchmove", block);
    }, [drag]);

    useEffect(() => {
        if (!isDragging) {
            edgeScroll.current = 0;
            return;
        }
        const id = setInterval(() => {
            if (edgeScroll.current && listRef.current) {
                listRef.current.scrollLeft += edgeScroll.current * EDGE_SPEED_PX;
            }
        }, 16);
        return () => clearInterval(id);
    }, [isDragging]);

    /** Which slot the finger is over, or null if it is not over the strip.
     *  Compares against each thumbnail's midpoint, the usual rule for deciding
     *  whether a dragged item belongs before or after the one it overlaps. */
    function slotFromPoint(x: number, y: number) {
        const list = listRef.current;
        if (!list) return null;

        const box = list.getBoundingClientRect();
        if (y < box.top - 24 || y > box.bottom + 24) return null;

        const thumbs = [...list.querySelectorAll("li[data-thumb]")];
        for (let i = 0; i < thumbs.length; i++) {
            const rect = thumbs[i].getBoundingClientRect();
            if (x < rect.left + rect.width / 2) return i;
        }
        return thumbs.length - 1;
    }

    function moveGhost(x: number, y: number) {
        const ghost = ghostRef.current;
        if (ghost) ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }

    function isOverDelete(x: number, y: number) {
        const box = document.getElementById(DELETE_TARGET_ID)?.getBoundingClientRect();
        if (!box) return false;
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }

    function onPointerDown(event: React.PointerEvent, index: number) {
        // Ignore right-click and any second finger.
        if (event.button !== 0) return;

        // A drag whose thumbnail was deleted never fires the click that would
        // clear this, so reset it whenever a fresh press begins.
        swallowClick.current = false;

        const { clientX: x, clientY: y } = event;

        press.current = {
            index,
            x,
            y,
            dragging: false,
            over: false,
            timer: setTimeout(() => {
                if (!press.current) return;
                press.current.dragging = true;
                setDrag({ index, overDelete: false });
                moveGhost(press.current.x, press.current.y);
            }, LONG_PRESS_MS),
        };
    }

    function onPointerMove(event: PointerEvent) {
        const state = press.current;
        if (!state) return;

        if (!state.dragging) {
            // Moving before the hold completes means the user is scrolling.
            const far =
                Math.abs(event.clientX - state.x) > SLOP_PX ||
                Math.abs(event.clientY - state.y) > SLOP_PX;
            if (far) {
                if (state.timer) clearTimeout(state.timer);
                press.current = null;
            }
            return;
        }

        const { clientX: x, clientY: y } = event;
        moveGhost(x, y);

        // Only write to context when the answer actually changes, so moving a
        // finger does not re-render the row on every frame.
        const over = isOverDelete(x, y);
        if (over !== state.over) {
            state.over = over;
            setDrag({ index: state.index, overDelete: over });
        }

        if (over) {
            edgeScroll.current = 0;
            return;
        }

        const slot = slotFromPoint(x, y);
        if (slot === null) {
            edgeScroll.current = 0;
            return;
        }

        const box = listRef.current!.getBoundingClientRect();
        edgeScroll.current =
            x < box.left + EDGE_PX ? -1 : x > box.right - EDGE_PX ? 1 : 0;

        // Reorder as the finger crosses each midpoint, rather than only on
        // release, so the gap the photo will land in is always visible.
        if (slot !== state.index) {
            movePhoto(state.index, slot);
            state.index = slot;
            setDrag({ index: slot, overDelete: false });
        }
    }

    function endPress(event: PointerEvent, drop: boolean) {
        const state = press.current;
        if (!state) return;
        if (state.timer) clearTimeout(state.timer);
        press.current = null;

        if (!state.dragging) return;

        edgeScroll.current = 0;
        swallowClick.current = true;
        if (drop && isOverDelete(event.clientX, event.clientY)) {
            removePhoto(state.index);
        }
        setDrag(null);
    }

    // Reordering moves the thumbnail's DOM node, and moving a node releases
    // pointer capture. Listening on the element would then miss pointerup
    // whenever it lands somewhere else, leaving the drag stuck. The window
    // always sees it. The ref keeps these pointing at the current render's
    // handlers, so they never close over a stale photo list.
    const handlers = useRef<{
        move: (event: PointerEvent) => void;
        end: (event: PointerEvent, drop: boolean) => void;
    }>({ move: () => {}, end: () => {} });
    useEffect(() => {
        handlers.current = { move: onPointerMove, end: endPress };
    });
    useEffect(() => {
        const move = (event: PointerEvent) => handlers.current.move(event);
        const up = (event: PointerEvent) => handlers.current.end(event, true);
        const cancel = (event: PointerEvent) => handlers.current.end(event, false);

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", cancel);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", cancel);
        };
    }, []);

    const dragged = drag ? photos[drag.index] : null;

    return (
        <footer className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-4">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                // sr-only, not hidden: iOS Safari will not open the picker for
                // an input that is display:none
                className="sr-only"
                onChange={(event) => {
                    addPhotos(Array.from(event.target.files ?? []));
                    // lets the same photo to be added again
                    event.target.value = "";
                }}
            />

            <ul ref={listRef} className="-m-1 flex gap-1.5 overflow-x-auto p-1">
                {photos.map((photo, i) => (
                    <li key={photo.id} data-thumb className="shrink-0">
                        <button
                            type="button"
                            aria-label={`Photo ${i + 1}`}
                            aria-current={i === selectedIndex}
                            onPointerDown={(event) => onPointerDown(event, i)}
                            onContextMenu={(event) => event.preventDefault()}
                            onClick={() => {
                                if (swallowClick.current) {
                                    swallowClick.current = false;
                                    return;
                                }
                                select(i);
                            }}
                            className={`block h-12 w-9 touch-pan-x overflow-hidden rounded-lg transition-opacity ${
                                drag?.index === i ? "opacity-30" : ""
                            } ${
                                i === selectedIndex
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                    : ""
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimized by next/image */}
                            <img
                                src={photo.thumbUrl}
                                decoding="async"
                                draggable={false}
                                alt=""
                                className="pointer-events-none size-full object-cover"
                            />
                        </button>
                    </li>
                ))}

                {canAdd && (
                    <li className="shrink-0">
                        <button
                            type="button"
                            aria-label="Add photos"
                            onClick={() => inputRef.current?.click()}
                            className="h-12 w-9 rounded-lg bg-add-btn p-2 text-add-btn-ink transition-colors hover:bg-add-btn-hover active:bg-add-btn-active"
                        >
                            <PlusIcon className="size-full" strokeWidth={1.75} />
                        </button>
                    </li>
                )}
            </ul>

            {/* Follows the finger, positioned directly on the node rather than
                through state so a move does not re-render the strip. It stays
                mounted and merely hidden: rendering it only once a drag starts
                would mean no node existed to position at that moment, and it
                would flash in the top-left corner until the first move. */}
            <div
                ref={ghostRef}
                aria-hidden
                className={`pointer-events-none fixed left-0 top-0 z-50 h-16 w-12 overflow-hidden rounded-lg shadow-lg ring-2 ring-primary ${
                    dragged ? "" : "invisible"
                }`}
            >
                {dragged && (
                    /* eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimized by next/image */
                    <img
                        src={dragged.thumbUrl}
                        alt=""
                        draggable={false}
                        className="size-full object-cover"
                    />
                )}
            </div>
        </footer>
    );
}
