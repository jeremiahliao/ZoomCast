import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

export function NavBar() {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-5 backdrop-blur-md">
            {/* Brand: icon + name */}
            <button
                onClick={() => navigate('/')}
                aria-label="Go to home"
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border-0 bg-transparent px-2 py-1 text-base font-semibold tracking-tight text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)] motion-reduce:duration-0"
            >
                <span>ZoomCast</span>
            </button>

            {/* Settings icon */}
            <button
                onClick={() => navigate('/settings')}
                aria-label="Go to settings"
                className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border-0 bg-transparent p-1.5 text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] motion-reduce:duration-0"
            >
                <Settings
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="h-5 w-5"
                />
            </button>
        </nav>
    );
}
