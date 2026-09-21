const slides = [0, 1, 2, 3];

export default function PhotoCarousel() {
    return (
        <section aria-label="Photos" className="flex min-h-0 flex-1 flex-col">
            <ul className="flex min-h-0 flex-1 snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain px-4 scroll-px-4 [scrollbar-width:none]">
                {slides.map((slide) => (
                    <li
                        key={slide}
                        className="w-full shrink-0 snap-start bg-surface"
                    />
                ))}
            </ul>
            <div className="flex shrink-0 justify-center gap-1.5 pt-[18px]">
                {slides.map((slide) => (
                    <span
                        key={slide}
                        className={`size-1.5 rounded-full ${
                            slide === 0 ? "bg-neutral-500" : "bg-surface-strong"
                        }`}
                    />
                ))}
            </div>
        </section>
    );
}
