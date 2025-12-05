
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Eye, EyeOff, Loader2, ArrowRight, Play, Film, Tv, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import Logo from '../components/Logo';

const SAMPLE_POSTERS = [
    "https://image.tmdb.org/t/p/w500/1E5baAaEse26fej7uHcjOgEE2t2.jpg", // Fast X
    "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", // Spider-Man: Across the Spider-Verse
    "https://image.tmdb.org/t/p/w500/rKtDFPbfHfUbNkZq18M7XnWROhX.jpg", // Guardians of the Galaxy Vol. 3
    "https://image.tmdb.org/t/p/w500/pFlaoHTZeyNkG83vxsAJiGzfSsa.jpg", // Black Adam
    "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg", // Avatar: The Way of Water
    "https://image.tmdb.org/t/p/w500/uJYYizSuA9Y3DCs0qS4qWvHfZg4.jpg", // Top Gun: Maverick
    "https://image.tmdb.org/t/p/w500/wKiOkZTN9lUUUNZLmtnwubZYONg.jpg", // Minions: The Rise of Gru
    "https://image.tmdb.org/t/p/w500/xAG7S6X720W4Hkmo5D16F3F5b76.jpg", // Batman
    "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17dbH.jpg", // The Super Mario Bros. Movie
    "https://image.tmdb.org/t/p/w500/kAVRgw7GgK1CfYEJq8ME6EvRIgU.jpg", // Jurassic World Dominion
];

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const { signup, error, isCheckingAuth } = useAuthStore();
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
        const apiUrl = import.meta.env.VITE_API_URL || 'https://streamrbackend.vercel.app/api';
        window.location.href = `${apiUrl}/auth/google`;
    };

    // Prevent form flash if we're still determining if user is already logged in
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] lg:grid lg:grid-cols-2 overflow-hidden">
            {/* Left Side - Form */}
            <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-24 xl:px-32 min-h-screen lg:min-h-0 lg:h-full z-10">
                {/* Mobile Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 lg:hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] bg-purple-900/30 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[50%] bg-red-900/30 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 w-full max-w-md mx-auto lg:mx-0">
                    <div className="mb-10">
                        <Link to="/" className="flex items-center gap-2 mb-8">
                            <ArrowLeft className="w-5 h-5" />
                            <Logo />
                        </Link>
                        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Create an account</h1>
                        <p className="text-gray-400 text-lg">Start your streaming journey today.</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 text-red-200 text-sm flex items-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSignup} className="flex flex-col gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-300 ml-3 uppercase tracking-wider">Full Name</label>
                            <div className={`relative group transition-all duration-300 ${focusedInput === 'name' ? 'scale-[1.01]' : ''}`}>
                                <input
                                    type="text"
                                    name="name"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-[#202020] transition-all"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('name')}
                                    onBlur={() => setFocusedInput(null)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-300 ml-3 uppercase tracking-wider">Email</label>
                            <div className={`relative group transition-all duration-300 ${focusedInput === 'email' ? 'scale-[1.01]' : ''}`}>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-[#202020] transition-all"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('email')}
                                    onBlur={() => setFocusedInput(null)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-300 ml-3 uppercase tracking-wider">Password</label>
                            <div className={`relative group transition-all duration-300 ${focusedInput === 'password' ? 'scale-[1.01]' : ''}`}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-[#202020] transition-all pr-12"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none p-2"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-white text-black py-4 rounded-full font-bold mt-4 hover:bg-gray-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5 group"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 text-gray-300">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-[#1a1a1a] border border-white/10 text-white py-3.5 rounded-full font-semibold hover:bg-[#252525] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        <span>Sign up with Google</span>
                    </button>

                    <p className="mt-8 text-center text-gray-400 text-sm">
                        Already have an account?
                        <Link to="/login" className="text-white hover:text-red-500 font-semibold ml-1 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Visuals (Desktop Only) */}
            <div className="hidden lg:block relative h-full w-full overflow-hidden bg-[#050505]">
                {/* Marquee Container */}
                <div className="absolute inset-0 flex flex-col gap-6 opacity-40 rotate-12 scale-125 transform origin-center">
                    {/* Row 1 */}
                    <div className="flex gap-6 animate-marquee">
                        {[...SAMPLE_POSTERS, ...SAMPLE_POSTERS].map((poster, i) => (
                            <div key={`r1 - ${i} `} className="w-48 h-72 rounded-xl border border-white/10 flex-shrink-0 overflow-hidden">
                                <img src={poster} alt="Poster" className="w-full h-full object-cover opacity-80" />
                            </div>
                        ))}
                    </div>
                    {/* Row 2 (Reverse) */}
                    <div className="flex gap-6 animate-marquee-reverse">
                        {[...SAMPLE_POSTERS, ...SAMPLE_POSTERS].reverse().map((poster, i) => (
                            <div key={`r2 - ${i} `} className="w-48 h-72 rounded-xl border border-white/10 flex-shrink-0 overflow-hidden">
                                <img src={poster} alt="Poster" className="w-full h-full object-cover opacity-80" />
                            </div>
                        ))}
                    </div>
                    {/* Row 3 */}
                    <div className="flex gap-6 animate-marquee">
                        {[...SAMPLE_POSTERS, ...SAMPLE_POSTERS].map((poster, i) => (
                            <div key={`r3 - ${i} `} className="w-48 h-72 rounded-xl border border-white/10 flex-shrink-0 overflow-hidden">
                                <img src={poster} alt="Poster" className="w-full h-full object-cover opacity-80" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="relative w-full max-w-lg aspect-video bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl group"
                    >
                        {/* Fake UI Elements */}
                        <div className="absolute top-4 left-4 flex gap-2 z-20">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>

                        {/* Video Placeholder Image */}
                        <img
                            src="https://image.tmdb.org/t/p/original/ovM06PdF3M8wvKb06i4sjW3xoww.jpg"
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                                <Play className="w-8 h-8 text-white ml-1 fill-white" />
                            </div>
                        </div>
                    </motion.div>

                    <h2 className="text-4xl font-bold text-white mt-12 mb-4 tracking-tight">Watch Everywhere</h2>
                    <p className="text-gray-400 max-w-md mx-auto text-lg">
                        Stream on your phone, tablet, laptop, and TV without paying more.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
