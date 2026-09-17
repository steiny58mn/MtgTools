import { motion } from "motion/react";
import { 
    LayoutGrid, 
    RefreshCw, 
    MessageSquare, 
    FilePlus, 
    FileDiff, 
    Terminal, 
    Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

const tools = [
    { 
        to: "/deckupdates", 
        label: "Deck Updates", 
        icon: RefreshCw, 
        desc: "Generate BBCode for deck update announcements." 
    },
    { 
        to: "/setreview", 
        label: "Set Review", 
        icon: Search, 
        desc: "Format and organize your magic set reviews." 
    },
    { 
        to: "/gamesummary", 
        label: "Game Summary", 
        icon: MessageSquare, 
        desc: "Create consolidated summaries for your games." 
    },
    { 
        to: "/createdecklist", 
        label: "Create Decklist", 
        icon: FilePlus, 
        desc: "Convert MTGO .dek files to plain text decklists." 
    },
    { 
        to: "/comparefiles", 
        label: "Compare Files", 
        icon: FileDiff, 
        desc: "Find differences between two deck files." 
    },
    { 
        to: "/parsemtgolog", 
        label: "Parse Logs", 
        icon: Terminal, 
        desc: "Convert MTGO .dat logs into readable text." 
    },
    { 
        to: "/createdeckpicklist", 
        label: "Create Picklist", 
        icon: LayoutGrid, 
        desc: "Generate picklists from MTGO deck files." 
    },
];

export default function Home() {
    return (
        <div className="space-y-12">
            <header className="text-center space-y-4">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-6xl font-black tracking-tight"
                >
                    MTG <span className="text-purple-500">Tools</span>
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-slate-400 text-lg max-w-2xl mx-auto"
                >
                    A collection of utility tools for the MTGNexus community. 
                    Streamline your workflow, format your posts, and analyze your games.
                </motion.p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool, index) => (
                    <motion.div
                        key={tool.to}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Link 
                            to={tool.to}
                            className={cn(
                                "group block p-6 rounded-2xl glass hover:bg-purple-500/5 transition-all duration-300 no-underline text-left h-full border border-purple-500/10 hover:border-purple-500/40"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <tool.icon className="text-purple-400" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-purple-400 transition-colors">
                                {tool.label}
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                {tool.desc}
                            </p>
                        </Link>
                    </motion.div>
                ))}
            </div>
            
            <footer className="pt-12 text-center">
                <p className="text-slate-500 text-sm font-mono uppercase tracking-widest">
                    Built for MTGNexus
                </p>
            </footer>
        </div>
    )
}