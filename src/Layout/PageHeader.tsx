import { Link, useLocation } from "react-router-dom";
import appLogo from '../assets/app-logo.png';
import mtgNexusLogo from '../assets/mtgnexus.jpeg';
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Menu, X, BookOpen, MessageSquare, Terminal, Home, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";

const navLinks = [
    { to: "/setreview", label: "Set Review", icon: BookOpen },
    { to: "/gamesummary", label: "Game Summary", icon: MessageSquare },
    { to: "/parsemtgolog", label: "Parse Logs", icon: Terminal },
];

function PageHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const isSetReview = location.pathname.toLowerCase().includes('setreview');

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
    }, [location.pathname]);

    // Close menu on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMenuOpen]);

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

                {/* External Links */}
                <div className="hidden lg:flex items-center">
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
    );
}

export default PageHeader;
