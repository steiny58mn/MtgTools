import { Link, useLocation } from "react-router-dom";
import manaSymbols from '../assets/manasymbols.png'
import mtgNexusLogo from '../assets/mtgnexus.jpeg'
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Menu, X, Container} from "lucide-react";
import { cn } from "../lib/utils";
import {Nav} from "react-bootstrap";

const navLinks = [
    { to: "/deckupdates", label: "Deck Updates" },
    { to: "/setreview", label: "Set Review" },
    { to: "/gamesummary", label: "Game Summary" },
    { to: "/createdecklist", label: "Create Decklist" },
    { to: "/comparefiles", label: "Compare Files" },
    { to: "/parsemtgolog", label: "Parse Logs" },
    { to: "/createdeckpicklist", label: "Create Picklist" },
];

function PageHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

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
                "max-w-5xl mx-auto rounded-2xl transition-all duration-300 flex items-center justify-between",
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
                        title={"Home"}
                    />
                    {/*<span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent hidden sm:block">*/}
                    {/*    MTG Tools*/}
                    {/*</span>*/}
                </Link>

                {/* Desktop Navigation */}
                <Nav className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={cn(
                                "relative px-4 py-2 text-sm font-medium transition-colors duration-200 no-underline rounded-lg group",
                                location.pathname === link.to
                                    ? "text-purple-400"
                                    : "text-slate-300 hover:text-white"
                            )}
                        >
                            {link.label}
                            {location.pathname === link.to && (
                                <motion.div
                                    layoutId="activeNavUnderline"
                                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full"
                                />
                            )}
                        </Link>
                    ))}
                </Nav>

                {/* Mobile Toggle */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="lg:hidden z-50 p-2 text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors"
                    aria-label="Toggle Menu"
                >
                    <Container>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </Container>
                </button>

                <Link to="https://www.mtgnexus.com"
                      target="_blank"      
                      className="flex items-center gap-3 no-underline z-50">
                    <motion.img
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        src={mtgNexusLogo}
                        className="h-10 w-10 object-contain"
                        alt="Mana Symbols"
                        title={"MTG Nexus"}
                    />
                    {/*<span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent hidden sm:block">*/}
                    {/*    MTG Tools*/}
                    {/*</span>*/}
                </Link>

                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
                            />

                            {/* Drawer */}
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed top-0 right-0 bottom-0 w-80 glass border-l border-purple-500/20 z-40 lg:hidden p-6 pt-24 shadow-2xl"
                            >
                                <div className="flex flex-col gap-2">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            className={cn(
                                                "relative px-4 py-4 text-lg font-medium transition-all duration-200 no-underline rounded-xl flex items-center justify-between group",
                                                location.pathname === link.to
                                                    ? "text-purple-400 bg-purple-500/10"
                                                    : "text-slate-300 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {link.label}
                                            {location.pathname === link.to && (
                                                <motion.div
                                                    layoutId="activeNavIndicatorMobile"
                                                    className="w-1.5 h-1.5 bg-purple-500 rounded-full"
                                                />
                                            )}
                                        </Link>
                                    ))}
                                    
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </motion.header>
    );
}

export default PageHeader;
