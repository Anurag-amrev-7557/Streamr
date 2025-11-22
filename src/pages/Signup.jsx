import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const { signup, error } = useAuthStore();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await signup(formData);

        if (result.success) {
            navigate('/');
        }

        setIsLoading(false);
    };

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`;
    };

    return (
        <div className="relative min-h-screen w-full bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg')] bg-no-repeat bg-center bg-cover">
            <Link to="/" className="absolute top-4 left-4 md:top-8 md:left-8 z-50 text-white/80 hover:text-white font-medium text-sm md:text-base transition-colors flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-black/60">
                ← Back to Home
            </Link>
            <div className="bg-black/60 w-full min-h-screen flex items-center justify-center px-4">
                <div className="bg-black/80 p-8 md:p-16 rounded-xl w-full max-w-md shadow-2xl border border-white/10 backdrop-blur-sm">
                    <h1 className="text-white text-3xl font-bold mb-8">Sign Up</h1>

                    {error && (
                        <div className="bg-[#e87c03] p-4 rounded-full mb-6 text-white text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="flex flex-col gap-4">
                        <div className="relative group">
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className={`block w-full px-6 pt-6 pb-2 text-white bg-[#333] rounded-full border-b-2 border-transparent focus:bg-[#454545] outline-none transition-all peer ${formData.name ? 'filled' : ''}`}
                                value={formData.name}
                                onChange={handleChange}
                                onFocus={() => setFocusedInput('name')}
                                onBlur={() => setFocusedInput(null)}
                                required
                            />
                            <label
                                htmlFor="name"
                                className={`absolute left-6 top-4 text-gray-400 text-base transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-300 ${formData.name ? 'top-2 text-xs text-gray-300' : ''}`}
                            >
                                Full Name
                            </label>
                        </div>

                        <div className="relative group">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={`block w-full px-6 pt-6 pb-2 text-white bg-[#333] rounded-full border-b-2 border-transparent focus:bg-[#454545] outline-none transition-all peer ${formData.email ? 'filled' : ''}`}
                                value={formData.email}
                                onChange={handleChange}
                                onFocus={() => setFocusedInput('email')}
                                onBlur={() => setFocusedInput(null)}
                                required
                            />
                            <label
                                htmlFor="email"
                                className={`absolute left-6 top-4 text-gray-400 text-base transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-300 ${formData.email ? 'top-2 text-xs text-gray-300' : ''}`}
                            >
                                Email address
                            </label>
                        </div>

                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                className={`block w-full px-6 pt-6 pb-2 text-white bg-[#333] rounded-full border-b-2 border-transparent focus:bg-[#454545] outline-none transition-all peer ${formData.password ? 'filled' : ''}`}
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setFocusedInput('password')}
                                onBlur={() => setFocusedInput(null)}
                                required
                                minLength={6}
                            />
                            <label
                                htmlFor="password"
                                className={`absolute left-6 top-4 text-gray-400 text-base transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-300 ${formData.password ? 'top-2 text-xs text-gray-300' : ''}`}
                            >
                                Password (min 6 chars)
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-[#e50914] text-white py-3.5 rounded-full font-bold mt-6 hover:bg-[#c11119] transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-900/20"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-8">
                        <div className="h-[1px] bg-[#333] flex-1"></div>
                        <span className="text-[#b3b3b3] text-sm font-medium">OR</span>
                        <div className="h-[1px] bg-[#333] flex-1"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black py-3 rounded-full font-bold hover:bg-gray-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        <span>Sign up with Google</span>
                    </button>

                    <div className="mt-8 text-[#737373] text-base">
                        <p>Already have an account? <Link to="/login" className="text-white hover:underline cursor-pointer font-medium ml-1">Sign in now.</Link></p>
                        <p className="text-xs mt-4 text-[#8c8c8c]">
                            This page is protected by Google reCAPTCHA to ensure you're not a bot. <span className="text-[#0071eb] hover:underline cursor-pointer">Learn more.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
