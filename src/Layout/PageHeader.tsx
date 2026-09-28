import { Link, useLocation } from "react-router-dom";
import appLogo from '../assets/app-logo.png';
import mtgNexusLogo from '../assets/mtgnexus.jpeg';
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../lib/utils";

const navLinks = [
    { to: "/setreview",  label: "Set Review" },
    { to: "/gamesummary", label: "Game Summary" },
    { to: "/parsemtgolog", label: "Parse Logs" },
];

function PageHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const isSetReview = location.pathname.toLowerCase().includes('setreview');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close menu when location changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
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
                {/* Logo Section */}
                <Link to="/" className="flex items-center no-underline z-50 group" title="MTG Tools" aria-label="MTG Tools">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 6 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className="relative"
                    >
                        <img
                            src={appLogo}
                            className="h-10 w-10 rounded-full object-cover shadow-lg border border-purple-500/40 group-hover:border-purple-400 group-hover:shadow-purple-500/30 transition-all duration-300"
                            alt="MTG Tools"
                        />
                    </motion.div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 no-underline",
                                    isActive
                                        ? "text-purple-300 bg-purple-500/10 shadow-sm border border-purple-500/20"
                                        : "text-slate-300 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* External Links */}
                <div className="hidden lg:flex items-center">
                    <motion.a
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        href="https://www.mtgnexus.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-full hover:bg-white/10 transition-colors no-underline block"
                        title="MTGNexus"
                        aria-label="MTGNexus"
                    >
                        <img
                            src={mtgNexusLogo}
                            alt="MTGNexus"
                            className="h-8 w-8 rounded-full object-cover border border-purple-500/30 hover:border-purple-400/60 shadow-md transition-all"
                        />
                    </motion.a>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-colors z-50"
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden fixed inset-x-4 top-20 glass rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col gap-3 z-40 bg-slate-900/90 backdrop-blur-xl"
                    >
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.to;
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={cn(
                                        "px-4 py-3 rounded-2xl text-base font-medium transition-all no-underline flex items-center justify-between",
                                        isActive
                                            ? "text-purple-300 bg-purple-500/20 font-semibold"
                                            : "text-slate-200 hover:bg-white/5"
                                    )}
                                >
                                    <span>{link.label}</span>
                                    {isActive && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                                </Link>
                            );
                        })}
                        <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between px-2">
                            <a
                                href="https://www.mtgnexus.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors no-underline"
                            >
                                <img src={mtgNexusLogo} alt="MtgNexus" className="h-5 w-5 rounded-full" />
                                <span>MtgNexus</span>
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}

export default PageHeader;
