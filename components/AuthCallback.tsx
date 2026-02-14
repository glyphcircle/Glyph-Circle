import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log('🔐 [Auth] Processing email confirmation...');

                // Get the hash from URL (contains the access token)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                if (type === 'signup' && accessToken) {
                    console.log('✅ [Auth] Email confirmed successfully');

                    // Set the session
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || ''
                    });

                    if (error) {
                        console.error('❌ [Auth] Session error:', error);
                        navigate('/login?error=auth_failed');
                        return;
                    }

                    console.log('✅ [Auth] User logged in:', data.user?.email);

                    // Redirect to home
                    setTimeout(() => {
                        navigate('/home');
                    }, 1500);
                } else {
                    console.warn('⚠️ [Auth] Invalid callback');
                    navigate('/login');
                }
            } catch (err) {
                console.error('❌ [Auth] Callback error:', err);
                navigate('/login?error=auth_failed');
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div className={`min-h-screen flex items-center justify-center ${isLight ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50' : 'bg-black'
            }`}>
            <div className="text-center">
                <div className="inline-block w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className={`text-2xl font-cinzel font-bold ${isLight ? 'text-amber-900' : 'text-amber-500'
                    }`}>
                    Verifying Your Soul's Connection...
                </h2>
                <p className={`mt-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    The cosmic gateway is opening
                </p>
            </div>
        </div>
    );
};

export default AuthCallback;
