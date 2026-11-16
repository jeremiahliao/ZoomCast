import { useAuth } from "../context/AuthContext"
import { Button } from "../components/Button"
import { PageLayout } from "../components/PageLayout"

export function Settings() {
    const { user, signOut } = useAuth();
    return (
        <PageLayout>
            <h1 className="mb-6 text-xl font-semibold">Settings</h1>
            <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Google Account
                </h2>
                <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                    <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-[var(--color-text-muted)]">{user.email}</div>
                    </div>
                    <Button onClick={signOut}>Sign Out</Button>
                </div>
            </div>
        </PageLayout>
    )
}
