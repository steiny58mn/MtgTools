import { Link, useLocation } from "react-router-dom";
import appLogo from '../assets/app-logo.png';
import mtgNexusLogo from '../assets/mtgnexus.jpeg';
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { 
    Menu, 
    X, 
    BookOpen,
    Terminal, 
    Home, 
    ExternalLink, 
    LogIn, 
    LogOut, 
    ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../Utilities/AuthService";
import AuthModal from "../Components/AuthModal";

const navLinks = [
    { to: "/setreview", label: "Set Review", icon: BookOpen },
    { to: "/parsemtgolog", label: "Parse Logs", icon: Terminal },
];

function PageHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    const userMenuRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const isSetReview = location.pathname.toLowerCase().includes('setreview');

    const { user, isLoggedIn, logout } = useAuth();

    const isLinkActive = (to: string) => {
        return location.pathname.toLowerCase().startsWith(to.toLowerCase());
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close menu when location changes
    useEffect(() => {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
    }, [location.pathname]);

    // Close user dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close menu on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsMenuOpen(false);
                setIsUserMenuOpen(false);
            }
        };

        if (isMenuOpen || isUserMenuOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMenuOpen, isUserMenuOpen]);

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isMenuOpen]);

    return (
        <>
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    scrolled ? "py-2 px-4" : "py-4 px-4"
                )}
            >
                <div className={cn(
                    "mx-auto rounded-2xl transition-all duration-300 flex items-center justify-between",
                    isSetReview ? "w-full max-w-[98%] 2xl:max-w-[1920px] " : "max-w-7xl",
                    scrolled ? "glass shadow-xl py-2 px-6" : "bg-transparent py-2 px-6"
                )}>
                    {/* Logo & Brand Section */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 no-underline z-50 group"
                        title="MTG Tools"
                        aria-label="MTG Tools Home"
                    >
                        <motion.div
                            whileHover={{ scale: 1.08, rotate: 4 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className="relative shrink-0"
                        >
                            <img
                                src={appLogo}
                                className="h-10 w-10 rounded-full object-cover shadow-lg border border-purple-500/40 group-hover:border-purple-400 group-hover:shadow-purple-500/30 transition-all duration-300"
                                alt="MTG Tools"
                            />
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-purple-300 transition-colors leading-none">
                                MTG <span className="text-purple-400">Tools</span>
                            </span>
                            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors pt-0.5">
                                For MTGNexus
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1.5 relative" aria-label="Main Navigation">
                        {navLinks.map((link) => {
                            const isActive = isLinkActive(link.to);
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 no-underline flex items-center gap-2",
                                        isActive
                                            ? "text-purple-200 font-semibold"
                                            : "text-slate-300 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavPill"
                                            className="absolute inset-0 rounded-xl bg-purple-500/15 border border-purple-500/30 shadow-sm"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <Icon size={16} className={cn("relative z-10", isActive ? "text-purple-400" : "text-slate-400")} />
                                    <span className="relative z-10">{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Action Group: MTGNexus & User Auth */}
                    <div className="hidden lg:flex items-center gap-3">
                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            href="https://www.mtgnexus.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all text-xs text-slate-300 hover:text-white no-underline shadow-sm"
                            title="MTGNexus"
                            aria-label="Visit MTGNexus (opens in a new tab)"
                        >
                            <img
                                src={mtgNexusLogo}
                                alt="MTGNexus"
                                className="h-6 w-6 rounded-full object-cover border border-purple-500/30 group-hover:border-purple-400/60 shadow-sm transition-all"
                            />
                            <span className="font-medium text-slate-300 group-hover:text-purple-300 transition-colors">MTGNexus</span>
                            <ExternalLink size={12} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
                        </motion.a>

                        {/* User Authentication Menu / Button */}
                        {isLoggedIn && user ? (
                            <div className="relative" ref={userMenuRef}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    type="button"
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/40 text-xs font-semibold text-purple-200 transition-all shadow-sm cursor-pointer"
                                    aria-expanded={isUserMenuOpen}
                                    aria-haspopup="true"
                                >
                                    <div className="w-6 h-6 rounded-full bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-[11px] font-black uppercase text-purple-200">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="max-w-[110px] truncate">{user.username}</span>
                                    <ChevronDown size={13} className={cn("text-purple-400 transition-transform duration-200", isUserMenuOpen && "rotate-180")} />
                                </motion.button>

                                {/* User Dropdown */}
                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-purple-500/30 shadow-2xl backdrop-blur-xl p-2 z-50 divide-y divide-purple-500/10"
                                        >
                                            <div className="px-3 py-2">
                                                <p className="text-[10px] font-mono uppercase text-slate-400">Signed in as</p>
                                                <p className="text-xs font-bold text-white truncate">@{user.username}</p>
                                                {user.email && (
                                                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                                )}
                                            </div>
                                            <div className="pt-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        logout();
                                                        setIsUserMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors text-left cursor-pointer"
                                                >
                                                    <LogOut size={14} />
                                                    <span>Sign Out</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => setIsAuthModalOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-white transition-all text-xs font-semibold shadow-sm cursor-pointer"
                                aria-label="Sign in"
                            >
                                <LogIn size={13} className="text-purple-400" />
                                <span>Sign In</span>
                            </motion.button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-colors z-50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-nav-drawer"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Drawer & Overlay */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                                aria-hidden="true"
                            />

                            {/* Drawer */}
                            <motion.div
                                id="mobile-nav-drawer"
                                initial={{ opacity: 0, y: -20, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="md:hidden fixed inset-x-4 top-20 glass rounded-3xl p-5 shadow-2xl border border-white/10 flex flex-col gap-2 z-50 bg-slate-900/95 backdrop-blur-2xl"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Navigation Menu"
                            >
                                {/* Mobile User Section */}
                                {isLoggedIn && user ? (
                                    <div className="flex items-center justify-between p-3 mb-2 rounded-2xl bg-purple-950/40 border border-purple-500/20">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-xs font-black uppercase text-purple-200 shrink-0">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">@{user.username}</p>
                                                {user.email && (
                                                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                logout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="px-2.5 py-1 text-xs text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors shrink-0 flex items-center gap-1"
                                        >
                                            <LogOut size={12} />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsAuthModalOpen(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 p-3 mb-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                                    >
                                        <LogIn size={16} />
                                        <span>Sign In / Register</span>
                                    </button>
                                )}

                                {/* Home Link for Mobile */}
                                <Link
                                    to="/"
                                    aria-current={location.pathname === "/" ? "page" : undefined}
                                    className={cn(
                                        "px-4 py-3 rounded-2xl text-base font-medium transition-all no-underline flex items-center justify-between",
                                        location.pathname === "/"
                                            ? "text-purple-300 bg-purple-500/20 font-semibold border border-purple-500/30"
                                            : "text-slate-200 hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Home size={18} className={location.pathname === "/" ? "text-purple-300" : "text-slate-400"} />
                                        <span>Home</span>
                                    </div>
                                    {location.pathname === "/" && <div className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />}
                                </Link>

                                {navLinks.map((link) => {
                                    const isActive = isLinkActive(link.to);
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            aria-current={isActive ? "page" : undefined}
                                            className={cn(
                                                "px-4 py-3 rounded-2xl text-base font-medium transition-all no-underline flex items-center justify-between",
                                                isActive
                                                    ? "text-purple-300 bg-purple-500/20 font-semibold border border-purple-500/30"
                                                    : "text-slate-200 hover:bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon size={18} className={isActive ? "text-purple-300" : "text-slate-400"} />
                                                <span>{link.label}</span>
                                            </div>
                                            {isActive && <div className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />}
                                        </Link>
                                    );
                                })}

                                <div className="pt-3 mt-1 border-t border-white/10 flex items-center justify-between px-2">
                                    <a
                                        href="https://www.mtgnexus.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors no-underline group"
                                        title="MTGNexus"
                                    >
                                        <img src={mtgNexusLogo} alt="MTGNexus" className="h-5 w-5 rounded-full object-cover" />
                                        <span className="group-hover:text-purple-300 transition-colors">MTGNexus</span>
                                        <ExternalLink size={12} className="text-slate-500 group-hover:text-purple-400" />
                                    </a>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.header>

            {/* Global Auth Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </>
    );
}

export default PageHeader;
