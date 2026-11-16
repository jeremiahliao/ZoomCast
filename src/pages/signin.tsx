import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from "react-icons/fc";
import { useAuth } from '../context/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';

const GoogleIcon = FcGoogle as ComponentType<{ className?: string }>;

export function SignIn() {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setError(null);
        try {
            await signIn();
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
        }
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">ZoomCast</h1>
            <p className="mt-2 text-base font-normal text-[var(--color-text-muted)]">
                Turn your Zoom recordings into YouTube videos in minutes
            </p>
            <Button onClick={handleSignIn} variant="provider">
                <GoogleIcon className="h-[18px] w-[18px] shrink-0" />
                Sign in with Google
            </Button>
            {error && <ErrorMessage message={error} />}
        </main>
    );
}
