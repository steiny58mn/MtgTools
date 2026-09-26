import { Link, useLocation } from "react-router-dom";
import manaSymbols from '../assets/manasymbols.png'
import mtgNexusLogo from '../assets/mtgnexus.jpeg'
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../lib/utils";
const navLinks = [
    { to: "/deckupdates", label: "Deck Updates" },
    { to: "/gamesummary", label: "Game Summary" },
    { to: "/setreview", label: "Set Review" },
    { to: "/createdecklist", label: "Create Decklist" },
    { to: "/comparefiles", label: "Compare Files" },
    { to: "/parsemtgolog", label: "Parse Logs" },
    { to: "/createdeckpicklist", label: "Create Picklist" },
];

function PageHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const isSetReview = location.pathname.toLowerCase().includes('setreview') || location.pathname.toLowerCase().includes('commander');

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
                isSetReview ? "w-full max-w-[98%] 2xl:max-w-[1920px]" : "max-w-7xl",
                scrolled ? "glass shadow-xl py-2 px-6" : "bg-transparent py-2 px-6"
            )}>
                {/* Logo Section */}
                <Link to="/" className="flex items-center gap-3 no-underline z-50">
                    <motion.img
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        src={manaSymbols}
                        className="h-10 w-10 object-contain"
                        alt="Mana Symbols"
                    />
                    <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent"
                    >
                        MtgTools
                    </motion.span>
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
                <div className="hidden lg:flex items-center gap-4">
                    <a
                        href="https://www.mtgnexus.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors no-underline"
                    >
                        <img src={mtgNexusLogo} alt="MtgNexus" className="h-4 w-4 rounded-full"/>
                        <span>MtgNexus</span>
                    </a>
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
