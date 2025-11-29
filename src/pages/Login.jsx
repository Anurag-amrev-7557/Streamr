import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Eye, EyeOff, Loader2, Zap, Shield, Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import Logo from '../components/Logo';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);

    const { login, error } = useAuthStore();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await login({ email, password });

        if (result.success) {
            navigate('/');
        }

        setIsLoading(false);
    };

    const handleGoogleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://streamrbackend.vercel.app/api';
        window.location.href = `${apiUrl}/auth/google`;
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] lg:grid lg:grid-cols-2 overflow-hidden">
            {/* Left Side - Form */}
            <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-24 xl:px-32 min-h-screen lg:min-h-0 lg:h-full z-10">
                {/* Mobile Background Gradients (Only visible on small screens) */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 lg:hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[50%] bg-purple-900/30 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[50%] bg-red-900/30 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 w-full max-w-md mx-auto lg:mx-0">
                    <div className="mb-12">
                        <Link to="/" className="flex items-center gap-2 mb-8">
                            <ArrowLeft className="w-5 h-5" />
                            <Logo />
                        </Link>
                        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Welcome back</h1>
                        <p className="text-gray-400 text-lg">Please enter your details to sign in.</p>
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

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-300 ml-3 uppercase tracking-wider">Email</label>
                            <div className={`relative group transition-all duration-300 ${focusedInput === 'email' ? 'scale-[1.01]' : ''}`}>
                                <input
                                    type="email"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-[#202020] transition-all"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-[#202020] transition-all pr-12"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    required
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

                        <div className="flex items-center justify-between text-sm mt-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-[#1a1a1a] checked:bg-red-600 focus:ring-0 focus:ring-offset-0 transition-all" />
                                <span className="text-gray-400 group-hover:text-white transition-colors">Remember me</span>
                            </label>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-white text-black py-4 rounded-full font-bold mt-4 hover:bg-gray-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5 group"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                        <span>Sign in with Google</span>
                    </button>

                    <p className="mt-8 text-center text-gray-400 text-sm">
                        Don't have an account?
                        <Link to="/signup" className="text-white hover:text-red-500 font-semibold ml-1 transition-colors">
                            Sign up for free
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Visuals (Desktop Only) */}
            <div className="hidden lg:block relative h-full w-full overflow-hidden bg-[#050505]">
                {/* Gradients */}
                <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-900/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-red-900/20 rounded-full blur-[150px]" />
                <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl max-w-md shadow-2xl"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Experience the Future of Streaming</h2>
                        <p className="text-gray-400 leading-relaxed mb-6">
                            Join millions of users who are already enjoying unlimited movies, TV shows, and exclusive originals in 4K HDR.
                        </p>

                        <div className="flex items-center justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Rated 4.9/5 by our users</p>
                    </motion.div>

                    {/* Floating Elements */}
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 right-1/4 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-3 shadow-xl"
                    >
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-bold">Secure Login</p>
                            <p className="text-gray-400 text-xs">End-to-end encrypted</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Login;
