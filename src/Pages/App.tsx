import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Home from './Home';
import PageHeader from "../Layout/PageHeader";
import SetReview from './SetReview';
import GameSummary from './GameSummary';
import ParseMtgoLogs from "./ParseMtgoLogs";

export default function App() {
    const location = useLocation();
    const isSetReview = location.pathname.toLowerCase().includes('setreview');

    return (
        <div className="min-h-screen dark bg-slate-950 text-slate-200 selection:bg-purple-500/30">
            <PageHeader />
            <main className={`mx-auto pt-32 pb-12 transition-all duration-300 ${
                isSetReview 
                    ? 'w-full max-w-[98%] 2xl:max-w-[1920px] px-2 sm:px-4 lg:px-6' 
                    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
            }`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <Routes location={location}>
                            <Route path="/" element={<Home />} />
                            <Route path="/setreview" element={<SetReview />} />
                            <Route path="/gamesummary" element={<GameSummary />} />
                            <Route path="/parsemtgolog" element={<ParseMtgoLogs />} />
                        </Routes>
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
