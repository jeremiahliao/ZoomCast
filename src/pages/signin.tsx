import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SignIn() {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async () => {
        await signIn();
        navigate('/');
    };

    return (
        <>
            <h1>ZoomCast</h1>
            <h4>Turn your Zoom recordings into Youtube videos in minutes</h4>
            <button onClick={handleSignIn} style={styles.button}>
                <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt=""
                    style={styles.icon}
                />
                Sign in with Google
            </button>
            <p>You'll be asked to grant permission to upload videos to your YouTube channel</p>
            
        </>
    );
}

const styles: Record<string, React.CSSProperties> = {
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 20px',
        marginTop: '1.5rem',
        border: '1px solid #dadce0',
        borderRadius: '4px',
        background: '#fff',
        color: '#3c4043',
        fontSize: '15px',
        fontWeight: 500,
        cursor: 'pointer',
    },
    icon: {
        width: '18px',
        height: '18px',
    },
};