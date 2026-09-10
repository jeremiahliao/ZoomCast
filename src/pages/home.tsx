import { useAuth } from "../context/AuthContext"

export function Home() {
    const { user, signOut } = useAuth();

    return (
        <>
            <h1>ZoomCast</h1>
            <h2>Welcome {user.name}!</h2>
            <button onClick={signOut}>Sign Out</button>
        </>
    )
}
