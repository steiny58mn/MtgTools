import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Home from './Home.tsx';
import PageHeader from "../Layout/PageHeader.tsx";
import DeckUpdates from '../Pages/DeckUpdates.tsx';
import SetReview from '../Pages/SetReview';
import GameSummary from '../Pages/GameSummary';
import CreateDecklist from '../Pages/CreateDecklist.tsx';
import UpdateDbFromJsonFile from "./UpdateCardsDbFromJsonFile.tsx";
import CompareFiles from "./CompareFiles.tsx";
import ParseMtgoLogs from "./ParseMtgoLogs.tsx";
import CreateDeckPicklist from "./CreateDeckPicklist.tsx";

export default function App() {
    const location = useLocation();

    return (
        <div className="min-h-screen dark bg-slate-950 text-slate-200 selection:bg-purple-500/30">
            <PageHeader />
            <main className="max-w-5xl mx-auto px-4 pt-32 pb-12">
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
                            <Route path="/deckupdates" element={<DeckUpdates />} />
                            <Route path="/setreview" element={<SetReview />} />
                            <Route path="/gamesummary" element={<GameSummary />} />
                            <Route path="/createdecklist" element={<CreateDecklist />} />
                            <Route path="/updatedb" element={<UpdateDbFromJsonFile />} />
                            <Route path="/comparefiles" element={<CompareFiles />} />
                            <Route path="/parsemtgolog" element={<ParseMtgoLogs />} />
                            <Route path="/createdeckpicklist" element={<CreateDeckPicklist />} />
                        </Routes>
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
